import types
import unittest
from unittest.mock import AsyncMock, MagicMock

from src.models.model import BusinessCreatePayload, BusinessUpdatePayload
from src.repositories.business_repository import BusinessRepository
from src.services.business_service import BusinessService
from src.services.errors import (
    BusinessConflictError,
    BusinessForbiddenError,
    BusinessNotFoundError,
)
from src.services.storage_service import StorageService


def _db_business_record() -> dict:
    return {
        "id": "biz-123",
        "name": "Central Courts",
        "description": "Indoor courts",
        "logo_url": "https://example.com/logo.png",
        "contact_number": "+63 900 000 0000",
        "gcash_qr_url": "https://example.com/gcash.png",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-02T00:00:00Z",
    }


class BusinessServiceTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.repo = AsyncMock(spec=BusinessRepository)
        self.storage = AsyncMock(spec=StorageService)
        self.service = BusinessService(self.repo, self.storage)
        self.user = types.SimpleNamespace(id="user-123")

    async def test_get_business_missing_raises(self):
        self.repo.fetch_business_for_user.return_value = None

        with self.assertRaises(BusinessNotFoundError):
            await self.service.get_business_for_user(self.user)

    async def test_create_conflict_raises(self):
        self.repo.fetch_business_for_user.return_value = {"id": "existing"}

        with self.assertRaises(BusinessConflictError):
            await self.service.create_business(
                self.user,
                BusinessCreatePayload(name="Acme", contactNumber="+1"),
            )

    async def test_create_business_inserts_and_returns_payload(self):
        self.repo.fetch_business_for_user.return_value = None
        record = _db_business_record()
        self.repo.insert_business.return_value = record

        business = await self.service.create_business(
            self.user,
            BusinessCreatePayload(
                name="Central Courts",
                contactNumber="+63 900 000 0000",
                description="Indoor courts",
                logoUrl="https://example.com/logo.png",
                gcashQrUrl="https://example.com/gcash.png",
            ),
        )

        self.assertEqual(business.name, "Central Courts")
        self.assertEqual(business.contactNumber, "+63 900 000 0000")
        insert_args = self.repo.insert_business.await_args
        inserted_payload = insert_args.args[0]
        self.assertIn("contact_number", inserted_payload)
        self.repo.add_admin.assert_awaited()

    async def test_update_requires_membership(self):
        self.repo.fetch_membership.return_value = None

        with self.assertRaises(BusinessForbiddenError):
            await self.service.update_business(
                self.user, "biz-123", BusinessUpdatePayload(name="New Name")
            )

    async def test_update_returns_latest_record(self):
        self.repo.fetch_membership.return_value = {"business_id": "biz-123"}
        record = _db_business_record()
        record["name"] = "New Name"
        self.repo.update_business.return_value = record

        business = await self.service.update_business(
            self.user,
            "biz-123",
            BusinessUpdatePayload(name="New Name"),
        )

        self.assertEqual(business.name, "New Name")
        update_args = self.repo.update_business.await_args
        payload = update_args.args[1]
        self.assertIn("name", payload)

    async def test_upload_asset_delegates_to_storage(self):
        self.storage.upload_business_asset.return_value = "https://cdn/logo.png"
        fake_file = MagicMock()

        url = await self.service.upload_asset(self.user, "logo", fake_file)

        self.assertEqual(url, "https://cdn/logo.png")
        self.storage.upload_business_asset.assert_awaited()
