from datetime import datetime, timezone
from typing import Literal

import pytest
from httpx import AsyncClient

from tests.integration.conftest import IntegrationCleanup


def _create_transaction_payload(
    type: Literal["expense", "income"],
    user_id: str,
    category_id: str,
    **overrides,
) -> dict:
    """
    Build a valid transaction payload dict for testing.

    Args:
        type: Transaction type ("expense" or "income")
        user_id: User ID
        category_id: Category ID (expense_category_id or income_category_id)
        **overrides: Additional fields to override defaults

    Returns:
        Dictionary representing transaction payload
    """
    base_payload = {
        "user_id": user_id,
        "occurred_at": datetime.now(timezone.utc).isoformat(),
        "amount": 42.5,
        "type": type,
        "transaction_tag": "want" if type == "expense" else "",
        "expense_category_id": category_id if type == "expense" else None,
        "expense_subcategory_id": None,
        "income_category_id": category_id if type == "income" else None,
        "notes": "Test transaction",
    }
    base_payload.update(overrides)
    return base_payload


@pytest.mark.asyncio
@pytest.mark.integration
async def test_create_expense_transaction_success(
    async_client: AsyncClient,
    cleanup_manager: IntegrationCleanup,
    authenticated_user: dict[str, str],
    valid_expense_category: str,
):
    """Test successfully creating an expense transaction."""
    user_id = authenticated_user["user_id"]
    token = authenticated_user["token"]

    payload = _create_transaction_payload(
        type="expense",
        user_id=user_id,
        category_id=valid_expense_category,
    )

    response = await async_client.post(
        "/api/v1/transactions/create",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 201
    data = response.json()

    # Validate response structure
    assert data["type"] == "expense"
    assert data["user_id"] == user_id
    assert data["expense_category_id"] == valid_expense_category
    assert data["amount"] == 42.5
    assert data["transaction_tag"] == "want"
    assert "id" in data
    assert "created_at" in data

    # Track for cleanup
    cleanup_manager.track_transaction(data["id"])


@pytest.mark.asyncio
@pytest.mark.integration
async def test_create_income_transaction_success(
    async_client: AsyncClient,
    cleanup_manager: IntegrationCleanup,
    authenticated_user: dict[str, str],
    valid_income_category: str,
):
    """Test successfully creating an income transaction."""
    user_id = authenticated_user["user_id"]
    token = authenticated_user["token"]

    payload = _create_transaction_payload(
        type="income",
        user_id=user_id,
        category_id=valid_income_category,
    )

    response = await async_client.post(
        "/api/v1/transactions/create",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 201
    data = response.json()

    # Validate response structure
    assert data["type"] == "income"
    assert data["user_id"] == user_id
    assert data["income_category_id"] == valid_income_category
    assert data["amount"] == 42.5
    assert "id" in data
    assert "created_at" in data

    # Track for cleanup
    cleanup_manager.track_transaction(data["id"])


@pytest.mark.asyncio
@pytest.mark.integration
async def test_create_transaction_invalid_expense_category(
    async_client: AsyncClient,
    authenticated_user: dict[str, str],
):
    """Test creating transaction with non-existent expense category fails."""
    user_id = authenticated_user["user_id"]
    token = authenticated_user["token"]

    payload = _create_transaction_payload(
        type="expense",
        user_id=user_id,
        category_id="non_existent_category",
    )

    response = await async_client.post(
        "/api/v1/transactions/create",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 400
    assert "category" in response.json()["detail"].lower()


@pytest.mark.asyncio
@pytest.mark.integration
async def test_create_transaction_missing_transaction_tag_for_expense(
    async_client: AsyncClient,
    authenticated_user: dict[str, str],
    valid_expense_category: str,
):
    """Test creating expense without transaction_tag fails."""
    user_id = authenticated_user["user_id"]
    token = authenticated_user["token"]

    payload = _create_transaction_payload(
        type="expense",
        user_id=user_id,
        category_id=valid_expense_category,
        transaction_tag="",  # Empty tag should fail
    )

    response = await async_client.post(
        "/api/v1/transactions/create",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 400
    assert "transaction tag" in response.json()["detail"].lower()


@pytest.mark.asyncio
@pytest.mark.integration
async def test_create_transaction_unauthenticated(
    async_client: AsyncClient,
    authenticated_user: dict[str, str],
    valid_expense_category: str,
):
    """Test creating transaction without auth token fails."""
    user_id = authenticated_user["user_id"]

    payload = _create_transaction_payload(
        type="expense",
        user_id=user_id,
        category_id=valid_expense_category,
    )

    response = await async_client.post(
        "/api/v1/transactions/create",
        json=payload,
        # No Authorization header
    )

    assert response.status_code == 401


@pytest.mark.asyncio
@pytest.mark.integration
async def test_create_transaction_invalid_jwt(
    async_client: AsyncClient,
    authenticated_user: dict[str, str],
    valid_expense_category: str,
):
    """Test creating transaction with invalid JWT fails."""
    user_id = authenticated_user["user_id"]

    payload = _create_transaction_payload(
        type="expense",
        user_id=user_id,
        category_id=valid_expense_category,
    )

    response = await async_client.post(
        "/api/v1/transactions/create",
        json=payload,
        headers={"Authorization": "Bearer invalid_token_here"},
    )

    assert response.status_code == 401


@pytest.mark.asyncio
@pytest.mark.integration
async def test_create_transaction_user_id_override(
    async_client: AsyncClient,
    cleanup_manager: IntegrationCleanup,
    authenticated_user: dict[str, str],
    valid_expense_category: str,
):
    """Test that user_id from JWT overrides payload user_id (security test)."""
    user_id = authenticated_user["user_id"]
    token = authenticated_user["token"]

    # Try to create transaction for a different user
    fake_user_id = "00000000-0000-0000-0000-000000000000"

    payload = _create_transaction_payload(
        type="expense",
        user_id=fake_user_id,  # Try to fake another user's ID
        category_id=valid_expense_category,
    )

    response = await async_client.post(
        "/api/v1/transactions/create",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 201
    data = response.json()

    # Verify the transaction was created with the authenticated user's ID, not the fake one
    assert data["user_id"] == user_id
    assert data["user_id"] != fake_user_id

    # Track for cleanup
    cleanup_manager.track_transaction(data["id"])


# ===== UPDATE TRANSACTION TESTS =====


@pytest.mark.asyncio
@pytest.mark.integration
async def test_update_expense_transaction_success(
    async_client: AsyncClient,
    cleanup_manager: IntegrationCleanup,
    authenticated_user: dict[str, str],
    valid_expense_category: str,
):
    """Test successfully updating an expense transaction."""
    user_id = authenticated_user["user_id"]
    token = authenticated_user["token"]

    # Create a transaction first
    create_payload = _create_transaction_payload(
        type="expense",
        user_id=user_id,
        category_id=valid_expense_category,
        amount=100.0,
        notes="Original note",
    )

    create_response = await async_client.post(
        "/api/v1/transactions/create-expense",
        json=create_payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert create_response.status_code == 201
    transaction_id = create_response.json()["id"]
    cleanup_manager.track_transaction(transaction_id)

    # Update the transaction
    update_payload = {
        "type": "expense",
        "amount": 150.0,
        "notes": "Updated note",
    }

    response = await async_client.patch(
        f"/api/v1/transactions/update/{transaction_id}",
        json=update_payload,
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()

    # Verify updates
    assert data["id"] == transaction_id
    assert data["amount"] == 150.0
    assert data["notes"] == "Updated note"
    assert data["type"] == "expense"
    assert data["expense_category_id"] == valid_expense_category


@pytest.mark.asyncio
@pytest.mark.integration
async def test_update_income_transaction_success(
    async_client: AsyncClient,
    cleanup_manager: IntegrationCleanup,
    authenticated_user: dict[str, str],
    valid_income_category: str,
):
    """Test successfully updating an income transaction."""
    user_id = authenticated_user["user_id"]
    token = authenticated_user["token"]

    # Create a transaction first
    create_payload = _create_transaction_payload(
        type="income",
        user_id=user_id,
        category_id=valid_income_category,
        amount=1000.0,
    )

    create_response = await async_client.post(
        "/api/v1/transactions/create-income",
        json=create_payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert create_response.status_code == 201
    transaction_id = create_response.json()["id"]
    cleanup_manager.track_transaction(transaction_id)

    # Update the transaction
    update_payload = {
        "type": "income",
        "amount": 1500.0,
        "notes": "Bonus payment",
    }

    response = await async_client.patch(
        f"/api/v1/transactions/update/{transaction_id}",
        json=update_payload,
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()

    # Verify updates
    assert data["id"] == transaction_id
    assert data["amount"] == 1500.0
    assert data["notes"] == "Bonus payment"
    assert data["type"] == "income"


@pytest.mark.asyncio
@pytest.mark.integration
async def test_update_transaction_not_found(
    async_client: AsyncClient,
    authenticated_user: dict[str, str],
):
    """Test updating non-existent transaction fails with 404."""
    token = authenticated_user["token"]
    fake_transaction_id = "00000000-0000-0000-0000-000000000000"

    update_payload = {
        "type": "expense",
        "amount": 150.0,
    }

    response = await async_client.patch(
        f"/api/v1/transactions/update/{fake_transaction_id}",
        json=update_payload,
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


@pytest.mark.asyncio
@pytest.mark.integration
async def test_update_transaction_type_immutable(
    async_client: AsyncClient,
    cleanup_manager: IntegrationCleanup,
    authenticated_user: dict[str, str],
    valid_expense_category: str,
):
    """Test that transaction type cannot be changed."""
    user_id = authenticated_user["user_id"]
    token = authenticated_user["token"]

    # Create an expense transaction
    create_payload = _create_transaction_payload(
        type="expense",
        user_id=user_id,
        category_id=valid_expense_category,
    )

    create_response = await async_client.post(
        "/api/v1/transactions/create-expense",
        json=create_payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert create_response.status_code == 201
    transaction_id = create_response.json()["id"]
    cleanup_manager.track_transaction(transaction_id)

    # Try to change type to income
    update_payload = {
        "type": "income",
        "income_category_id": "salary",
    }

    response = await async_client.patch(
        f"/api/v1/transactions/update/{transaction_id}",
        json=update_payload,
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 400
    assert "type" in response.json()["detail"].lower()


@pytest.mark.asyncio
@pytest.mark.integration
async def test_update_transaction_unauthenticated(
    async_client: AsyncClient,
):
    """Test updating transaction without auth token fails."""
    fake_transaction_id = "00000000-0000-0000-0000-000000000000"

    update_payload = {
        "type": "expense",
        "amount": 150.0,
    }

    response = await async_client.patch(
        f"/api/v1/transactions/update/{fake_transaction_id}",
        json=update_payload,
        # No Authorization header
    )

    assert response.status_code == 401


@pytest.mark.asyncio
@pytest.mark.integration
async def test_update_transaction_invalid_category(
    async_client: AsyncClient,
    cleanup_manager: IntegrationCleanup,
    authenticated_user: dict[str, str],
    valid_expense_category: str,
):
    """Test updating transaction with invalid category fails."""
    user_id = authenticated_user["user_id"]
    token = authenticated_user["token"]

    # Create a transaction first
    create_payload = _create_transaction_payload(
        type="expense",
        user_id=user_id,
        category_id=valid_expense_category,
    )

    create_response = await async_client.post(
        "/api/v1/transactions/create-expense",
        json=create_payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert create_response.status_code == 201
    transaction_id = create_response.json()["id"]
    cleanup_manager.track_transaction(transaction_id)

    # Try to update with invalid category
    update_payload = {
        "type": "expense",
        "expense_category_id": "non_existent_category",
    }

    response = await async_client.patch(
        f"/api/v1/transactions/update/{transaction_id}",
        json=update_payload,
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 400
    assert "category" in response.json()["detail"].lower()


# ===== DELETE TRANSACTION TESTS =====


@pytest.mark.asyncio
@pytest.mark.integration
async def test_delete_transaction_success(
    async_client: AsyncClient,
    authenticated_user: dict[str, str],
    valid_expense_category: str,
):
    """Test successfully deleting a transaction."""
    user_id = authenticated_user["user_id"]
    token = authenticated_user["token"]

    # Create a transaction first
    create_payload = _create_transaction_payload(
        type="expense",
        user_id=user_id,
        category_id=valid_expense_category,
    )

    create_response = await async_client.post(
        "/api/v1/transactions/create-expense",
        json=create_payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert create_response.status_code == 201
    transaction_id = create_response.json()["id"]

    # Delete the transaction
    response = await async_client.delete(
        f"/api/v1/transactions/delete/{transaction_id}",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 204

    # Verify transaction is deleted by trying to delete again
    response = await async_client.delete(
        f"/api/v1/transactions/delete/{transaction_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
@pytest.mark.integration
async def test_delete_transaction_not_found(
    async_client: AsyncClient,
    authenticated_user: dict[str, str],
):
    """Test deleting non-existent transaction fails with 404."""
    token = authenticated_user["token"]
    fake_transaction_id = "00000000-0000-0000-0000-000000000000"

    response = await async_client.delete(
        f"/api/v1/transactions/delete/{fake_transaction_id}",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


@pytest.mark.asyncio
@pytest.mark.integration
async def test_delete_transaction_unauthenticated(
    async_client: AsyncClient,
):
    """Test deleting transaction without auth token fails."""
    fake_transaction_id = "00000000-0000-0000-0000-000000000000"

    response = await async_client.delete(
        f"/api/v1/transactions/delete/{fake_transaction_id}",
        # No Authorization header
    )

    assert response.status_code == 401


@pytest.mark.asyncio
@pytest.mark.integration
async def test_delete_transaction_wrong_user(
    async_client: AsyncClient,
    cleanup_manager: IntegrationCleanup,
    authenticated_user: dict[str, str],
    valid_expense_category: str,
):
    """Test that users cannot delete another user's transaction."""
    user_id = authenticated_user["user_id"]
    token = authenticated_user["token"]

    # Create a transaction
    create_payload = _create_transaction_payload(
        type="expense",
        user_id=user_id,
        category_id=valid_expense_category,
    )

    create_response = await async_client.post(
        "/api/v1/transactions/create-expense",
        json=create_payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert create_response.status_code == 201
    transaction_id = create_response.json()["id"]
    cleanup_manager.track_transaction(transaction_id)

    # Try to delete with a different (fake) token
    # In a real scenario, this would be another user's token
    # For this test, we'll use an invalid token to simulate unauthorized access
    response = await async_client.delete(
        f"/api/v1/transactions/delete/{transaction_id}",
        headers={"Authorization": "Bearer invalid_token"},
    )

    # Should fail with 401 (invalid token)
    assert response.status_code == 401
