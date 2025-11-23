from __future__ import annotations

import os
from pathlib import Path
from typing import Any
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status
from supabase._async.client import AsyncClient


class StorageService:
    def __init__(self, supabase: AsyncClient, bucket_name: str | None = None):
        self.supabase = supabase
        self.bucket_name = bucket_name or os.getenv("BUSINESS_ASSETS_BUCKET", "business-assets")

    async def upload_business_asset(
        self, *, owner_id: str, asset_type: str, file: UploadFile
    ) -> str:
        file_bytes = await file.read()
        if not file_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty",
            )

        extension = Path(file.filename or "").suffix
        object_key = f"{owner_id}/{asset_type}/{uuid4().hex}{extension}"

        storage_client = self.supabase.storage.from_(self.bucket_name)
        options: dict[str, Any] = {
            "content_type": file.content_type or "application/octet-stream",
            "upsert": True,
        }

        try:
            await storage_client.upload(object_key, file_bytes, options)  # type: ignore[arg-type]
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to upload asset",
            ) from exc

        public_url_result = storage_client.get_public_url(object_key)
        url = _extract_public_url(public_url_result)
        if not url:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Unable to generate public URL",
            )
        return url


def _extract_public_url(result: Any) -> str | None:
    if isinstance(result, str):
        return result

    if isinstance(result, dict):
        if "public_url" in result:
            return result["public_url"]
        if "publicUrl" in result:
            return result["publicUrl"]
        data = result.get("data")
        if isinstance(data, dict):
            return data.get("publicUrl") or data.get("public_url")

    return None
