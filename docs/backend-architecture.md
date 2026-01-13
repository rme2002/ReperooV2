# Backend Architecture Documentation

## Overview

This document describes the backend architecture for Reperoo, a personal finance tracking application. The backend is built with FastAPI and PostgreSQL, featuring a comprehensive recurring transaction system.

## Table of Contents

- [Database Schema](#database-schema)
- [Recurring Transaction System](#recurring-transaction-system)
- [Transaction Creation Flow](#transaction-creation-flow)
- [API Endpoints](#api-endpoints)
- [Services and Repositories](#services-and-repositories)
- [CLI Tools](#cli-tools)

---

## Database Schema

### Transactions Table

The `transactions` table stores all financial transactions (both one-time and recurring instances).

**Schema:**

```sql
CREATE TABLE transactions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    amount NUMERIC(12, 2) NOT NULL,
    type TEXT NOT NULL,  -- 'expense' or 'income'

    -- Category references
    expense_category_id TEXT REFERENCES expense_categories(id),
    expense_subcategory_id TEXT REFERENCES expense_subcategories(id),
    income_category_id TEXT REFERENCES income_categories(id),

    -- Metadata
    notes TEXT,
    transaction_tag TEXT,  -- Required for expenses

    -- Recurring transaction link
    recurring_template_id UUID REFERENCES recurring_templates(id) ON DELETE SET NULL,

    -- Constraints
    CONSTRAINT transactions_category_check CHECK (
        (type = 'expense' AND expense_category_id IS NOT NULL
         AND income_category_id IS NULL AND transaction_tag IS NOT NULL)
        OR
        (type = 'income' AND income_category_id IS NOT NULL
         AND expense_category_id IS NULL)
    )
);
```

**Key Points:**

- All transactions (one-time and recurring) are stored in this table
- `recurring_template_id` links to the template that generated this transaction (NULL for one-time transactions)
- Type-specific validation ensures proper category usage
- Expense transactions require a `transaction_tag`

### Recurring Templates Table

The `recurring_templates` table stores templates for recurring transactions.

**Schema:**

```sql
CREATE TABLE recurring_templates (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    type TEXT NOT NULL,  -- 'expense' or 'income'

    -- Category references
    expense_category_id TEXT REFERENCES expense_categories(id),
    expense_subcategory_id TEXT REFERENCES expense_subcategories(id),
    income_category_id TEXT REFERENCES income_categories(id),
    transaction_tag TEXT,
    notes TEXT,

    -- Recurrence pattern
    frequency TEXT NOT NULL,  -- 'weekly', 'biweekly', or 'monthly'
    day_of_week INTEGER,      -- 0-6 (0=Monday) for weekly/biweekly
    day_of_month INTEGER,     -- 1-31 for monthly

    -- Start and end conditions
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    total_occurrences INTEGER,

    -- Control flags
    is_paused BOOLEAN NOT NULL DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT recurring_templates_category_check CHECK (
        (type = 'expense' AND expense_category_id IS NOT NULL
         AND income_category_id IS NULL AND transaction_tag IS NOT NULL)
        OR
        (type = 'income' AND income_category_id IS NOT NULL
         AND expense_category_id IS NULL)
    ),
    CONSTRAINT recurring_templates_frequency_check CHECK (
        (frequency = 'monthly' AND day_of_month IS NOT NULL AND day_of_week IS NULL)
        OR
        (frequency IN ('weekly', 'biweekly') AND day_of_week IS NOT NULL
         AND day_of_month IS NULL)
    ),
    CONSTRAINT recurring_templates_frequency_values_check CHECK (
        frequency IN ('weekly', 'biweekly', 'monthly')
    ),
    CONSTRAINT recurring_templates_type_check CHECK (
        type IN ('expense', 'income')
    )
);

-- Indexes
CREATE INDEX idx_recurring_templates_user_id ON recurring_templates(user_id);
CREATE INDEX idx_recurring_templates_start_date ON recurring_templates(start_date);
CREATE INDEX idx_recurring_templates_is_paused ON recurring_templates(is_paused);
CREATE INDEX idx_transactions_recurring_template_id ON transactions(recurring_template_id);
```

**Key Points:**

- Templates define the pattern but don't store actual transaction instances
- Supports three frequencies: weekly, biweekly, monthly
- Can end by date (`end_date`) or occurrence count (`total_occurrences`)
- Can be paused without deletion
- Frequency-specific constraints ensure proper day field usage

---

## Recurring Transaction System

The system uses a **Just-In-Time (JIT) Materialization** approach for generating recurring transactions.

### Architecture Pattern

**JIT Materialization** means transactions are created on-demand when data is requested, rather than being pre-generated.

### When Does JIT Materialization Run?

**EXACTLY ONE TRIGGER:** The `GET /transactions/list` endpoint

```http
GET /transactions/list?start_date=2026-01-01T00:00:00Z&end_date=2026-01-31T23:59:59Z
```

**What Triggers JIT:**
- Any client (mobile app, web app, API call) requesting transaction list
- Happens on EVERY request to this endpoint (no caching)
- Runs BEFORE fetching transactions from database

**What Does NOT Trigger JIT:**
- Creating a one-time transaction (`POST /transactions/create-expense` or `/create-income`)
- Creating a recurring template (`POST /recurring-templates/create`)
- Updating a template (`PATCH /recurring-templates/{id}/update`)
- Deleting a template (`DELETE /recurring-templates/{id}/delete`)
- Pausing/resuming a template
- Any other API endpoint

**Why This Design:**
- Ensures transaction list is always up-to-date with current templates
- No background jobs or cron required
- Template changes automatically reflect in next query
- Lazy evaluation - only generates what's needed when needed

**Visual Flow:**

```
┌─────────────────────────────────────────────────────────────┐
│  User/Client Makes Request                                  │
│  GET /transactions/list?start_date=X&end_date=Y            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  list_transactions() handler                                │
│  Location: transaction_routes.py:144                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  *** JIT MATERIALIZATION HAPPENS HERE ***                   │
│  materialization_service.materialize_for_date_range()       │
│  Lines 172-174                                              │
│                                                              │
│  1. Find active templates for user in date range           │
│  2. Calculate expected transaction dates                    │
│  3. Check which transactions already exist                  │
│  4. Create ONLY missing transactions                        │
│  5. Commit if any were created                             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Fetch ALL transactions from database                       │
│  transaction_repo.get_transactions_by_date_range()         │
│  Line 180                                                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Return transactions to client                              │
│  (includes both one-time and materialized recurring)       │
└─────────────────────────────────────────────────────────────┘
```

**Key Insight:** The JIT call at line 172-174 is the ONLY place in the codebase where `materialize_for_date_range()` is invoked. No other endpoint, service, or background job calls it.

### How It Works

#### 1. Template Creation

When a user creates a recurring transaction:

```
User Request → API Endpoint → Validation → RecurringTemplateRepository
                                              ↓
                                    Create template in DB
```

**Location:** [recurring_template_routes.py:146-188](../apps/api/src/routes/recurring_template_routes.py#L146-L188)

#### 2. Transaction Materialization (JIT)

**CRITICAL:** JIT materialization is called from **EXACTLY ONE PLACE** in the entire codebase:

**Endpoint:** `GET /transactions/list`
**Location:** [transaction_routes.py:144-224](../apps/api/src/routes/transaction_routes.py#L144-L224)
**Line:** 172-174

```python
@router.get("/list")
async def list_transactions(
    start_date: datetime = Query(...),
    end_date: datetime = Query(...),
    current_user_id: UUID = Depends(get_current_user_id),
    materialization_service: RecurringMaterializationService = Depends(get_materialization_service),
    session: Session = Depends(get_session),
):
    # Step 1: JIT Materialization happens HERE
    generated_count = materialization_service.materialize_for_date_range(
        session, current_user_id, start_date, end_date
    )

    if generated_count > 0:
        session.commit()

    # Step 2: Fetch all transactions (including newly materialized ones)
    transactions = transaction_repo.get_transactions_by_date_range(
        session, current_user_id, start_date, end_date
    )

    # Step 3: Return to user
    return responses
```

**When JIT Runs:**

- **Trigger:** User calls `GET /transactions/list?start_date=X&end_date=Y`
- **Frequency:** Every time the endpoint is called (no caching)
- **Scope:** Only for the requested date range
- **User-specific:** Only materializes templates for the authenticated user

**What Happens:**

1. **Find Active Templates:** Queries `recurring_templates` table for templates that:
   - Belong to the user (`user_id = current_user_id`)
   - Are not paused (`is_paused = false`)
   - Have start_date ≤ end_date of range
   - Have no end_date OR end_date ≥ start_date of range

2. **Calculate Occurrences:** For each template, calculates all expected transaction dates based on:
   - Frequency (weekly, biweekly, monthly)
   - Day of week/month
   - Start and end dates

3. **Check for Existing Transactions:** For each expected occurrence date, checks if a transaction already exists:
   ```sql
   SELECT * FROM transactions
   WHERE recurring_template_id = template_id
     AND occurred_at BETWEEN date_start AND date_end
   ```

4. **Create Missing Transactions:** Only creates transactions that don't already exist

5. **Commit:** If any transactions were created, commits them to the database

6. **Fetch All:** Retrieves ALL transactions in the date range (both one-time and recurring)

**Idempotency:** Safe to call multiple times - won't create duplicates

### Materialization Logic

#### Monthly Frequency

For templates with `frequency = 'monthly'`:

1. Start from `start_date` month
2. For each month until `end_date` or `total_occurrences`:
   - Use `day_of_month` (clamped to valid range, e.g., 31 → 28 for February)
   - Set time to 9:00 AM UTC
   - Check if transaction already exists for that day
   - Create if missing

**Location:** [recurring_materialization_service.py:99-148](../apps/api/src/services/recurring_materialization_service.py#L99-L148)

#### Weekly/Biweekly Frequency

For templates with `frequency = 'weekly'` or `'biweekly'`:

1. Find first occurrence of `day_of_week` after `start_date`
2. For each week (or 2 weeks for biweekly):
   - Set time to 9:00 AM UTC
   - Check if transaction already exists
   - Create if missing
3. Continue until `end_date` or `total_occurrences` reached

**Location:** [recurring_materialization_service.py:150-194](../apps/api/src/services/recurring_materialization_service.py#L150-L194)

### Duplicate Prevention

The system prevents duplicate transactions by checking for existing transactions on the same day with the same template ID:

```python
def _transaction_exists(session, template_id, occurrence_date):
    start_of_day = occurrence_date at 00:00:00
    end_of_day = occurrence_date at 23:59:59

    SELECT * FROM transactions
    WHERE recurring_template_id = template_id
      AND occurred_at BETWEEN start_of_day AND end_of_day
```

**Location:** [recurring_materialization_service.py:196-215](../apps/api/src/services/recurring_materialization_service.py#L196-L215)

---

## Transaction Creation Flow

### One-Time Transactions

#### Creating an Expense

```
POST /transactions/create-expense
    ↓
1. Extract user_id from JWT token (security)
2. Validate expense_category_id exists
3. Validate transaction_tag is present
4. Validate expense_subcategory_id (if provided)
5. Create Transaction record with:
   - recurring_template_id = NULL
6. Commit to database
7. Return TransactionExpense response
```

**Location:** [transaction_routes.py:42-94](../apps/api/src/routes/transaction_routes.py#L42-L94)

**Service:** [transaction_service.py:25-127](../apps/api/src/services/transaction_service.py#L25-L127)

#### Creating an Income

```
POST /transactions/create-income
    ↓
1. Extract user_id from JWT token (security)
2. Validate income_category_id exists
3. Create Transaction record with:
   - recurring_template_id = NULL
   - transaction_tag = "" (not required for income)
4. Commit to database
5. Return TransactionIncome response
```

**Location:** [transaction_routes.py:96-142](../apps/api/src/routes/transaction_routes.py#L96-L142)

**Service:** [transaction_service.py:129-213](../apps/api/src/services/transaction_service.py#L129-L213)

### Recurring Transactions

Recurring transactions are created in two steps:

#### Step 1: Create Template

```
POST /recurring-templates/create (expense)
POST /recurring-templates/create-income
    ↓
1. Extract user_id from JWT token
2. Validate frequency and day fields match
3. Validate categories exist
4. Create RecurringTemplate record
5. Return template response
```

**No transactions are created yet** - only the template.

**Location:** [recurring_template_routes.py:146-229](../apps/api/src/routes/recurring_template_routes.py#L146-L229)

#### Step 2: Automatic Materialization

When listing transactions, the system automatically materializes instances:

```
GET /transactions/list?start_date=X&end_date=Y
    ↓
1. Materialize recurring transactions for date range (JIT)
   - Find active templates overlapping range
   - Calculate occurrences for each template
   - Create missing transaction instances
2. Fetch all transactions in range
3. Return combined results
```

**Location:** [transaction_routes.py:144-224](../apps/api/src/routes/transaction_routes.py#L144-L224)

---

## API Endpoints

### Transaction Endpoints

#### Create Expense Transaction

```http
POST /transactions/create-expense
Content-Type: application/json
Authorization: Bearer <jwt_token>

{
  "occurred_at": "2026-01-10T12:00:00Z",
  "amount": 50.00,
  "type": "expense",
  "expense_category_id": "groceries",
  "expense_subcategory_id": "produce",
  "transaction_tag": "weekly-shopping",
  "notes": "Farmer's market"
}

Response: 201 Created
{
  "id": "uuid",
  "user_id": "uuid",
  "occurred_at": "2026-01-10T12:00:00Z",
  "created_at": "2026-01-10T12:00:00Z",
  "amount": 50.00,
  "type": "expense",
  "expense_category_id": "groceries",
  "expense_subcategory_id": "produce",
  "transaction_tag": "weekly-shopping",
  "notes": "Farmer's market"
}
```

#### Create Income Transaction

```http
POST /transactions/create-income
Content-Type: application/json
Authorization: Bearer <jwt_token>

{
  "occurred_at": "2026-01-10T12:00:00Z",
  "amount": 5000.00,
  "type": "income",
  "income_category_id": "salary",
  "notes": "January salary"
}

Response: 201 Created
{
  "id": "uuid",
  "user_id": "uuid",
  "occurred_at": "2026-01-10T12:00:00Z",
  "created_at": "2026-01-10T12:00:00Z",
  "amount": 5000.00,
  "type": "income",
  "income_category_id": "salary",
  "notes": "January salary"
}
```

#### List Transactions

```http
GET /transactions/list?start_date=2026-01-01T00:00:00Z&end_date=2026-01-31T23:59:59Z
Authorization: Bearer <jwt_token>

Response: 200 OK
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "occurred_at": "2026-01-10T12:00:00Z",
    "amount": 50.00,
    "type": "expense",
    ...
  },
  ...
]
```

**Note:** This endpoint automatically materializes recurring transactions for the requested date range before returning results.

### Recurring Template Endpoints

#### Create Recurring Expense Template

```http
POST /recurring-templates/create
Content-Type: application/json
Authorization: Bearer <jwt_token>

{
  "amount": 1500.00,
  "type": "expense",
  "expense_category_id": "housing",
  "transaction_tag": "rent",
  "notes": "Monthly rent",
  "frequency": "monthly",
  "day_of_month": 1,
  "start_date": "2026-01-01T00:00:00Z",
  "end_date": null,
  "total_occurrences": null
}

Response: 201 Created
{
  "id": "uuid",
  "user_id": "uuid",
  "amount": 1500.00,
  "type": "expense",
  "frequency": "monthly",
  "day_of_month": 1,
  "is_paused": false,
  ...
}
```

#### Create Recurring Income Template

```http
POST /recurring-templates/create-income
Content-Type: application/json
Authorization: Bearer <jwt_token>

{
  "amount": 5000.00,
  "type": "income",
  "income_category_id": "salary",
  "notes": "Monthly salary",
  "frequency": "monthly",
  "day_of_month": 15,
  "start_date": "2026-01-01T00:00:00Z"
}

Response: 201 Created
```

#### List Recurring Templates

```http
GET /recurring-templates/list?include_paused=false
Authorization: Bearer <jwt_token>

Response: 200 OK
[
  {
    "id": "uuid",
    "amount": 1500.00,
    "frequency": "monthly",
    "is_paused": false,
    ...
  },
  ...
]
```

#### Update Recurring Template

```http
PATCH /recurring-templates/{template_id}/update
Content-Type: application/json
Authorization: Bearer <jwt_token>

{
  "amount": 1600.00,
  "notes": "Rent increased"
}

Response: 200 OK
```

**Note:** Updates only affect the template and future occurrences (not past transactions).

#### Pause/Resume Template

```http
PATCH /recurring-templates/{template_id}/pause
Authorization: Bearer <jwt_token>

Response: 200 OK
```

```http
PATCH /recurring-templates/{template_id}/resume
Authorization: Bearer <jwt_token>

Response: 200 OK
```

#### Delete Template

```http
DELETE /recurring-templates/{template_id}/delete
Authorization: Bearer <jwt_token>

Response: 204 No Content
```

**Note:** Deleting a template sets `recurring_template_id = NULL` on existing transactions (due to `ON DELETE SET NULL`).

---

## Services and Repositories

### Service Layer

#### TransactionService

**Responsibilities:**
- Validate transaction data
- Enforce business rules
- Create one-time transactions
- Type conversion between Pydantic models and SQLAlchemy models

**Location:** [transaction_service.py](../apps/api/src/services/transaction_service.py)

**Key Methods:**
- `create_expense_transaction()` - Validates and creates expense
- `create_income_transaction()` - Validates and creates income

#### RecurringMaterializationService

**Responsibilities:**
- JIT materialization of recurring transactions
- Calculate occurrence dates based on frequency
- Prevent duplicate transactions
- Create transaction instances from templates

**Location:** [recurring_materialization_service.py](../apps/api/src/services/recurring_materialization_service.py)

**Key Methods:**
- `materialize_for_date_range()` - Main entry point for JIT materialization
- `calculate_occurrences()` - Calculates all expected occurrences
- `_calculate_monthly_occurrences()` - Monthly frequency logic
- `_calculate_weekly_occurrences()` - Weekly/biweekly frequency logic
- `_transaction_exists()` - Duplicate detection
- `_create_transaction_from_template()` - Instance creation

#### RecurringTransactionService (Legacy/CLI)

**Responsibilities:**
- Legacy service for cron-based generation
- May be deprecated in favor of JIT approach

**Location:** [recurring_transaction_service.py](../apps/api/src/services/recurring_transaction_service.py)

### Repository Layer

#### TransactionRepository

**Responsibilities:**
- Database operations for transactions
- Category validation
- Date range queries

**Location:** [transaction_repository.py](../apps/api/src/repositories/transaction_repository.py)

**Key Methods:**
- `create_transaction()` - Insert transaction
- `get_transactions_by_date_range()` - Fetch transactions in range
- `category_exists()` - Validate category IDs
- `subcategory_exists()` - Validate subcategory IDs

#### RecurringTemplateRepository

**Responsibilities:**
- CRUD operations for recurring templates
- User-specific queries
- Active template filtering

**Location:** [recurring_template_repository.py](../apps/api/src/repositories/recurring_template_repository.py)

**Key Methods:**
- `create_template()` - Create template
- `get_template()` - Get by ID (with user check)
- `get_user_templates()` - List user's templates
- `get_active_templates_for_date_range()` - Find templates for materialization
- `update_template()` - Update template
- `delete_template()` - Delete template

---

## CLI Tools

### Generate Recurring Transactions

**Purpose:** Legacy CLI script for cron-based generation (may be deprecated).

**Usage:**

```bash
cd /path/to/api
uv run python -m src.cli.generate_recurring_transactions
```

**Cron Example:**

```cron
# Run at midnight on the 1st of every month
0 0 1 * * cd /path/to/api && uv run python -m src.cli.generate_recurring_transactions
```

**Location:** [generate_recurring_transactions.py](../apps/api/src/cli/generate_recurring_transactions.py)

**How It Works:**

1. Gets current month
2. Finds all recurring templates (old pattern: transactions with `is_recurring=true`)
3. Generates transactions for the current month
4. Commits to database

**Note:** With the new JIT materialization approach, this CLI tool may not be necessary for production use.

---

## Key Design Decisions

### 1. JIT Materialization vs Pre-Generation

**Chosen:** JIT Materialization

**Rationale:**
- No cron job dependency
- Transactions appear exactly when needed
- No wasted database storage for far-future transactions
- User changes to templates automatically reflect in future queries
- Simpler deployment (no scheduled jobs to configure)

**Tradeoff:**
- Slight latency on first request for a date range
- Requires materialization logic on every transaction list request

### 2. Separate Tables for Templates and Transactions

**Chosen:** Two tables (`recurring_templates` and `transactions`)

**Rationale:**
- Clear separation of concerns
- Templates can be modified without affecting past transactions
- Easier to query "what are my recurring expenses" vs "what did I spend"
- Foreign key relationship maintains data integrity

**Previous Design:**
- Single table with `is_recurring` flag (deprecated)
- Templates were transactions pointing to themselves

### 3. Soft Delete for Transactions

**Chosen:** `ON DELETE SET NULL` for `recurring_template_id`

**Rationale:**
- Deleting a template doesn't delete historical transactions
- Past transactions remain intact for reporting
- Template link is lost but data is preserved

---

## Migration History

1. **bd66a81ff298** - Add recurring fields to transactions (deprecated approach)
2. **e9a62dba8763** - Create recurring_templates table (current approach)
   - Created `recurring_templates` table
   - Migrated FK from self-reference to new table
   - Removed `is_recurring` and `recurring_day_of_month` from transactions

**Location:** [alembic/versions/](../apps/api/alembic/versions/)

---

## Security Considerations

### Authentication

- All endpoints require JWT authentication
- User ID is extracted from validated token, never from request body
- Repository methods enforce user_id filtering

### Authorization

- Users can only access their own transactions and templates
- All queries filter by `user_id`
- Template operations verify ownership before modification

### Validation

- Category existence validated before creation
- Type-specific constraints enforced at database level
- Frequency and day fields validated for consistency

---

## Future Improvements

### Potential Enhancements

1. **Batch Materialization**
   - Cache materialization results for performance
   - Background job to pre-materialize next month

2. **Template Versioning**
   - Track template changes over time
   - Allow "apply to future only" vs "update all"

3. **Smart Day Handling**
   - "Last day of month" option
   - "Last Friday" type patterns
   - Skip weekends option

4. **Occurrence Tracking**
   - Track which occurrences have been materialized
   - Support skipping specific occurrences

5. **Template Categories**
   - Group templates (e.g., "Bills", "Subscriptions")
   - Bulk operations on groups

---

## Troubleshooting

### Duplicate Transactions

**Symptom:** Multiple transactions for the same recurring template on the same day

**Cause:** Race condition in materialization

**Solution:** Check `_transaction_exists()` uses proper date range filtering

### Missing Transactions

**Symptom:** Expected recurring transaction not appearing

**Possible Causes:**
1. Template is paused (`is_paused = true`)
2. Template `end_date` has passed
3. `total_occurrences` limit reached
4. Date range query doesn't overlap with occurrence

**Debug Steps:**
1. Check template status in `recurring_templates` table
2. Verify `start_date` and `end_date`
3. Check materialization logs
4. Manually call `materialize_for_date_range()` for the date

### Template Updates Not Reflecting

**Symptom:** Changed template amount but old amount still appears

**Cause:** Past transactions already materialized

**Expected Behavior:** Only future occurrences reflect changes (by design)

---

## Appendix

### File Locations

- **Models:** [`apps/api/src/db/models/`](../apps/api/src/db/models/)
  - [`transaction.py`](../apps/api/src/db/models/transaction.py)
  - [`recurring_template.py`](../apps/api/src/db/models/recurring_template.py)

- **Services:** [`apps/api/src/services/`](../apps/api/src/services/)
  - [`transaction_service.py`](../apps/api/src/services/transaction_service.py)
  - [`recurring_materialization_service.py`](../apps/api/src/services/recurring_materialization_service.py)
  - [`recurring_transaction_service.py`](../apps/api/src/services/recurring_transaction_service.py) (legacy)

- **Repositories:** [`apps/api/src/repositories/`](../apps/api/src/repositories/)
  - [`transaction_repository.py`](../apps/api/src/repositories/transaction_repository.py)
  - [`recurring_template_repository.py`](../apps/api/src/repositories/recurring_template_repository.py)

- **Routes:** [`apps/api/src/routes/`](../apps/api/src/routes/)
  - [`transaction_routes.py`](../apps/api/src/routes/transaction_routes.py)
  - [`recurring_template_routes.py`](../apps/api/src/routes/recurring_template_routes.py)

- **CLI:** [`apps/api/src/cli/`](../apps/api/src/cli/)
  - [`generate_recurring_transactions.py`](../apps/api/src/cli/generate_recurring_transactions.py)

- **Migrations:** [`apps/api/alembic/versions/`](../apps/api/alembic/versions/)
  - [`bd66a81ff298_add_recurring_fields_to_transactions.py`](../apps/api/alembic/versions/bd66a81ff298_add_recurring_fields_to_transactions.py)
  - [`e9a62dba8763_create_recurring_templates_table.py`](../apps/api/alembic/versions/e9a62dba8763_create_recurring_templates_table.py)

### Glossary

- **JIT (Just-In-Time):** Creating data on-demand when requested, rather than pre-generating
- **Materialization:** The process of creating concrete transaction instances from templates
- **Template:** A recurring transaction pattern (stored in `recurring_templates`)
- **Instance:** A concrete transaction created from a template (stored in `transactions`)
- **Occurrence:** A single expected instance of a recurring transaction

---

**Last Updated:** 2026-01-10
**Version:** 1.0
**Maintainer:** Backend Team
