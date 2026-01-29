# Integration Tests for Timezone Fix

These integration tests verify that all API endpoints handle dates correctly according to the timezone fix implementation.

## Test Coverage

### test_transaction_endpoints.py
**POST /api/v1/transactions/create-expense**
- ✅ Create with YYYY-MM-DD date string
- ✅ Create for today's date
- ✅ Create for past/future dates
- ✅ Reject invalid date formats

**POST /api/v1/transactions/create-income**
- ✅ Create with YYYY-MM-DD date string
- ✅ Create for today's date

**GET /api/v1/transactions/list**
- ✅ List with date range
- ✅ Verify response format
- ✅ Single day queries

**GET /api/v1/transactions/today-summary**
- ✅ Empty and with transactions
- ✅ Timezone-aware today

**PATCH /api/v1/transactions/update/{id}**
- ✅ Update transaction dates

**Recurring Templates**
- ✅ Create and materialize with dates

### test_profile_endpoints.py
**PATCH /api/v1/profile/timezone**
- ✅ Valid/invalid timezones
- ✅ Persistence across requests
- ✅ Affects today's summary

### test_date_handling.py
**Date Format Consistency**
- ✅ All endpoints accept YYYY-MM-DD only
- ✅ All responses return YYYY-MM-DD
- ✅ Boundary conditions (leap years, month ends)
- ✅ Recurring materialization with clamping

## Running Tests

```bash
cd /Users/romnick/Documents/GitHub/ReperooV2/apps/api

# Install dependencies
uv sync --group dev

# Run all integration tests
uv run pytest tests/integration/ -v

# Run specific file
uv run pytest tests/integration/test_transaction_endpoints.py

# Run with coverage
uv run pytest tests/integration/ --cov=src
```

## Database Setup

Before running tests, ensure:

1. Database is running
2. Migrations are applied: `uv run alembic upgrade head`
3. Environment variables are set in `.env` or `.env.local`

## Manual Testing

```bash
# Set timezone
curl -X PATCH http://localhost:8080/api/v1/profile/timezone \
  -H "Authorization: Bearer $TOKEN" \
  -d '"America/New_York"'

# Create transaction
curl -X POST http://localhost:8080/api/v1/transactions/create-expense \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "occurred_at": "2024-06-15",
    "amount": 42.50,
    "type": "expense",
    "transaction_tag": "want",
    "expense_category_id": "personal"
  }'

# List transactions
curl "http://localhost:8080/api/v1/transactions/list?start_date=2024-06-01&end_date=2024-06-30" \
  -H "Authorization: Bearer $TOKEN"
```

See test files for comprehensive examples.
