from __future__ import annotations

import os
from typing import Any
from uuid import uuid4

from fastapi import UploadFile
from gotrue.types import User

from src.models.model import (
    Business,
    BusinessAssetType,
    BusinessCreatePayload,
    BusinessUpdatePayload,
)
from src.repositories.business_repository import BusinessRepository
from src.services.errors import (
    BusinessConflictError,
    BusinessForbiddenError,
    BusinessNotFoundError,
)
from src.services.storage_service import StorageService


class BusinessService:
    FIELD_MAP = {
        "contactNumber": "contact_number",
        "logoUrl": "logo_url",
        "gcashQrUrl": "gcash_qr_url",
    }

    def __init__(
        self,
        repository: BusinessRepository,
        storage_service: StorageService,
    ):
        self.repository = repository
        self.storage_service = storage_service

    async def get_business_for_user(self, user: User) -> Business:
        record = await self.repository.fetch_business_for_user(user.id)
        if not record:
            raise BusinessNotFoundError("Business not found")
        return self._map_to_business(record)

    async def create_business(
        self, user: User, payload: BusinessCreatePayload
    ) -> Business:
        existing = await self.repository.fetch_business_for_user(user.id)
        if existing:
            raise BusinessConflictError("Business already exists for this admin")

        data = self._to_db_payload(payload.model_dump(exclude_none=True))
        business_id = str(uuid4())
        db_record = await self.repository.insert_business(
            {
                "id": business_id,
                "created_by": user.id,
                **data,
            }
        )
        await self.repository.add_admin(business_id, user.id, role="owner")
        return self._map_to_business(db_record)

    async def update_business(
        self, user: User, business_id: str, payload: BusinessUpdatePayload
    ) -> Business:
        membership = await self.repository.fetch_membership(business_id, user.id)
        if not membership:
            raise BusinessForbiddenError("You do not have access to this business")

        data = self._to_db_payload(payload.model_dump(exclude_none=True))
        if not data:
            record = await self.repository.fetch_business_by_id(business_id)
        else:
            record = await self.repository.update_business(business_id, data)

        if not record:
            raise BusinessNotFoundError("Business not found")

        return self._map_to_business(record)

    async def upload_asset(
        self, user: User, asset_type: BusinessAssetType, file: UploadFile
    ) -> str:
        return await self.storage_service.upload_business_asset(
            owner_id=user.id,
            asset_type=asset_type,
            file=file,
        )

    def _to_db_payload(self, payload: dict[str, Any]) -> dict[str, Any]:
        mapped: dict[str, Any] = {}
        for key, value in payload.items():
            mapped_key = self.FIELD_MAP.get(key, key)
            mapped[mapped_key] = value
        return mapped

    def _map_to_business(self, record: dict[str, Any]) -> Business:
        return Business(
            id=record["id"],
            name=record["name"],
            description=record.get("description"),
            contactNumber=record["contact_number"],
            logoUrl=record.get("logo_url"),
            gcashQrUrl=record.get("gcash_qr_url"),
            createdAt=record["created_at"],
            updatedAt=record["updated_at"],
        )
