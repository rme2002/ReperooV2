"""Integration tests for date handling across all endpoints."""
import pytest
from datetime import date
from fastapi.testclient import TestClient
from uuid import uuid4

from src.main import app


@pytest.fixture
def client():
    """Create a test client."""
    return TestClient(app)


@pytest.fixture
def auth_headers():
    """Create authentication headers."""
    return {
        "Authorization": f"Bearer test_token_{uuid4()}",
        "Content-Type": "application/json"
    }


class TestDateFormats:
    """Test date format handling across all endpoints."""

    def test_all_endpoints_accept_yyyy_mm_dd(self, client, auth_headers):
        """Test that all endpoints accept YYYY-MM-DD format."""
        test_date = "2024-06-15"

        # Create expense
        expense_response = client.post(
            "/api/v1/transactions/create-expense",
            json={
                "occurred_at": test_date,
                "amount": 50.00,
                "type": "expense",
                "transaction_tag": "want",
                "expense_category_id": "personal"
            },
            headers=auth_headers
        )
        assert expense_response.status_code == 201

        # Create income
        income_response = client.post(
            "/api/v1/transactions/create-income",
            json={
                "occurred_at": test_date,
                "amount": 1000.00,
                "type": "income",
                "income_category_id": "salary"
            },
            headers=auth_headers
        )
        assert income_response.status_code == 201

        # Create recurring template
        recurring_response = client.post(
            "/api/v1/transactions/recurring/create",
            json={
                "type": "expense",
                "amount": 99.99,
                "frequency": "monthly",
                "day_of_month": 1,
                "start_date": test_date,
                "end_date": None,
                "transaction_tag": "need",
                "expense_category_id": "essentials"
            },
            headers=auth_headers
        )
        assert recurring_response.status_code == 201

        # List transactions
        list_response = client.get(
            "/api/v1/transactions/list",
            params={
                "start_date": test_date,
                "end_date": test_date
            },
            headers=auth_headers
        )
        assert list_response.status_code == 200

    def test_all_endpoints_reject_iso_datetime(self, client, auth_headers):
        """Test that all endpoints reject ISO datetime format."""
        iso_datetime = "2024-06-15T13:45:00Z"

        # Create expense
        expense_response = client.post(
            "/api/v1/transactions/create-expense",
            json={
                "occurred_at": iso_datetime,
                "amount": 50.00,
                "type": "expense",
                "transaction_tag": "want",
                "expense_category_id": "personal"
            },
            headers=auth_headers
        )
        assert expense_response.status_code == 400

        # List transactions
        list_response = client.get(
            "/api/v1/transactions/list",
            params={
                "start_date": iso_datetime,
                "end_date": "2024-06-30"
            },
            headers=auth_headers
        )
        assert list_response.status_code == 400

    def test_all_endpoints_reject_wrong_format(self, client, auth_headers):
        """Test that all endpoints reject MM/DD/YYYY format."""
        wrong_format = "06/15/2024"

        # Create expense
        expense_response = client.post(
            "/api/v1/transactions/create-expense",
            json={
                "occurred_at": wrong_format,
                "amount": 50.00,
                "type": "expense",
                "transaction_tag": "want",
                "expense_category_id": "personal"
            },
            headers=auth_headers
        )
        assert expense_response.status_code == 400

    def test_all_responses_return_yyyy_mm_dd(self, client, auth_headers):
        """Test that all response dates are in YYYY-MM-DD format."""
        test_date = "2024-06-15"

        # Create transaction
        create_response = client.post(
            "/api/v1/transactions/create-expense",
            json={
                "occurred_at": test_date,
                "amount": 50.00,
                "type": "expense",
                "transaction_tag": "want",
                "expense_category_id": "personal"
            },
            headers=auth_headers
        )
        data = create_response.json()
        assert data["occurred_at"] == test_date
        assert len(data["occurred_at"]) == 10

        # List transactions
        list_response = client.get(
            "/api/v1/transactions/list",
            params={
                "start_date": "2024-06-01",
                "end_date": "2024-06-30"
            },
            headers=auth_headers
        )
        list_data = list_response.json()
        for transaction in list_data:
            occurred_at = transaction["occurred_at"]
            assert len(occurred_at) == 10
            assert occurred_at.count('-') == 2
            # Should be parseable as date
            date.fromisoformat(occurred_at)


class TestDateBoundaries:
    """Test boundary conditions for date handling."""

    def test_leap_year_february_29(self, client, auth_headers):
        """Test handling of February 29 in leap year."""
        payload = {
            "occurred_at": "2024-02-29",
            "amount": 50.00,
            "type": "expense",
            "transaction_tag": "need",
            "expense_category_id": "essentials"
        }

        response = client.post(
            "/api/v1/transactions/create-expense",
            json=payload,
            headers=auth_headers
        )

        assert response.status_code == 201
        data = response.json()
        assert data["occurred_at"] == "2024-02-29"

    def test_non_leap_year_february_29_fails(self, client, auth_headers):
        """Test that February 29 in non-leap year fails."""
        payload = {
            "occurred_at": "2023-02-29",  # 2023 is not a leap year
            "amount": 50.00,
            "type": "expense",
            "transaction_tag": "need",
            "expense_category_id": "essentials"
        }

        response = client.post(
            "/api/v1/transactions/create-expense",
            json=payload,
            headers=auth_headers
        )

        assert response.status_code == 400

    def test_end_of_month_dates(self, client, auth_headers):
        """Test last days of various months."""
        dates = [
            "2024-01-31",  # January
            "2024-04-30",  # April
            "2024-12-31",  # December
        ]

        for test_date in dates:
            payload = {
                "occurred_at": test_date,
                "amount": 50.00,
                "type": "expense",
                "transaction_tag": "need",
                "expense_category_id": "essentials"
            }

            response = client.post(
                "/api/v1/transactions/create-expense",
                json=payload,
                headers=auth_headers
            )

            assert response.status_code == 201
            data = response.json()
            assert data["occurred_at"] == test_date

    def test_invalid_dates(self, client, auth_headers):
        """Test that invalid dates are rejected."""
        invalid_dates = [
            "2024-02-30",  # February doesn't have 30 days
            "2024-04-31",  # April has 30 days
            "2024-13-01",  # Month 13 doesn't exist
            "2024-00-01",  # Month 0 doesn't exist
            "2024-06-00",  # Day 0 doesn't exist
            "2024-06-32",  # June has 30 days
        ]

        for invalid_date in invalid_dates:
            payload = {
                "occurred_at": invalid_date,
                "amount": 50.00,
                "type": "expense",
                "transaction_tag": "need",
                "expense_category_id": "essentials"
            }

            response = client.post(
                "/api/v1/transactions/create-expense",
                json=payload,
                headers=auth_headers
            )

            assert response.status_code == 400


class TestRecurringDateMaterialization:
    """Test that recurring transactions materialize with correct dates."""

    def test_monthly_day_31_february_clamping(self, client, auth_headers):
        """Test that day 31 clamps to 28/29 in February."""
        # Create recurring template for day 31
        template_payload = {
            "type": "expense",
            "amount": 100.00,
            "frequency": "monthly",
            "day_of_month": 31,
            "start_date": "2024-01-31",
            "end_date": "2024-03-31",
            "transaction_tag": "need",
            "expense_category_id": "essentials"
        }

        create_response = client.post(
            "/api/v1/transactions/recurring/create",
            json=template_payload,
            headers=auth_headers
        )
        assert create_response.status_code == 201

        # Query for materialized transactions
        list_response = client.get(
            "/api/v1/transactions/list",
            params={
                "start_date": "2024-01-01",
                "end_date": "2024-03-31"
            },
            headers=auth_headers
        )

        assert list_response.status_code == 200
        data = list_response.json()

        # Find recurring transactions
        recurring = [t for t in data if t.get("recurring_template_id")]
        dates = [t["occurred_at"] for t in recurring]

        # Should have: Jan 31, Feb 29 (2024 is leap year), Mar 31
        assert "2024-01-31" in dates
        assert "2024-02-29" in dates  # Clamped to 29 (leap year)
        assert "2024-03-31" in dates

    def test_weekly_materialization(self, client, auth_headers):
        """Test that weekly recurring transactions materialize correctly."""
        # Create weekly recurring starting on Monday
        template_payload = {
            "type": "expense",
            "amount": 50.00,
            "frequency": "weekly",
            "day_of_week": 0,  # Monday
            "start_date": "2024-06-03",  # Monday, June 3
            "end_date": "2024-06-30",
            "transaction_tag": "need",
            "expense_category_id": "essentials"
        }

        create_response = client.post(
            "/api/v1/transactions/recurring/create",
            json=template_payload,
            headers=auth_headers
        )
        assert create_response.status_code == 201

        # Query for materialized transactions
        list_response = client.get(
            "/api/v1/transactions/list",
            params={
                "start_date": "2024-06-01",
                "end_date": "2024-06-30"
            },
            headers=auth_headers
        )

        assert list_response.status_code == 200
        data = list_response.json()

        # Find recurring transactions
        recurring = [t for t in data if t.get("recurring_template_id")]

        # Should have Mondays in June (3, 10, 17, 24)
        assert len(recurring) >= 4

        # Verify all are Mondays
        for txn in recurring:
            txn_date = date.fromisoformat(txn["occurred_at"])
            assert txn_date.weekday() == 0  # Monday


class TestTimezoneScenarios:
    """Test real-world timezone scenarios."""

    def test_user_in_nyc_timezone(self, client, auth_headers):
        """Simulate user in NYC timezone creating transactions."""
        # Set timezone to NYC
        tz_response = client.patch(
            "/api/v1/profile/timezone",
            json="America/New_York",
            headers=auth_headers
        )
        assert tz_response.status_code == 200

        # Create transaction for "today" (from user's perspective)
        today = date.today()
        payload = {
            "occurred_at": today.isoformat(),
            "amount": 42.50,
            "type": "expense",
            "transaction_tag": "want",
            "expense_category_id": "personal"
        }

        create_response = client.post(
            "/api/v1/transactions/create-expense",
            json=payload,
            headers=auth_headers
        )

        assert create_response.status_code == 201
        data = create_response.json()

        # Should store the exact date user provided
        assert data["occurred_at"] == today.isoformat()

    def test_user_in_tokyo_timezone(self, client, auth_headers):
        """Simulate user in Tokyo timezone."""
        # Set timezone to Tokyo
        tz_response = client.patch(
            "/api/v1/profile/timezone",
            json="Asia/Tokyo",
            headers=auth_headers
        )
        assert tz_response.status_code == 200

        # Get today's summary
        summary_response = client.get(
            "/api/v1/transactions/today-summary",
            headers=auth_headers
        )

        assert summary_response.status_code == 200
        data = summary_response.json()

        # Should return a valid date
        assert "date" in data
        summary_date = date.fromisoformat(data["date"])

        # Should be a recent date
        today = date.today()
        assert abs((summary_date - today).days) <= 1
