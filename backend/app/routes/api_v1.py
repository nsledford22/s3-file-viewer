from fastapi import APIRouter, HTTPException, status, UploadFile, File
from fastapi.responses import StreamingResponse
from ..schemas import EchoSchema, ReceivedSchema, ConfigSchema, S3FileListSchema, S3File
from ..config import settings
import boto3
from botocore.exceptions import ClientError
import logging
import mimetypes

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["api_v1"])


@router.post("/echo", response_model=ReceivedSchema)
def echo(payload: EchoSchema):
    return {"received": payload.model_dump()}


@router.get("/config", response_model=ConfigSchema)
def config():
    return {"ENV": settings.ENV, "DEBUG": settings.DEBUG}

@router.get(
    "/list_files",
    response_model=S3FileListSchema,
    summary="List files in an S3 bucket",
    description="Retrieves a list of objects in the specified S3 bucket and prefix, "
                "including key, filename, size, and last modified date. "
                "Folders (zero-byte objects) are excluded.",
    responses={
        200: {"model": S3FileListSchema, "description": "Successful response"},
        400: {"description": "Invalid bucket name or prefix"},
        403: {"description": "Access denied to the bucket"},
        404: {"description": "Bucket not found"},
        500: {"description": "Internal server error or S3 service issue"},
    }
)
def list_files(bucket_name: str, prefix: str = ""):
    """
    List files in the specified S3 bucket and prefix, returning key, name, size, and last modified date.

    - **bucket_name**: The name of the S3 bucket (required).
    - **prefix**: Optional folder/path prefix to filter objects (e.g., "documents/").
    """
    if not bucket_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bucket name is required"
        )

    s3_client = boto3.client('s3')

    try:
        paginator = s3_client.get_paginator('list_objects_v2')
        page_iterator = paginator.paginate(Bucket=bucket_name, Prefix=prefix)

        files = []
        for page in page_iterator:
            if 'Contents' in page:
                for obj in page['Contents']:
                    key = obj['Key']

                    # Skip folder placeholders (keys ending with '/' or size 0)
                    if key.endswith('/') or obj['Size'] == 0:
                        continue

                    name = key.split('/')[-1]

                    files.append(
                        S3File(
                            key=key,
                            name=name,
                            size=obj['Size'],
                            last_modified=obj['LastModified']
                        )
                    )

        return {"files": files}

    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_message = e.response['Error']['Message']

        if error_code == 'NoSuchBucket':
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Bucket '{bucket_name}' not found"
            )
        elif error_code == 'AccessDenied':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to the bucket. Check IAM permissions."
            )
        elif error_code == 'InvalidBucketName':
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid bucket name: {error_message}"
            )
        else:
            logger.error(f"S3 error listing files: {error_code} - {error_message}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"S3 error: {error_code} - {error_message}"
            )

    except Exception as e:
        logger.exception("Unexpected error listing S3 files")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while listing files"
        )

@router.get("/view_file/{file_key:path}")
def view_file(file_key: str, bucket_name: str = "s3-file-viewer-files"):
    s3_client = boto3.client('s3')

    try:
        response = s3_client.get_object(Bucket=bucket_name, Key=file_key)
        stream = response['Body']
        content_type = response.get('ContentType', 'application/octet-stream')
        filename = file_key.split('/')[-1]

        return StreamingResponse(
            stream.iter_chunks(),
            media_type=content_type,
            headers={
                "Content-Disposition": f"inline; filename=\"{filename}\""
            }
        )
    except ClientError as e:
        if e.response['Error']['Code'] == 'NoSuchKey':
            raise HTTPException(status_code=404, detail="File not found")
        raise HTTPException(status_code=500, detail="Error retrieving file")
    
@router.post("/upload_file/")
async def upload_file(
    file: UploadFile = File(...),
    bucket_name: str = "s3-file-viewer-files"
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    filename = file.filename
    if ".." in filename or filename.startswith("/"):
        raise HTTPException(status_code=400, detail="Invalid filename")

    # Read contents for size check
    contents = await file.read()
    if len(contents) > 50 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 50MB)")
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Empty file not allowed")

    # Guess MIME type from filename
    content_type, _ = mimetypes.guess_type(filename)
    if content_type is None:
        content_type = 'application/octet-stream'  # fallback

    # Reset pointer after reading
    await file.seek(0)

    s3_client = boto3.client('s3')

    try:
        s3_client.upload_fileobj(
            Fileobj=file.file,
            Bucket=bucket_name,
            Key=f"files/{filename}",
            ExtraArgs={
                'ContentType': content_type
            }
        )
        return {
            "message": "File uploaded successfully",
            "filename": filename,
            "content_type": content_type
        }
    except ClientError as e:
        logger.error(f"S3 upload failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload to S3")