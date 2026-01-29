"""Integration tests for transaction endpoints with timezone fix."""

import pytest

pytestmark = pytest.mark.integration

from datetime import date, timedelta


class TestCreateExpenseTransaction:
    """Integration tests for POST /api/v1/transactions/create-expense."""

    def test_create_expense_with_date_string(
        self, client, auth_headers, valid_expense_category
    ):
        """Test creating expense transaction with YYYY-MM-DD date string."""
        payload = {
            "occurred_at": "2024-06-15",
            "amount": 42.50,
            "type": "expense",
            "transaction_tag": "want",
            "expense_category_id": valid_expense_category,
            "expense_subcategory_id": None,
            "notes": "Coffee shop",
        }

        response = client.post(
            "/api/v1/transactions/create-expense", json=payload, headers=auth_headers
        )

        assert response.status_code == 201
        data = response.json()

        # Verify response format
        assert data["occurred_at"] == "2024-06-15"
        assert data["amount"] == 42.50
        assert data["type"] == "expense"
        assert data["transaction_tag"] == "want"
        assert data["expense_category_id"] == valid_expense_category
        assert data["notes"] == "Coffee shop"
        assert "id" in data
        assert "created_at" in data

    def test_create_expense_for_today(
        self, client, auth_headers, valid_expense_category
    ):
        """Test creating expense transaction for today's date."""
        today = date.today().isoformat()

        payload = {
            "occurred_at": today,
            "amount": 25.00,
            "type": "expense",
            "transaction_tag": "need",
            "expense_category_id": valid_expense_category,
            "notes": "Groceries",
        }

        response = client.post(
            "/api/v1/transactions/create-expense", json=payload, headers=auth_headers
        )

        assert response.status_code == 201
        data = response.json()
        assert data["occurred_at"] == today

    def test_create_expense_with_invalid_date_format(
        self, client, auth_headers, valid_expense_category
    ):
        """Test that invalid date format returns 400 error."""
        payload = {
            "occurred_at": "06/15/2024",  # Wrong format
            "amount": 42.50,
            "type": "expense",
            "transaction_tag": "want",
            "expense_category_id": valid_expense_category,
        }

        response = client.post(
            "/api/v1/transactions/create-expense", json=payload, headers=auth_headers
        )

        assert response.status_code == 400
        assert "Invalid date format" in response.json()["detail"]

    def test_create_expense_with_iso_datetime_fails(
        self, client, auth_headers, valid_expense_category
    ):
        """Test that ISO datetime string is rejected."""
        payload = {
            "occurred_at": "2024-06-15T13:45:00Z",  # Should be date only
            "amount": 42.50,
            "type": "expense",
            "transaction_tag": "want",
            "expense_category_id": valid_expense_category,
        }

        response = client.post(
            "/api/v1/transactions/create-expense", json=payload, headers=auth_headers
        )

        assert response.status_code == 400

    def test_create_expense_past_date(
        self, client, auth_headers, valid_expense_category
    ):
        """Test creating expense for past date."""
        past_date = (date.today() - timedelta(days=30)).isoformat()

        payload = {
            "occurred_at": past_date,
            "amount": 100.00,
            "type": "expense",
            "transaction_tag": "need",
            "expense_category_id": valid_expense_category,
            "notes": "Last month's expense",
        }

        response = client.post(
            "/api/v1/transactions/create-expense", json=payload, headers=auth_headers
        )

        assert response.status_code == 201
        data = response.json()
        assert data["occurred_at"] == past_date

    def test_create_expense_future_date(
        self, client, auth_headers, valid_expense_category
    ):
        """Test creating expense for future date."""
        future_date = (date.today() + timedelta(days=7)).isoformat()

        payload = {
            "occurred_at": future_date,
            "amount": 50.00,
            "type": "expense",
            "transaction_tag": "want",
            "expense_category_id": valid_expense_category,
            "notes": "Planned expense",
        }

        response = client.post(
            "/api/v1/transactions/create-expense", json=payload, headers=auth_headers
        )

        assert response.status_code == 201
        data = response.json()
        assert data["occurred_at"] == future_date


class TestCreateIncomeTransaction:
    """Integration tests for POST /api/v1/transactions/create-income."""

    def test_create_income_with_date_string(
        self, client, auth_headers, valid_income_category
    ):
        """Test creating income transaction with YYYY-MM-DD date string."""
        payload = {
            "occurred_at": "2024-06-01",
            "amount": 3000.00,
            "type": "income",
            "income_category_id": valid_income_category,
            "notes": "Monthly salary",
        }

        response = client.post(
            "/api/v1/transactions/create-income", json=payload, headers=auth_headers
        )

        assert response.status_code == 201
        data = response.json()

        assert data["occurred_at"] == "2024-06-01"
        assert data["amount"] == 3000.00
        assert data["type"] == "income"
        assert data["income_category_id"] == valid_income_category
        assert data["notes"] == "Monthly salary"

    def test_create_income_for_today(self, client, auth_headers, valid_income_category):
        """Test creating income transaction for today."""
        today = date.today().isoformat()

        payload = {
            "occurred_at": today,
            "amount": 500.00,
            "type": "income",
            "income_category_id": valid_income_category,
            "notes": "Freelance payment",
        }

        response = client.post(
            "/api/v1/transactions/create-income", json=payload, headers=auth_headers
        )

        assert response.status_code == 201
        data = response.json()
        assert data["occurred_at"] == today


class TestListTransactions:
    """Integration tests for GET /api/v1/transactions/list."""

    def test_list_transactions_with_date_range(
        self, client, auth_headers, valid_expense_category
    ):
        """Test listing transactions with date range."""
        # Create some transactions first
        for day in range(1, 6):
            payload = {
                "occurred_at": f"2024-06-{day:02d}",
                "amount": 10.00 * day,
                "type": "expense",
                "transaction_tag": "need",
                "expense_category_id": valid_expense_category,
            }
            client.post(
                "/api/v1/transactions/create-expense",
                json=payload,
                headers=auth_headers,
            )

        # Query the date range
        response = client.get(
            "/api/v1/transactions/list",
            params={"start_date": "2024-06-01", "end_date": "2024-06-30"},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()

        # Should return list of transactions
        assert isinstance(data, list)
        assert len(data) >= 5

        # Verify date format in responses
        for transaction in data:
            occurred_at = transaction["occurred_at"]
            # Should be YYYY-MM-DD format
            assert len(occurred_at) == 10
            assert occurred_at.count("-") == 2
            # Should be parseable as date
            date.fromisoformat(occurred_at)

    def test_list_transactions_current_month(self, client, auth_headers):
        """Test listing transactions for current month."""
        today = date.today()
        start_date = date(today.year, today.month, 1).isoformat()

        # Last day of current month
        if today.month == 12:
            end_date = date(today.year, 12, 31).isoformat()
        else:
            last_day = date(today.year, today.month + 1, 1) - timedelta(days=1)
            end_date = last_day.isoformat()

        response = client.get(
            "/api/v1/transactions/list",
            params={"start_date": start_date, "end_date": end_date},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_list_transactions_invalid_date_format(self, client, auth_headers):
        """Test that invalid date format returns 400."""
        response = client.get(
            "/api/v1/transactions/list",
            params={
                "start_date": "06/01/2024",  # Wrong format
                "end_date": "2024-06-30",
            },
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "Invalid date format" in response.json()["detail"]

    def test_list_transactions_single_day(
        self, client, auth_headers, valid_expense_category
    ):
        """Test listing transactions for a single day."""
        date_str = "2024-06-15"

        # Create transaction for that day
        payload = {
            "occurred_at": date_str,
            "amount": 25.00,
            "type": "expense",
            "transaction_tag": "need",
            "expense_category_id": valid_expense_category,
        }
        client.post(
            "/api/v1/transactions/create-expense", json=payload, headers=auth_headers
        )

        # Query that single day
        response = client.get(
            "/api/v1/transactions/list",
            params={"start_date": date_str, "end_date": date_str},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()

        # Should have at least the transaction we created
        matching = [t for t in data if t["occurred_at"] == date_str]
        assert len(matching) >= 1


class TestTodaySummary:
    """Integration tests for GET /api/v1/transactions/today-summary."""

    def test_get_today_summary_empty(self, client, auth_headers):
        """Test getting today's summary with no transactions."""
        response = client.get(
            "/api/v1/transactions/today-summary", headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()

        # Verify structure
        assert "date" in data
        assert "expense_total" in data
        assert "expense_count" in data
        assert "income_total" in data
        assert "income_count" in data
        assert "has_logged_today" in data

        # Date should be YYYY-MM-DD format
        assert len(data["date"]) == 10
        assert data["date"].count("-") == 2

        # Should be today's date (in user's timezone)
        summary_date = date.fromisoformat(data["date"])
        today = date.today()
        # Should be today or very close (accounting for timezone)
        assert abs((summary_date - today).days) <= 1

    def test_get_today_summary_with_transactions(
        self, client, auth_headers, valid_expense_category, valid_income_category
    ):
        """Test getting today's summary with transactions."""
        today = date.today().isoformat()

        # Create some transactions for today
        expense_payload = {
            "occurred_at": today,
            "amount": 50.00,
            "type": "expense",
            "transaction_tag": "want",
            "expense_category_id": valid_expense_category,
        }
        client.post(
            "/api/v1/transactions/create-expense",
            json=expense_payload,
            headers=auth_headers,
        )

        income_payload = {
            "occurred_at": today,
            "amount": 1000.00,
            "type": "income",
            "income_category_id": valid_income_category,
        }
        client.post(
            "/api/v1/transactions/create-income",
            json=income_payload,
            headers=auth_headers,
        )

        # Get summary
        response = client.get(
            "/api/v1/transactions/today-summary", headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()

        # Should have counted our transactions
        assert data["expense_count"] >= 1
        assert data["income_count"] >= 1
        assert data["expense_total"] >= 50.00
        assert data["income_total"] >= 1000.00
        assert data["has_logged_today"] is True

    def test_today_summary_uses_user_timezone(self, client, auth_headers):
        """Test that today's summary respects user's timezone."""
        # First, set user's timezone
        tz_response = client.patch(
            "/api/v1/profile/timezone", json="America/New_York", headers=auth_headers
        )
        assert tz_response.status_code == 200

        # Get today's summary
        response = client.get(
            "/api/v1/transactions/today-summary", headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()

        # Date should be in YYYY-MM-DD format
        assert len(data["date"]) == 10
        summary_date = date.fromisoformat(data["date"])

        # Should be a valid date close to today
        today = date.today()
        assert abs((summary_date - today).days) <= 1


class TestUpdateTransaction:
    """Integration tests for PATCH /api/v1/transactions/update/{id}."""

    def test_update_transaction_date(
        self, client, auth_headers, valid_expense_category
    ):
        """Test updating transaction date."""
        # Create a transaction
        create_payload = {
            "occurred_at": "2024-06-15",
            "amount": 50.00,
            "type": "expense",
            "transaction_tag": "want",
            "expense_category_id": valid_expense_category,
        }
        create_response = client.post(
            "/api/v1/transactions/create-expense",
            json=create_payload,
            headers=auth_headers,
        )
        assert create_response.status_code == 201
        transaction_id = create_response.json()["id"]

        # Update the date
        update_payload = {
            "type": "expense",
            "occurred_at": "2024-06-20",
            "amount": 50.00,
        }
        update_response = client.patch(
            f"/api/v1/transactions/update/{transaction_id}",
            json=update_payload,
            headers=auth_headers,
        )

        assert update_response.status_code == 200
        data = update_response.json()
        assert data["occurred_at"] == "2024-06-20"

    def test_update_transaction_invalid_date_format(
        self, client, auth_headers, valid_expense_category
    ):
        """Test that invalid date format in update returns 400."""
        # Create a transaction
        create_payload = {
            "occurred_at": "2024-06-15",
            "amount": 50.00,
            "type": "expense",
            "transaction_tag": "want",
            "expense_category_id": valid_expense_category,
        }
        create_response = client.post(
            "/api/v1/transactions/create-expense",
            json=create_payload,
            headers=auth_headers,
        )
        transaction_id = create_response.json()["id"]

        # Try to update with invalid date
        update_payload = {
            "type": "expense",
            "occurred_at": "06/20/2024",  # Wrong format
        }
        update_response = client.patch(
            f"/api/v1/transactions/update/{transaction_id}",
            json=update_payload,
            headers=auth_headers,
        )

        assert update_response.status_code == 400


class TestRecurringTemplates:
    """Integration tests for recurring template endpoints."""

    def test_create_recurring_expense_template(
        self, client, auth_headers, valid_expense_category
    ):
        """Test creating recurring expense template with date strings."""
        payload = {
            "type": "expense",
            "amount": 99.99,
            "frequency": "monthly",
            "day_of_month": 15,
            "start_date": "2024-06-01",
            "end_date": None,
            "total_occurrences": None,
            "transaction_tag": "need",
            "expense_category_id": valid_expense_category,
            "notes": "Monthly subscription",
        }

        response = client.post(
            "/api/v1/transactions/recurring/create", json=payload, headers=auth_headers
        )

        assert response.status_code == 201
        data = response.json()

        # Verify dates are in correct format
        assert data["start_date"] == "2024-06-01"
        assert data["frequency"] == "monthly"
        assert data["day_of_month"] == 15

    def test_create_recurring_income_template(
        self, client, auth_headers, valid_income_category
    ):
        """Test creating recurring income template."""
        payload = {
            "type": "income",
            "amount": 3000.00,
            "frequency": "monthly",
            "day_of_month": 1,
            "start_date": "2024-01-01",
            "end_date": None,
            "total_occurrences": None,
            "income_category_id": valid_income_category,
            "notes": "Monthly salary",
        }

        response = client.post(
            "/api/v1/transactions/recurring/create-income",
            json=payload,
            headers=auth_headers,
        )

        assert response.status_code == 201
        data = response.json()

        assert data["start_date"] == "2024-01-01"
        assert data["amount"] == 3000.00

    def test_recurring_template_with_end_date(
        self, client, auth_headers, valid_expense_category
    ):
        """Test creating recurring template with end date."""
        payload = {
            "type": "expense",
            "amount": 50.00,
            "frequency": "weekly",
            "day_of_week": 1,  # Tuesday
            "start_date": "2024-06-01",
            "end_date": "2024-12-31",
            "total_occurrences": None,
            "transaction_tag": "want",
            "expense_category_id": valid_expense_category,
            "notes": "Weekly expense",
        }

        response = client.post(
            "/api/v1/transactions/recurring/create", json=payload, headers=auth_headers
        )

        assert response.status_code == 201
        data = response.json()

        assert data["start_date"] == "2024-06-01"
        assert data["end_date"] == "2024-12-31"
        assert data["frequency"] == "weekly"

    def test_recurring_templates_materialize_correctly(
        self, client, auth_headers, valid_expense_category
    ):
        """Test that recurring templates materialize with correct dates."""
        # Create recurring template
        template_payload = {
            "type": "expense",
            "amount": 100.00,
            "frequency": "monthly",
            "day_of_month": 1,
            "start_date": "2024-06-01",
            "end_date": "2024-08-31",
            "total_occurrences": None,
            "transaction_tag": "need",
            "expense_category_id": valid_expense_category,
            "notes": "Monthly recurring",
        }
        create_response = client.post(
            "/api/v1/transactions/recurring/create",
            json=template_payload,
            headers=auth_headers,
        )
        assert create_response.status_code == 201

        # Query for transactions in the date range
        # This should trigger materialization
        response = client.get(
            "/api/v1/transactions/list",
            params={"start_date": "2024-06-01", "end_date": "2024-08-31"},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()

        # Should have materialized transactions for Jun 1, Jul 1, Aug 1
        recurring_txns = [t for t in data if t.get("recurring_template_id") is not None]

        assert len(recurring_txns) >= 3

        # Verify dates are on day 1 of each month
        dates = [t["occurred_at"] for t in recurring_txns]
        assert "2024-06-01" in dates
        assert "2024-07-01" in dates
        assert "2024-08-01" in dates
