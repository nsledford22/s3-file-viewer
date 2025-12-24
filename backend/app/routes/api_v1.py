from fastapi import APIRouter, HTTPException, status, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from ..schemas import EchoSchema, ReceivedSchema, ConfigSchema, S3FileListSchema, S3File, S3Folder
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
    summary="List files and folders in an S3 bucket",
    description="Retrieves files and subfolders under the specified prefix in an S3 bucket. "
                "Uses Delimiter='/' to properly detect folders via CommonPrefixes.",
    responses={
        200: {"model": S3FileListSchema, "description": "Successful response with files and folders"},
        400: {"description": "Invalid bucket name or prefix"},
        403: {"description": "Access denied"},
        404: {"description": "Bucket not found"},
        500: {"description": "Internal server error"},
    }
)
def list_files(
    bucket_name: str = Query(..., description="The name of the S3 bucket"),
    prefix: str = Query("", description="Optional prefix (folder path) to list contents of, e.g., 'files/reports/'")
):
    """
    List files and folders in the specified S3 bucket and prefix.

    - Returns actual files (non-zero size, not ending in '/')
    - Returns folders via CommonPrefixes (virtual directories)
    """
    if not bucket_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bucket name is required"
        )

    s3_client = boto3.client('s3')

    try:
        paginator = s3_client.get_paginator('list_objects_v2')
        # Important: Delimiter='/' enables folder detection
        page_iterator = paginator.paginate(
            Bucket=bucket_name,
            Prefix=prefix,
            Delimiter='/'
        )

        files = []
        folders = []

        for page in page_iterator:
            # Collect folders from CommonPrefixes
            if 'CommonPrefixes' in page:
                for cp in page['CommonPrefixes']:
                    folder_key = cp['Prefix']
                    # Extract folder name (last part before '/')
                    folder_name = folder_key.rstrip('/').split('/')[-1]
                    if folder_name:  # Avoid empty names
                        folders.append(S3Folder(key=folder_key, name=folder_name))

            # Collect actual files from Contents
            if 'Contents' in page:
                for obj in page['Contents']:
                    key = obj['Key']

                    # Skip folder placeholders and zero-byte objects
                    if key.endswith('/') or obj['Size'] == 0:
                        continue

                    name = key.split('/')[-1]

                    files.append(
                        S3File(
                            key=key,
                            name=name,
                            size=obj['Size'],
                            last_modified=obj['LastModified'].isoformat()
                        )
                    )

        return {
            "files": files,
            "folders": sorted(folders, key=lambda f: f.name.lower()),  # Sort folders alphabetically
            "current_prefix": prefix or None
        }

    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_message = e.response['Error']['Message']

        if error_code == 'NoSuchBucket':
            raise HTTPException(status_code=404, detail=f"Bucket '{bucket_name}' not found")
        elif error_code == 'AccessDenied':
            raise HTTPException(status_code=403, detail="Access denied to the bucket")
        elif error_code == 'InvalidBucketName':
            raise HTTPException(status_code=400, detail=f"Invalid bucket name: {error_message}")
        else:
            logger.error(f"S3 error listing files: {error_code} - {error_message}")
            raise HTTPException(status_code=500, detail=f"S3 error: {error_code}")

    except Exception as e:
        logger.exception("Unexpected error listing S3 files/folders")
        raise HTTPException(status_code=500, detail="An unexpected error occurred")

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
    key: str | None = Query(                   # ← Custom S3 key (path + filename)
        None,
        description="Full S3 key (e.g., 'reports/2025/Q4/report.pdf'). If not provided, uses filename only.",
        example="invoices/january/invoice_001.pdf"
    ),
    bucket_name: str = "s3-file-viewer-files"
):
    # Validate uploaded file has a filename
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided in upload")

    original_filename = file.filename

    # Security: prevent directory traversal in original filename
    if ".." in original_filename or original_filename.startswith("/"):
        raise HTTPException(status_code=400, detail="Invalid characters in uploaded filename")

    # Determine final S3 key
    if key:
        # Clean user-provided key: remove leading/trailing slashes, prevent traversal
        clean_key = key.strip("/")
        if ".." in clean_key or "/" in clean_key and clean_key.startswith("/"):
            raise HTTPException(status_code=400, detail="Invalid key: directory traversal not allowed")
        s3_key = clean_key if clean_key.endswith(original_filename) else f"{clean_key}/{original_filename}"
    else:
        s3_key = original_filename  # Fallback: just the filename

    # Enforce prefix (optional but recommended for organization)
    if not s3_key.startswith("files/"):
        s3_key = f"files/{s3_key}"

    # Read file for size validation
    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Empty file not allowed")
    if len(contents) > 50 * 1024 * 1024:  # 50 MB
        raise HTTPException(status_code=413, detail="File too large (max 50MB)")

    # Guess Content-Type from final key (more accurate than original filename)
    content_type, _ = mimetypes.guess_type(s3_key)
    if content_type is None:
        content_type = 'application/octet-stream'

    # Reset file pointer for upload
    await file.seek(0)

    s3_client = boto3.client('s3')

    try:
        s3_client.upload_fileobj(
            Fileobj=file.file,
            Bucket=bucket_name,
            Key=s3_key,
            ExtraArgs={
                'ContentType': content_type
            }
        )

        return {
            "message": "File uploaded successfully",
            "key": s3_key,
            "filename": original_filename,
            "size_bytes": len(contents),
            "content_type": content_type
        }

    except ClientError as e:
        error_code = e.response['Error'].get('Code', 'Unknown')
        logger.error(f"S3 upload failed for key '{s3_key}': {error_code} - {e}")
        raise HTTPException(status_code=500, detail="Failed to upload file to S3")
    except Exception as e:
        logger.error(f"Unexpected error during upload of '{original_filename}': {e}")
        raise HTTPException(status_code=500, detail="Internal server error")