import boto3
from botocore.exceptions import ClientError
from fastapi import HTTPException

s3_client = boto3.client('s3')
BUCKET_NAME = 's3-file-viewer-files'

def list_s3_objects(prefix: str = ''):
    try:
        response = s3_client.list_objects_v2(Bucket=BUCKET_NAME, Prefix=prefix)
        return [
            {'key': obj['Key'], 'size': obj['Size'], 'last_modified': obj['LastModified']}
            for obj in response.get('Contents', [])
        ]
    except ClientError as e:
        raise HTTPException(status_code=500, detail=str(e))
