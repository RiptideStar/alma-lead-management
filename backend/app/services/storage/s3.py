"""
S3StorageBackend — stub implementation.

TODO: install boto3 and implement with:
  - boto3.client('s3').put_object(Bucket=..., Key=key, Body=data, ContentType=content_type)
  - boto3.client('s3').get_object(Bucket=..., Key=key)['Body'].read()
  - boto3.client('s3').head_object(Bucket=..., Key=key) (catches ClientError for exists)
"""
from __future__ import annotations

from app.services.storage.base import StorageBackend


class S3StorageBackend(StorageBackend):
    def __init__(self, bucket: str, prefix: str = ""):
        self.bucket = bucket
        self.prefix = prefix

    def save(self, key: str, data: bytes, content_type: str) -> str:
        raise NotImplementedError("TODO: implement S3 storage via boto3")

    def open(self, key: str) -> bytes:
        raise NotImplementedError("TODO: implement S3 storage via boto3")

    def exists(self, key: str) -> bool:
        raise NotImplementedError("TODO: implement S3 storage via boto3")
