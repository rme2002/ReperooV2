# Backend Tests for Timezone Fix

This directory contains comprehensive tests for the timezone fix implementation.

## Test Files

### `utils/test_date_utils.py`
Tests for the date utility functions:
- `get_user_today()` - Getting today's date in various timezones
- `parse_date_string()` - Parsing YYYY-MM-DD strings to date objects
- Edge cases and error handling

### `services/test_recurring_materialization_service.py`
Tests for recurring transaction materialization:
- Monthly occurrences with day-of-month clamping
- Weekly and biweekly occurrences
- Date range boundary handling
- Total occurrences and end date limits

### `test_timezone_integration.py`
End-to-end integration tests:
- User workflows in different timezones
- Date string formatting and parsing
- API request/response format
- Edge cases (leap years, month boundaries, etc.)

## Running the Tests

### Prerequisites

1. **Install dependencies:**
   ```bash
   cd /Users/romnick/Documents/GitHub/ReperooV2/apps/api
   uv sync --group dev
   ```

2. **Set up database (if running integration tests):**
   ```bash
   # Make sure your database is running and .env is configured
   uv run alembic upgrade head
   ```

### Run All Tests

```bash
# Run all tests
uv run pytest

# Run with coverage
uv run pytest --cov=src --cov-report=html

# Run specific test file
uv run pytest tests/utils/test_date_utils.py

# Run specific test class
uv run pytest tests/utils/test_date_utils.py::TestGetUserToday

# Run specific test
uv run pytest tests/utils/test_date_utils.py::TestGetUserToday::test_get_today_utc

# Run with verbose output
uv run pytest -v

# Run and stop on first failure
uv run pytest -x
```

### Run Tests by Category

```bash
# Unit tests only (no database required)
uv run pytest tests/utils/ tests/services/

# Integration tests (requires database)
uv run pytest tests/test_timezone_integration.py

# Tests matching a pattern
uv run pytest -k "timezone"
uv run pytest -k "monthly"
uv run pytest -k "parse_date"
```

## Test Coverage

The tests cover:

✅ **Date Utilities**
- Timezone-aware today calculation for all IANA timezones
- Date string parsing with validation
- Invalid input handling
- Fallback behavior

✅ **Recurring Transactions**
- Monthly occurrences with day clamping (e.g., day 31 → Feb 29)
- Weekly and biweekly occurrences
- Day-of-week calculations
- Total occurrences limits
- End date handling
- Date range boundaries

✅ **Integration Scenarios**
- Users in negative UTC offsets (NYC, LA)
- Users in positive UTC offsets (Tokyo, London)
- Transaction creation for "today"
- Today's summary in user's timezone
- API request/response formatting
- Edge cases (leap years, month boundaries, midnight)

## Database Migrations

Before running integration tests, ensure migrations are applied:

```bash
# Check current migration status
uv run alembic current

# Show migration history
uv run alembic history

# Apply all pending migrations
uv run alembic upgrade head

# Rollback one migration
uv run alembic downgrade -1

# Rollback to specific revision
uv run alembic downgrade <revision_id>
```

## Manual Testing Checklist

After running automated tests, perform these manual checks:

### Backend Testing

1. **Create transaction for "today"**
   ```bash
   curl -X POST http://localhost:8080/api/v1/transactions/create-expense \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "occurred_at": "2024-06-15",
       "amount": 42.50,
       "type": "expense",
       "transaction_tag": "want",
       "expense_category_id": "personal",
       "notes": "Test transaction"
     }'
   ```

2. **Query transactions for date range**
   ```bash
   curl "http://localhost:8080/api/v1/transactions/list?start_date=2024-06-01&end_date=2024-06-30" \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

3. **Get today's summary**
   ```bash
   curl http://localhost:8080/api/v1/transactions/today-summary \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

4. **Update user timezone**
   ```bash
   curl -X PATCH http://localhost:8080/api/v1/profile/timezone \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"timezone": "America/New_York"}'
   ```

### Verify Database Changes

```sql
-- Check occurred_at is now date type
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'transactions' AND column_name = 'occurred_at';
-- Should return: date

-- Check recurring template dates
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'recurring_templates'
AND column_name IN ('start_date', 'end_date');
-- Should return: date for both

-- Check timezone field exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'timezone';
-- Should return: text, default 'UTC'

-- Test date storage
SELECT id, occurred_at, created_at
FROM transactions
LIMIT 5;
-- occurred_at should be YYYY-MM-DD format
-- created_at should be timestamp with timezone
```

### Test Scenarios

- [ ] User in PST creates transaction for "today" → displays as today
- [ ] User in EST creates transaction for "Jan 15" → shows as Jan 15
- [ ] Recurring monthly on day 31 → Feb materializes on 28/29
- [ ] Query transactions for full month → all dates in range appear
- [ ] "Today's Summary" at 11:59 PM and 12:01 AM local time
- [ ] Existing transactions (migrated) display correctly
- [ ] Change device timezone → "today" updates to new timezone

## Troubleshooting

### Tests fail with database connection error
- Ensure database is running
- Check `.env` file has correct DATABASE_URL
- Verify `alembic upgrade head` completed successfully

### Import errors
- Run `uv sync --group dev` to install test dependencies
- Check that you're in the correct directory (`/apps/api`)

### Timezone tests are flaky
- These tests might be flaky near midnight in certain timezones
- Rerun the specific test to confirm it's not a timing issue

### Date parsing tests fail
- Ensure Python 3.13+ is being used (for zoneinfo support)
- Check that `zoneinfo` module is available

## Continuous Integration

Add these tests to your CI pipeline:

```yaml
# .github/workflows/test.yml
name: Backend Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Install uv
        run: curl -LsSf https://astral.sh/uv/install.sh | sh

      - name: Install dependencies
        run: uv sync --group dev
        working-directory: apps/api

      - name: Run migrations
        run: uv run alembic upgrade head
        working-directory: apps/api
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db

      - name: Run tests
        run: uv run pytest --cov=src --cov-report=xml
        working-directory: apps/api

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```
