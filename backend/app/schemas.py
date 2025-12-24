from pydantic import BaseModel
from datetime import datetime
from typing import List

class HealthSchema(BaseModel):
    status: str

class EchoSchema(BaseModel):
    message: object

class ReceivedSchema(BaseModel):
    received: object

class ConfigSchema(BaseModel):
    ENV: str
    DEBUG: bool

class ErrorSchema(BaseModel):
    error: str

class S3File(BaseModel):
    key: str  
    name: str             
    size: int              
    last_modified: datetime  

class S3FileListSchema(BaseModel):
    files: List[S3File]