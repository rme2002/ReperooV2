# Integration Tests

## Overview
Integration tests that verify the API endpoints work correctly with real Supabase and PostgreSQL instances.

## Running Tests

```bash
# Run all integration tests
uv run pytest tests/integration/ -v -m integration

# Run specific test file
uv run pytest tests/integration/test_transaction_routes.py -v -m integration

# Run with cleanup logs
uv run pytest tests/integration/ -v -m integration --log-cli-level=INFO
```

## Test Data Cleanup

**Cleanup is ENABLED** - Test data is automatically deleted after each test run:

### What Gets Cleaned Up:
✅ **Transactions** - All transactions created during tests are deleted  
✅ **Profiles** - All profile records in the database are deleted  
✅ **Supabase Auth Users** - Test users are deleted from Supabase (requires admin permissions)

### Cleanup Strategy:
1. **Per-test cleanup**: The `cleanup_manager` fixture tracks and cleans up data created in individual tests (like `test_sign_up_creates_supabase_user_and_profile`)
2. **Session cleanup**: The `cleanup_shared_user` fixture deletes the shared test user at the end of the test session

### Known Issues:
- ⚠️ Some Supabase configurations may not allow auth user deletion via admin API, resulting in warnings like:
  ```
  WARNING: Failed to delete Supabase user: User not allowed
  ```
  This is expected if your SUPABASE_SECRET_API_KEY lacks admin permissions. Database records (transactions, profiles) are still cleaned up properly.

## Required Environment Variables
```
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_SECRET_API_KEY=...
SUPABASE_JWT_SECRET=...
```

## Test Architecture

### Fixtures:
- **`app_lifespan`** (function-scoped): Initializes FastAPI app and Supabase client for each test
- **`async_client`**: HTTP client for making API requests
- **`shared_authenticated_user`** (session-scoped): Reusable test user to avoid rate limiting
- **`authenticated_user`**: Returns the shared user for tests requiring authentication
- **`cleanup_manager`**: Tracks and cleans up test data
- **`valid_expense_category`**: Returns a valid expense category ID
- **`valid_income_category`**: Returns a valid income category ID

## Test Coverage

- ✅ Authentication (sign-up, JWT validation)
- ✅ Transaction creation (expense/income)
- ✅ Transaction updates
- ✅ Transaction deletion
- ✅ Permission checks
- ✅ Validation errors

**Total: 19 tests**
