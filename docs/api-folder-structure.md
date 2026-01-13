# API Folder Structure Guide

> **Quick Start for New Developers**: This guide explains the folder structure of the Reperoo API, what each folder contains, and where to add new code.

---

## Table of Contents

- [Overview](#overview)
- [Root Directory Structure](#root-directory-structure)
- [Detailed Folder Breakdown](#detailed-folder-breakdown)
  - [src/](#src)
  - [alembic/](#alembic)
  - [tests/](#tests)
- [Architecture Pattern](#architecture-pattern)
- [Where to Add New Code](#where-to-add-new-code)
- [Common Development Tasks](#common-development-tasks)
- [File Naming Conventions](#file-naming-conventions)

---

## Overview

The Reperoo API follows a **layered architecture** pattern with clear separation of concerns:

```
┌─────────────────────────────────────────────┐
│  Routes (HTTP Layer)                         │  ← API endpoints
├─────────────────────────────────────────────┤
│  Services (Business Logic)                   │  ← Business rules & validation
├─────────────────────────────────────────────┤
│  Repositories (Data Access)                  │  ← Database queries
├─────────────────────────────────────────────┤
│  Models (Data Structures)                    │  ← SQLAlchemy & Pydantic models
├─────────────────────────────────────────────┤
│  Database (PostgreSQL via Supabase)         │  ← Data persistence
└─────────────────────────────────────────────┘
```

**Technology Stack:**
- **Framework**: FastAPI 0.116
- **Database**: PostgreSQL (Supabase)
- **ORM**: SQLAlchemy 2.0
- **Validation**: Pydantic v2
- **Migrations**: Alembic
- **Package Manager**: uv
- **Python Version**: 3.13

---

## Root Directory Structure

```
apps/api/
├── alembic/                    # Database migrations
│   ├── versions/              # Migration scripts
│   └── env.py                 # Alembic configuration
├── src/                        # Application source code
│   ├── cli/                   # Command-line scripts
│   ├── core/                  # Core utilities & config
│   ├── db/                    # Database layer
│   ├── models/                # Pydantic models (API contracts)
│   ├── repositories/          # Data access layer
│   ├── routes/                # API endpoints
│   ├── services/              # Business logic layer
│   ├── main.py               # FastAPI app entry point
│   └── __init__.py
├── tests/                      # Test suite
│   ├── core/                  # Core utility tests
│   ├── integration/           # Integration tests
│   └── repositories/          # Repository tests
├── .env.local                 # Local environment variables (not in git)
├── .gitignore
├── .python-version            # Python version (3.13)
├── alembic.ini                # Alembic configuration
├── cloudbuild.yaml            # Cloud Build config
├── Dockerfile                 # Container definition
├── pyproject.toml             # uv dependencies
├── pytest.ini                 # Pytest configuration
├── README.md                  # API documentation
└── uv.lock                    # Dependency lock file
```

---

## Detailed Folder Breakdown

### src/

The main application source code directory.

```
src/
├── main.py                    # FastAPI application entry point
├── test_main.py              # Main app tests
└── __init__.py
```

#### **main.py**
- **Purpose**: Creates and configures the FastAPI application
- **Contains**:
  - FastAPI app initialization
  - CORS middleware configuration
  - Router registration
  - Root endpoint
- **Example**:
  ```python
  from fastapi import FastAPI
  from src.routes import router

  app = FastAPI(title="Reperoo API")
  app.include_router(router)
  ```

---

### src/routes/

**Purpose**: HTTP endpoint definitions (controllers/handlers)

```
src/routes/
├── __init__.py
├── router.py                  # Main router that aggregates all routes
├── auth_routes.py             # Authentication endpoints
├── budget_plan_routes.py      # Budget plan endpoints
├── health.py                  # Health check endpoint
├── recurring_template_routes.py  # Recurring transaction template endpoints
└── transaction_routes.py      # Transaction endpoints
```

#### What goes here?
- **API endpoint definitions** using FastAPI's `@router` decorator
- **Request/response handling**
- **Input validation** (via Pydantic models)
- **Authentication/authorization** checks (JWT token verification)
- **Dependency injection** (database sessions, services)

#### What does NOT go here?
- ❌ Business logic (goes in services/)
- ❌ Database queries (goes in repositories/)
- ❌ Data validation logic (goes in services/)
- ❌ Complex calculations (goes in services/)

#### Example Structure:
```python
from fastapi import APIRouter, Depends, HTTPException
from src.services.transaction_service import TransactionService
from src.core.auth import get_current_user_id

router = APIRouter(prefix="/transactions", tags=["transactions"])

@router.post("/create-expense")
async def create_expense(
    data: CreateExpenseRequest,
    user_id: UUID = Depends(get_current_user_id),
    service: TransactionService = Depends()
):
    """Creates a new expense transaction"""
    return service.create_expense(user_id, data)
```

#### File Naming:
- `{feature}_routes.py` - Feature-specific routes (e.g., `transaction_routes.py`)
- `health.py` - Health check endpoint
- `router.py` - Main router aggregator

---

### src/services/

**Purpose**: Business logic and domain rules

```
src/services/
├── __init__.py
├── auth_service.py                      # Authentication logic
├── budget_plan_service.py               # Budget plan business logic
├── errors.py                            # Custom error classes
├── recurring_materialization_service.py # JIT transaction materialization
├── recurring_transaction_service.py     # Recurring transaction logic (legacy)
└── transaction_service.py               # Transaction business logic
```

#### What goes here?
- ✅ **Business rules and validation**
- ✅ **Complex calculations**
- ✅ **Data transformation** (DB models ↔ Pydantic models)
- ✅ **Multi-step operations** that span multiple repositories
- ✅ **Domain-specific logic**

#### What does NOT go here?
- ❌ HTTP request/response handling (goes in routes/)
- ❌ Raw SQL queries (goes in repositories/)
- ❌ Database model definitions (goes in db/models/)

#### Example Structure:
```python
from src.repositories.transaction_repository import TransactionRepository

class TransactionService:
    def __init__(self, repo: TransactionRepository):
        self.repo = repo

    def create_expense(self, user_id: UUID, data: CreateExpenseRequest):
        # 1. Validate business rules
        if data.amount <= 0:
            raise ValueError("Amount must be positive")

        # 2. Check category exists
        if not self.repo.category_exists(data.expense_category_id):
            raise ValueError("Invalid category")

        # 3. Transform and create
        transaction = self.repo.create_transaction(user_id, data)
        return transaction
```

#### Key Services:
- **transaction_service.py**: Validates and creates one-time transactions
- **recurring_materialization_service.py**: JIT materialization of recurring transactions (critical component)
- **budget_plan_service.py**: Budget plan calculations and validation
- **auth_service.py**: User authentication and token validation

---

### src/repositories/

**Purpose**: Data access layer (database operations)

```
src/repositories/
├── __init__.py
├── budget_plan_repository.py          # Budget plan data access
├── profile_repository.py              # User profile data access
├── recurring_template_repository.py   # Recurring template data access
└── transaction_repository.py          # Transaction data access
```

#### What goes here?
- ✅ **SQLAlchemy queries**
- ✅ **CRUD operations** (Create, Read, Update, Delete)
- ✅ **Database-specific logic** (joins, filters, aggregations)
- ✅ **Raw SQL queries** (when needed)

#### What does NOT go here?
- ❌ Business logic (goes in services/)
- ❌ HTTP request handling (goes in routes/)
- ❌ Data validation (goes in services/)

#### Example Structure:
```python
from sqlalchemy.orm import Session
from src.db.models import Transaction

class TransactionRepository:
    def create_transaction(
        self,
        session: Session,
        user_id: UUID,
        data: dict
    ) -> Transaction:
        """Creates a new transaction in the database"""
        transaction = Transaction(user_id=user_id, **data)
        session.add(transaction)
        session.flush()
        return transaction

    def get_transactions_by_date_range(
        self,
        session: Session,
        user_id: UUID,
        start_date: datetime,
        end_date: datetime
    ) -> list[Transaction]:
        """Fetches transactions within a date range"""
        return session.query(Transaction).filter(
            Transaction.user_id == user_id,
            Transaction.occurred_at.between(start_date, end_date)
        ).all()
```

#### File Naming:
- `{entity}_repository.py` - One repository per database entity

---

### src/models/

**Purpose**: Pydantic models for API contracts (request/response validation)

```
src/models/
├── model.py                           # Auto-generated from OpenAPI spec
└── recurring_template_models.py      # Custom recurring template models
```

#### What goes here?
- ✅ **Pydantic models** for API request/response validation
- ✅ **Data Transfer Objects (DTOs)**
- ✅ **API contract definitions**

#### What does NOT go here?
- ❌ Database models (goes in db/models/)
- ❌ Business logic (goes in services/)

#### Key Points:
- **model.py** is **auto-generated** from `packages/openapi/api.yaml`
- Run `make generate-api` to regenerate from OpenAPI spec
- **Do not manually edit model.py** - changes will be overwritten
- Add custom models in separate files (e.g., `recurring_template_models.py`)

#### Example Structure:
```python
from pydantic import BaseModel, Field
from datetime import datetime
from decimal import Decimal

class CreateExpenseRequest(BaseModel):
    occurred_at: datetime
    amount: Decimal = Field(gt=0)
    expense_category_id: str
    transaction_tag: str
    notes: str | None = None

class TransactionResponse(BaseModel):
    id: UUID
    user_id: UUID
    occurred_at: datetime
    amount: Decimal
    type: str
```

---

### src/db/

**Purpose**: Database layer (SQLAlchemy models and configuration)

```
src/db/
├── models/                    # SQLAlchemy models
│   ├── utils/                # Model utilities
│   │   ├── __init__.py
│   │   └── mixins.py        # Reusable model mixins
│   ├── __init__.py
│   ├── budget_plan.py       # Budget plan model
│   ├── expense_category.py  # Expense category model
│   ├── expense_subcategory.py  # Expense subcategory model
│   ├── income_category.py   # Income category model
│   ├── profile.py           # User profile model
│   ├── recurring_template.py  # Recurring template model
│   └── transaction.py       # Transaction model
├── __init__.py
└── base.py                   # SQLAlchemy base class
```

#### src/db/models/

**Purpose**: SQLAlchemy ORM models (database table definitions)

#### What goes here?
- ✅ **SQLAlchemy model classes** (tables)
- ✅ **Column definitions**
- ✅ **Relationships** between models
- ✅ **Database constraints**
- ✅ **Indexes**

#### What does NOT go here?
- ❌ Business logic (goes in services/)
- ❌ Data validation (goes in services/)
- ❌ API models (goes in models/)

#### Example Structure:
```python
from sqlalchemy import Column, String, TIMESTAMP, Numeric, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from src.db.base import Base

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False)
    occurred_at = Column(TIMESTAMP(timezone=True), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    type = Column(String, nullable=False)  # 'expense' or 'income'
    notes = Column(String)

    # Relationships
    profile = relationship("Profile", back_populates="transactions")
```

#### Key Models:
- **transaction.py**: Financial transactions (expenses and income)
- **recurring_template.py**: Templates for recurring transactions
- **budget_plan.py**: User budget plans
- **profile.py**: User profiles
- **expense_category.py**: Expense categories
- **income_category.py**: Income categories

#### File Naming:
- `{entity}.py` - One file per database table (singular, lowercase with underscores)

---

### src/core/

**Purpose**: Core utilities, configuration, and shared dependencies

```
src/core/
├── __init__.py
├── auth.py                   # JWT authentication utilities
├── database.py               # Database session management
├── secrets.py                # Environment variable loading
└── supabase.py               # Supabase client configuration
```

#### What goes here?
- ✅ **Configuration loading** (environment variables)
- ✅ **Authentication/authorization utilities**
- ✅ **Database session management**
- ✅ **Shared dependencies** (FastAPI Depends)
- ✅ **Middleware configuration**
- ✅ **External service clients** (Supabase)

#### Key Files:

##### **database.py**
- SQLAlchemy engine and session factory
- `get_session()` dependency for routes
- Connection pool configuration

##### **auth.py**
- JWT token verification
- `get_current_user_id()` dependency
- User authentication logic

##### **secrets.py**
- Environment variable loading
- Secrets management (DATABASE_URL, SUPABASE_URL, etc.)

##### **supabase.py**
- Supabase client initialization
- Service role key configuration

---

### src/cli/

**Purpose**: Command-line scripts and utilities

```
src/cli/
└── generate_recurring_transactions.py  # Legacy cron script for recurring transactions
```

#### What goes here?
- ✅ **CLI scripts** for maintenance tasks
- ✅ **Data migration scripts**
- ✅ **Batch processing scripts**
- ✅ **Admin utilities**

#### Current Scripts:
- **generate_recurring_transactions.py**: Legacy script for cron-based recurring transaction generation (may be deprecated in favor of JIT materialization)

#### Running CLI Scripts:
```bash
cd apps/api
uv run python -m src.cli.generate_recurring_transactions
```

---

### alembic/

**Purpose**: Database migration management

```
alembic/
├── versions/                  # Migration scripts
│   ├── 31d37cdd3d6c_init.py
│   ├── c637ba4a0636_add_transactions_table.py
│   ├── bd66a81ff298_add_recurring_fields_to_transactions.py
│   ├── e9a62dba8763_create_recurring_templates_table.py
│   └── ...                    # More migration files
└── env.py                     # Alembic environment configuration
```

#### What goes here?
- ✅ **Database migration scripts** (auto-generated by Alembic)
- ✅ **Schema change history**

#### How migrations work:
1. **Create new migration**:
   ```bash
   uv run --env-file .env.local alembic revision --autogenerate -m "add new table"
   ```

2. **Apply migrations**:
   ```bash
   uv run --env-file .env.local alembic upgrade head
   ```

3. **Rollback migrations**:
   ```bash
   uv run --env-file .env.local alembic downgrade -1
   ```

#### Migration Naming Convention:
- Format: `{hash}_{description}.py`
- Example: `e9a62dba8763_create_recurring_templates_table.py`

#### Key Points:
- **Never edit applied migrations** - create new ones instead
- **Always review auto-generated migrations** before applying
- **Test migrations on dev before production**
- Migrations run automatically in CI/CD before deployments

---

### tests/

**Purpose**: Test suite

```
tests/
├── core/                      # Core utility tests
│   └── test_database.py
├── integration/               # Integration tests
│   ├── conftest.py           # Shared test fixtures
│   ├── test_auth_routes.py
│   └── test_transaction_routes.py
└── repositories/              # Repository tests
    └── test_profile_repository.py
```

#### Test Types:

##### **Unit Tests** (default)
- Run with: `uv run pytest`
- Test individual functions/methods in isolation
- No database required (use mocks)

##### **Integration Tests**
- Run with: `uv run pytest -m integration`
- Test full request/response cycles
- Require database connection (Supabase dev instance)

#### What goes here?
- ✅ **Unit tests** for services, repositories, utilities
- ✅ **Integration tests** for API endpoints
- ✅ **Test fixtures and utilities** in `conftest.py`

#### File Naming:
- `test_{module_name}.py` - Mirror the src/ structure
- Example: `src/services/transaction_service.py` → `tests/services/test_transaction_service.py`

---

## Architecture Pattern

### Layer Responsibilities

```
┌─────────────────────────────────────────────────────────────┐
│  ROUTES LAYER (src/routes/)                                 │
│  - Handle HTTP requests/responses                           │
│  - Extract user ID from JWT token                          │
│  - Call services                                            │
│  - Return API responses                                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  SERVICES LAYER (src/services/)                             │
│  - Validate business rules                                  │
│  - Perform complex calculations                             │
│  - Coordinate multiple repositories                         │
│  - Transform data between layers                            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  REPOSITORIES LAYER (src/repositories/)                     │
│  - Execute database queries                                 │
│  - Handle CRUD operations                                   │
│  - Return SQLAlchemy models                                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  DATABASE LAYER (src/db/models/)                            │
│  - Define table schemas                                     │
│  - Define relationships                                     │
│  - Define constraints                                       │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow Example: Creating a Transaction

```
1. User Request
   POST /transactions/create-expense
   Body: { amount: 100, category: "groceries", ... }
        │
        ▼
2. Route Handler (transaction_routes.py:42)
   - Extract user_id from JWT token
   - Validate request body (Pydantic)
   - Call service.create_expense()
        │
        ▼
3. Service (transaction_service.py:25)
   - Validate amount > 0
   - Check category exists (via repository)
   - Validate transaction_tag present for expenses
   - Call repository.create_transaction()
        │
        ▼
4. Repository (transaction_repository.py:15)
   - Create SQLAlchemy Transaction model
   - session.add(transaction)
   - session.flush()
   - Return Transaction object
        │
        ▼
5. Service (continued)
   - Convert SQLAlchemy model → Pydantic model
   - Return TransactionExpense
        │
        ▼
6. Route Handler (continued)
   - Return 201 Created
   - Response: TransactionExpense JSON
```

---

## Where to Add New Code

### Adding a New Feature (e.g., "Categories")

Follow these steps:

#### 1. Create Database Model
**File**: `src/db/models/category.py`
```python
from sqlalchemy import Column, String
from src.db.base import Base

class Category(Base):
    __tablename__ = "categories"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
```

#### 2. Create Migration
```bash
uv run --env-file .env.local alembic revision --autogenerate -m "add categories table"
uv run --env-file .env.local alembic upgrade head
```

#### 3. Create Repository
**File**: `src/repositories/category_repository.py`
```python
from sqlalchemy.orm import Session
from src.db.models.category import Category

class CategoryRepository:
    def get_all(self, session: Session) -> list[Category]:
        return session.query(Category).all()
```

#### 4. Create Service
**File**: `src/services/category_service.py`
```python
from src.repositories.category_repository import CategoryRepository

class CategoryService:
    def __init__(self, repo: CategoryRepository):
        self.repo = repo

    def list_categories(self, session):
        return self.repo.get_all(session)
```

#### 5. Create Route
**File**: `src/routes/category_routes.py`
```python
from fastapi import APIRouter, Depends
from src.services.category_service import CategoryService

router = APIRouter(prefix="/categories", tags=["categories"])

@router.get("/")
def list_categories(service: CategoryService = Depends()):
    return service.list_categories()
```

#### 6. Register Route
**File**: `src/routes/router.py`
```python
from src.routes import category_routes

router.include_router(category_routes.router)
```

#### 7. Add Pydantic Models (if needed)
**File**: `packages/openapi/api.yaml`
- Add to OpenAPI spec
- Run `make generate-api` to generate Pydantic models

#### 8. Write Tests
**File**: `tests/integration/test_category_routes.py`
```python
def test_list_categories(client):
    response = client.get("/categories/")
    assert response.status_code == 200
```

---

## Common Development Tasks

### Adding a New API Endpoint

1. **Define endpoint in route file**
   - `src/routes/{feature}_routes.py`

2. **Implement business logic in service**
   - `src/services/{feature}_service.py`

3. **Add database operations in repository**
   - `src/repositories/{feature}_repository.py`

4. **Update OpenAPI spec** (if needed)
   - `packages/openapi/api.yaml`
   - Run `make generate-api`

5. **Write tests**
   - `tests/integration/test_{feature}_routes.py`

### Adding a New Database Table

1. **Create SQLAlchemy model**
   - `src/db/models/{table_name}.py`

2. **Generate migration**
   ```bash
   uv run --env-file .env.local alembic revision --autogenerate -m "description"
   ```

3. **Review and apply migration**
   ```bash
   uv run --env-file .env.local alembic upgrade head
   ```

4. **Create repository**
   - `src/repositories/{table_name}_repository.py`

### Modifying an Existing Table

1. **Update SQLAlchemy model**
   - `src/db/models/{table_name}.py`

2. **Generate migration**
   ```bash
   uv run --env-file .env.local alembic revision --autogenerate -m "add column xyz"
   ```

3. **Review migration** - check for data loss
   - `alembic/versions/{hash}_add_column_xyz.py`

4. **Apply migration**
   ```bash
   uv run --env-file .env.local alembic upgrade head
   ```

### Adding Business Logic

- **Always add to services/**, never in routes or repositories
- Services coordinate multiple repositories
- Services validate business rules

### Adding Database Query

- **Always add to repositories/**, never in routes or services
- One method per query
- Return SQLAlchemy models

---

## File Naming Conventions

### Python Files

| Type | Convention | Example |
|------|------------|---------|
| Routes | `{feature}_routes.py` | `transaction_routes.py` |
| Services | `{feature}_service.py` | `transaction_service.py` |
| Repositories | `{entity}_repository.py` | `transaction_repository.py` |
| DB Models | `{table_name}.py` (singular) | `transaction.py` |
| Pydantic Models | `{feature}_models.py` or `model.py` | `recurring_template_models.py` |
| Tests | `test_{module}.py` | `test_transaction_service.py` |
| CLI Scripts | `{action}_{object}.py` | `generate_recurring_transactions.py` |

### Migrations

- **Format**: `{hash}_{description}.py`
- **Example**: `e9a62dba8763_create_recurring_templates_table.py`
- **Description**: Use snake_case, be specific

### Classes

| Type | Convention | Example |
|------|------------|---------|
| DB Models | PascalCase (singular) | `Transaction`, `RecurringTemplate` |
| Services | PascalCase + "Service" | `TransactionService` |
| Repositories | PascalCase + "Repository" | `TransactionRepository` |
| Pydantic Models | PascalCase | `CreateExpenseRequest` |

### Variables and Functions

- **snake_case**: `user_id`, `create_transaction()`
- **SCREAMING_SNAKE_CASE**: Constants like `DATABASE_URL`

---

## Quick Reference: What Goes Where?

| I want to... | Add it to... |
|--------------|--------------|
| Add a new API endpoint | `src/routes/{feature}_routes.py` |
| Add business logic | `src/services/{feature}_service.py` |
| Add a database query | `src/repositories/{entity}_repository.py` |
| Add a database table | `src/db/models/{table}.py` + migration |
| Add validation logic | `src/services/{feature}_service.py` |
| Add request/response model | `packages/openapi/api.yaml` |
| Add a CLI script | `src/cli/{script_name}.py` |
| Add authentication logic | `src/core/auth.py` |
| Add configuration | `src/core/secrets.py` or `.env.local` |
| Add a test | `tests/{type}/test_{module}.py` |

---

## Related Documentation

- **Backend Architecture**: [docs/backend-architecture.md](./backend-architecture.md) - Deep dive into recurring transactions, JIT materialization, and system design
- **API README**: [apps/api/README.md](../apps/api/README.md) - Setup, environment variables, and development tasks
- **Root README**: [README.md](../README.md) - Overall project structure

---

## Getting Help

- **OpenAPI Docs**: http://localhost:8080/docs (when running locally)
- **Database Schema**: Check `src/db/models/` or run `uv run --env-file .env.local alembic current`
- **Migration History**: Check `alembic/versions/` folder

---

**Last Updated**: 2026-01-13
**Version**: 1.0
**Maintainer**: Backend Team
