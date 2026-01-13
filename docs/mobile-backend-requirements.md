# Mobile App Backend Data Requirements

> Comprehensive overview of all data requirements for Reperoo mobile components

**Last Updated:** 2026-01-10
**Version:** 1.0

---

## Table of Contents

1. [Overview](#overview)
2. [Feature Areas](#feature-areas)
3. [Required API Endpoints](#required-api-endpoints)
4. [Data Models](#data-models)
5. [Missing/Required Endpoints](#missingrequired-endpoints)
6. [Performance Considerations](#performance-considerations)

---

## Overview

The Reperoo mobile app is a personal finance management application with four main feature areas:
- **Dashboard (Overview)** - Daily budget tracking and spending status
- **Transactions** - Expense and income management with recurring support
- **Insights** - Budget planning, analytics, and goal tracking
- **Profile** - User preferences and settings

This document outlines all backend data requirements to support these features.

---

## Feature Areas

### 1. Dashboard / Overview Screen

**Location:** [apps/mobile/app/(tabs)/index.tsx](../apps/mobile/app/(tabs)/index.tsx)

#### Data Requirements

| Data Item | Source | Description |
|-----------|--------|-------------|
| Monthly income | `/transactions/list` + filter | Sum of all income transactions for current month |
| Monthly budget plan | User preferences/settings | Projected income, savings goals, investment goals |
| Daily spending totals | `/transactions/list` + aggregation | Total spent per day in current month |
| Today's spending | `/transactions/list` + filter | Amount and count of transactions for today |
| User level/streak | User profile | Gamification data (future feature) |

#### Computed Metrics

```typescript
{
  totalBudget: number;           // From monthly plan
  totalSpent: number;            // Sum of all expenses this month
  remainingBudget: number;       // totalBudget - totalSpent
  daysLeftInMonth: number;       // Calendar calculation
  loggedDays: number;            // Days with at least 1 transaction
  suggestedDailySpend: number;   // remainingBudget / daysLeftInMonth
  averageSpendPerDay: number;    // totalSpent / loggedDays
  status: "on-track" | "attention" | "risk" | "over-budget"
}
```

#### User Actions

- Add expense (one-time) → `POST /transactions/create-expense`
- Add income (one-time) → `POST /transactions/create-income`
- Add recurring expense → `POST /recurring-templates/create-recurring-expense`
- Add recurring income → `POST /recurring-templates/create-recurring-income`

---

### 2. Transactions Screen

**Location:** [apps/mobile/app/(tabs)/transactions.tsx](../apps/mobile/app/(tabs)/transactions.tsx)

#### Data Requirements

**Endpoint:** `GET /transactions/list?start_date={ISO}&end_date={ISO}`

**Transaction Fields Required:**

```typescript
{
  id: string;
  type: "expense" | "income";
  amount: number;
  occurred_at: string;         // ISO8601 datetime
  notes: string | null;

  // For expenses
  expense_category_id?: string;
  expense_subcategory_id?: string | null;
  transaction_tag?: "need" | "want";

  // For income
  income_category_id?: string;

  // Recurring metadata
  is_recurring_instance?: boolean;
  recurring_template_id?: string | null;
}
```

#### Filtering & Sorting Requirements

| Filter Type | Implementation | Backend Support Needed |
|-------------|----------------|------------------------|
| By category | Client-side | Category IDs in response |
| By recurring only | Client-side | `is_recurring_instance` flag |
| By search text | Client-side | Notes and category names |
| By date range | Server-side | `start_date`, `end_date` params |
| Sort by date | Client-side | Return in chronological order |

#### Pagination

- Monthly navigation (current month - 12 months)
- Each month fetches full month of data
- Date range: First day of month 00:00:00 to last day 23:59:59

#### User Actions

| Action | Status | Endpoint Needed |
|--------|--------|-----------------|
| Create expense | ✅ Implemented | `POST /transactions/create-expense` |
| Create income | ✅ Implemented | `POST /transactions/create-income` |
| Edit transaction | ❌ Coming soon | `PATCH /transactions/{id}` |
| Delete transaction | ❌ Coming soon | `DELETE /transactions/{id}` |
| View details | ✅ Read-only | Uses existing list data |

#### Aggregation Needs

```typescript
{
  // Group by date
  transactionsByDate: {
    [dateKey: string]: {
      total: number;
      transactions: Transaction[];
      categoryBreakdown: {
        categoryId: string;
        total: number;
        count: number;
      }[];
    }
  };

  // Overall month totals
  monthTotals: {
    totalExpenses: number;
    totalIncome: number;
    netCashFlow: number;
  };
}
```

---

### 3. Insights Screen

**Location:** [apps/mobile/app/(tabs)/insights.tsx](../apps/mobile/app/(tabs)/insights.tsx)

#### Data Requirements

##### Budget Plan Data

```typescript
{
  monthKey: string;              // "jan-2025"
  projectedIncome: number;       // User's expected income
  savingsGoal: number;           // Target savings amount
  investmentsGoal: number;       // Target investment amount
  paydayDayOfMonth: number;      // 1-31
  paySchedule: "monthly" | "irregular";
}
```

**Endpoint Needed:** `GET /budget-plans/{userId}?month={YYYY-MM}`
**Endpoint Needed:** `POST /budget-plans` or `PUT /budget-plans/{month}`

##### Income Streams

```typescript
{
  id: string;
  type: string;                  // income_category_id
  amount: number;
  date: string;                  // ISO8601
  note: string | null;
  isRecurring: boolean;
  recurringDayOfMonth: number | null;
}
```

**Current:** Fetched from `/transactions/list` and filtered client-side
**Better:** `GET /transactions/list?type=income&start_date={ISO}&end_date={ISO}`

##### Analytics Data

| Metric | Calculation | Data Source |
|--------|-------------|-------------|
| Total spent | Sum all expenses | `/transactions/list` |
| Spending by category | Group expenses by category | `/transactions/list` + aggregation |
| Weekly spending | Daily totals for last 7 days | `/transactions/list` + aggregation |
| Logged days | Count distinct dates with transactions | `/transactions/list` |
| Actual savings | Sum of "Savings" category expenses | `/transactions/list` |
| Actual investments | Sum of "Investments" category | `/transactions/list` |

**Potential New Endpoint:** `GET /analytics/monthly-summary?month={YYYY-MM}`

Response:
```typescript
{
  totalSpent: number;
  totalIncome: number;
  spendingByCategory: {
    categoryId: string;
    categoryName: string;
    total: number;
    percentage: number;
    subcategories: {
      subcategoryId: string;
      subcategoryName: string;
      total: number;
    }[];
  }[];
  weeklyBreakdown: {
    date: string;
    total: number;
    count: number;
  }[];
  loggedDays: number;
  savingsActual: number;
  investmentsActual: number;
}
```

#### User Actions

| Action | Endpoint |
|--------|----------|
| Create/update monthly plan | `PUT /budget-plans/{month}` |
| Add income stream | `POST /transactions/create-income` |
| Edit income | `PATCH /transactions/{id}` (not yet implemented) |
| Delete income | `DELETE /transactions/{id}` (not yet implemented) |
| Set savings goal | Part of budget plan update |
| Set investments goal | Part of budget plan update |

---

### 4. Profile Screen

**Location:** [apps/mobile/app/(tabs)/profile.tsx](../apps/mobile/app/(tabs)/profile.tsx)

#### Data Requirements

```typescript
{
  user_id: string;
  email: string;
  display_name: string | null;
  preferred_currency: string;    // "USD", "EUR", "PHP", etc.
  created_at: string;
  updated_at: string;
}
```

**Endpoint:** `GET /users/profile`
**Endpoint:** `PATCH /users/profile`

#### User Actions

| Action | Endpoint |
|--------|----------|
| Update display name | `PATCH /users/profile` |
| Change currency | `PATCH /users/profile` |
| Reset password | Supabase Auth |
| Log out | Supabase Auth |

---

### 5. Recurring Transaction Support

#### Create Recurring Expense Template

**Endpoint:** `POST /recurring-templates/create-recurring-expense`

```typescript
{
  user_id: string;
  amount: number;
  type: "expense";
  frequency: "monthly" | "weekly" | "biweekly";
  day_of_week: number | null;        // 0-6 for weekly/biweekly
  day_of_month: number | null;       // 1-31 for monthly
  start_date: string;                // ISO8601
  end_date: null;                    // MVP: never ends
  total_occurrences: null;           // MVP: infinite
  transaction_tag: "need" | "want";
  expense_category_id: string;
  expense_subcategory_id: string | null;
  notes: string | null;
}
```

#### Create Recurring Income Template

**Endpoint:** `POST /recurring-templates/create-recurring-income`

```typescript
{
  user_id: string;
  amount: number;
  notes: string | null;
  type: "income";
  income_category_id: string;
  frequency: "monthly" | "weekly" | "biweekly";
  day_of_week: number | null;
  day_of_month: number | null;
  start_date: string;
  end_date: null;
  total_occurrences: null;
}
```

#### Materialization Requirements

When fetching transactions for a date range:
- Backend automatically materializes recurring templates into transaction instances
- Include `is_recurring_instance: true` flag
- Include `recurring_template_id` for reference
- Client can display recurring badge/indicator

**Current Implementation:** Materialization happens server-side in `/transactions/list`

---

## Required API Endpoints

### Current Endpoints (Implemented)

| Method | Endpoint | Purpose | Status |
|--------|----------|---------|--------|
| `POST` | `/transactions/create-expense` | Create one-time expense | ✅ Working |
| `POST` | `/transactions/create-income` | Create one-time income | ✅ Working |
| `GET` | `/transactions/list` | List all transactions with materialization | ✅ Working |
| `POST` | `/recurring-templates/create-recurring-expense` | Create recurring expense template | ✅ Working |
| `POST` | `/recurring-templates/create-recurring-income` | Create recurring income template | ✅ Working |

### Missing Endpoints (Required for Full Functionality)

#### High Priority

| Method | Endpoint | Purpose | Required For |
|--------|----------|---------|--------------|
| `PATCH` | `/transactions/{id}` | Update existing transaction | Edit transactions |
| `DELETE` | `/transactions/{id}` | Delete transaction | Delete transactions |
| `GET` | `/users/profile` | Get user profile data | Profile screen |
| `PATCH` | `/users/profile` | Update user preferences | Settings |
| `GET` | `/budget-plans` | Get monthly budget plan | Insights screen |
| `PUT` | `/budget-plans/{month}` | Create/update monthly plan | Budget planning |

#### Medium Priority

| Method | Endpoint | Purpose | Required For |
|--------|----------|---------|--------------|
| `GET` | `/analytics/monthly-summary` | Pre-computed monthly analytics | Performance optimization |
| `GET` | `/recurring-templates/list` | List all recurring templates | Manage recurring |
| `PATCH` | `/recurring-templates/{id}` | Update recurring template | Edit recurring |
| `DELETE` | `/recurring-templates/{id}` | Delete recurring template | Cancel recurring |
| `GET` | `/transactions/daily-totals` | Daily spending aggregates | Dashboard optimization |

#### Low Priority (Nice to Have)

| Method | Endpoint | Purpose | Required For |
|--------|----------|---------|--------------|
| `GET` | `/analytics/category-breakdown` | Category spending analysis | Advanced insights |
| `GET` | `/analytics/trends` | Spending trends over time | Trend visualization |
| `POST` | `/budget-plans/auto-generate` | AI-suggested budget based on history | Smart budgeting |

---

## Data Models

### Transaction Model

```typescript
type Transaction = {
  id: string;
  user_id: string;
  type: "expense" | "income";
  amount: number;
  occurred_at: string;           // ISO8601 datetime
  notes: string | null;
  created_at: string;
  updated_at: string;

  // Expense-specific fields
  expense_category_id?: string;
  expense_subcategory_id?: string | null;
  transaction_tag?: "need" | "want";

  // Income-specific fields
  income_category_id?: string;

  // Recurring metadata
  is_recurring_instance?: boolean;
  recurring_template_id?: string | null;
};
```

### Recurring Template Model

```typescript
type RecurringTemplate = {
  id: string;
  user_id: string;
  type: "expense" | "income";
  amount: number;
  frequency: "monthly" | "weekly" | "biweekly";
  day_of_week: number | null;    // 0=Sunday, 6=Saturday
  day_of_month: number | null;   // 1-31
  start_date: string;
  end_date: string | null;       // null = never ends
  total_occurrences: number | null;
  notes: string | null;

  // Expense-specific
  expense_category_id?: string;
  expense_subcategory_id?: string | null;
  transaction_tag?: "need" | "want";

  // Income-specific
  income_category_id?: string;

  created_at: string;
  updated_at: string;
  is_active: boolean;
};
```

### Budget Plan Model

```typescript
type BudgetPlan = {
  id: string;
  user_id: string;
  month: string;                 // "2025-01"
  projected_income: number;
  savings_goal: number;
  investments_goal: number;
  payday_day_of_month: number;  // 1-31
  pay_schedule: "monthly" | "irregular";
  created_at: string;
  updated_at: string;
};
```

### User Profile Model

```typescript
type UserProfile = {
  user_id: string;               // Supabase auth user ID
  email: string;
  display_name: string | null;
  preferred_currency: string;    // ISO 4217 code (USD, EUR, PHP, etc.)
  created_at: string;
  updated_at: string;

  // Future fields
  timezone?: string;
  locale?: string;
};
```

---

## Missing/Required Endpoints

### 1. Transaction CRUD (Update & Delete)

#### Update Transaction

```http
PATCH /api/v1/transactions/{id}
```

**Request Body:**
```typescript
{
  amount?: number;
  occurred_at?: string;
  notes?: string;
  expense_category_id?: string;
  expense_subcategory_id?: string;
  transaction_tag?: "need" | "want";
  income_category_id?: string;
}
```

**Response:**
```typescript
{
  transaction: Transaction;
  message: "Transaction updated successfully";
}
```

#### Delete Transaction

```http
DELETE /api/v1/transactions/{id}
```

**Response:**
```typescript
{
  message: "Transaction deleted successfully";
  deleted_id: string;
}
```

**Important:** If deleting a recurring instance, should only delete that instance, not the entire template.

---

### 2. User Profile Management

#### Get Profile

```http
GET /api/v1/users/profile
```

**Response:**
```typescript
{
  user_id: string;
  email: string;
  display_name: string | null;
  preferred_currency: string;
  created_at: string;
  updated_at: string;
}
```

#### Update Profile

```http
PATCH /api/v1/users/profile
```

**Request Body:**
```typescript
{
  display_name?: string;
  preferred_currency?: string;
}
```

**Response:**
```typescript
{
  user: UserProfile;
  message: "Profile updated successfully";
}
```

---

### 3. Budget Plan Management

#### Get Budget Plan

```http
GET /api/v1/budget-plans?month={YYYY-MM}
```

**Response:**
```typescript
{
  budget_plan: BudgetPlan | null;
}
```

**Note:** Returns null if no plan exists for the month.

#### Create/Update Budget Plan

```http
PUT /api/v1/budget-plans/{month}
```

**Request Body:**
```typescript
{
  projected_income: number;
  savings_goal: number;
  investments_goal: number;
  payday_day_of_month: number;
  pay_schedule: "monthly" | "irregular";
}
```

**Response:**
```typescript
{
  budget_plan: BudgetPlan;
  message: "Budget plan saved successfully";
}
```

---

### 4. Recurring Template Management

#### List Templates

```http
GET /api/v1/recurring-templates/list?type={expense|income}&is_active={true|false}
```

**Response:**
```typescript
{
  templates: RecurringTemplate[];
}
```

#### Update Template

```http
PATCH /api/v1/recurring-templates/{id}
```

**Request Body:**
```typescript
{
  amount?: number;
  frequency?: "monthly" | "weekly" | "biweekly";
  day_of_week?: number;
  day_of_month?: number;
  notes?: string;
  is_active?: boolean;
  // ... other updatable fields
}
```

#### Delete/Deactivate Template

```http
DELETE /api/v1/recurring-templates/{id}
```

**Options:**
- Soft delete: Set `is_active = false`
- Hard delete: Remove from database
- Option to also delete all future materialized instances

---

### 5. Analytics Endpoints (Performance Optimization)

#### Monthly Summary

```http
GET /api/v1/analytics/monthly-summary?month={YYYY-MM}
```

**Response:**
```typescript
{
  month: string;
  total_income: number;
  total_expenses: number;
  net_cash_flow: number;

  spending_by_category: {
    category_id: string;
    category_name: string;
    total: number;
    percentage: number;
    subcategories: {
      subcategory_id: string;
      subcategory_name: string;
      total: number;
    }[];
  }[];

  weekly_breakdown: {
    date: string;
    total_spent: number;
    transaction_count: number;
  }[];

  logged_days: number;
  average_daily_spend: number;

  goals: {
    savings_goal: number;
    savings_actual: number;
    investments_goal: number;
    investments_actual: number;
  };
}
```

**Benefits:**
- Reduces client-side computation
- Faster insights screen loading
- Consistent calculations across platforms

#### Daily Totals

```http
GET /api/v1/analytics/daily-totals?start_date={ISO}&end_date={ISO}
```

**Response:**
```typescript
{
  daily_totals: {
    date: string;
    total_spent: number;
    total_income: number;
    transaction_count: number;
  }[];
}
```

**Benefits:**
- Optimizes dashboard calculations
- Reduces payload size (no full transaction details)

---

## Performance Considerations

### 1. Pagination & Caching

**Current Approach:**
- Fetch entire month of transactions at once
- Client-side filtering and sorting

**Recommendations:**
- ✅ Keep monthly fetching (typical user has <100 transactions/month)
- Add HTTP caching headers (`ETag`, `Cache-Control`)
- Consider pagination if users have >500 transactions/month

### 2. Recurring Transaction Materialization

**Current Approach:**
- Backend materializes recurring templates for requested date range
- Returns materialized instances as regular transactions with flags

**Recommendations:**
- ✅ Current approach is good for MVP
- Consider caching materialized instances for common date ranges
- Add index on `recurring_template_id` for faster lookups

### 3. Analytics Pre-computation

**Current Approach:**
- Client fetches all transactions
- Client computes aggregations (category totals, daily totals, etc.)

**Recommendations:**
- For heavy users, add dedicated analytics endpoints
- Pre-compute monthly summaries in background jobs
- Store aggregated data in separate analytics tables

### 4. Real-time Updates

**Current Approach:**
- Manual refresh (pull-to-refresh)
- Refetch after creating/updating transactions

**Future Enhancements:**
- Supabase Realtime subscriptions for live updates
- Optimistic UI updates with rollback on error

---

## Query Parameters & Filtering

### Transactions List Endpoint

```http
GET /api/v1/transactions/list?start_date={ISO}&end_date={ISO}&type={expense|income}&category_id={string}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `start_date` | ISO8601 | Yes | Start of date range (inclusive) |
| `end_date` | ISO8601 | Yes | End of date range (inclusive) |
| `type` | enum | No | Filter by expense or income |
| `category_id` | string | No | Filter by category (expense or income category) |
| `is_recurring` | boolean | No | Filter recurring instances only |
| `limit` | number | No | Max results (default: 1000) |
| `offset` | number | No | Pagination offset (default: 0) |

**Response Headers:**
```
X-Total-Count: 142
X-Has-More: false
```

---

## Security & Authorization

### Authentication

All endpoints require:
- Valid JWT token in `Authorization: Bearer {token}` header
- Token obtained from Supabase Auth

### Authorization

- Users can only access their own data
- Filter all queries by `user_id` from JWT token
- Row-level security policies on Supabase tables

### Validation

#### Amount Validation
- Must be positive number
- Max 2 decimal places
- Max value: 999,999,999.99

#### Date Validation
- Must be valid ISO8601 datetime
- Cannot be in the future (for transactions)
- Recurring start_date can be future

#### Category Validation
- Must reference valid category from `spending-categories.json`
- Subcategory must belong to parent category

---

## Error Handling

### Standard Error Response

```typescript
{
  error: {
    code: string;              // Machine-readable error code
    message: string;           // Human-readable message
    details?: any;             // Additional context
  };
  status: number;              // HTTP status code
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid auth token |
| `FORBIDDEN` | 403 | User not allowed to access resource |
| `NOT_FOUND` | 404 | Transaction/template not found |
| `VALIDATION_ERROR` | 400 | Invalid request body/parameters |
| `DUPLICATE_ERROR` | 409 | Resource already exists |
| `SERVER_ERROR` | 500 | Internal server error |

---

## Next Steps

### Phase 1: Complete CRUD Operations
1. Implement `PATCH /transactions/{id}` for editing transactions
2. Implement `DELETE /transactions/{id}` for deleting transactions
3. Add update/delete support for recurring templates

### Phase 2: User Profile & Preferences
1. Create user profile table in database
2. Implement `GET /users/profile` and `PATCH /users/profile`
3. Store currency preference in user metadata

### Phase 3: Budget Planning
1. Create budget_plans table
2. Implement `GET /budget-plans` and `PUT /budget-plans/{month}`
3. Link budget plan to insights calculations

### Phase 4: Analytics Optimization
1. Design analytics data model
2. Implement `/analytics/monthly-summary` endpoint
3. Add background jobs for pre-computation
4. Add caching layer for frequently accessed analytics

### Phase 5: Advanced Features
1. Category customization (user-defined categories)
2. Multi-currency support with exchange rates
3. Budget alerts and notifications
4. Export functionality (CSV, PDF reports)

---

## Appendix

### Category Configuration

Categories are currently stored in static config:
[shared/config/spending-categories.json](../shared/config/spending-categories.json)

**Categories:**
- Essentials (housing, groceries, utilities, transportation, healthcare, insurance)
- Lifestyle (dining, entertainment, shopping, hobbies, subscriptions, travel)
- Personal (education, fitness, pets, gifts, personal-care)
- Savings
- Investments
- Other

**Future:** Allow users to customize categories via API.

### Income Categories

Currently hardcoded in modal:
- Salary
- Freelance
- Investment
- Business
- Gift
- Other

**Future:** Store in database, allow customization.

---

## Questions for Discussion

1. **Budget Plan Storage**: Should budget plans be stored per-user-per-month, or should we have a default plan that applies to all months unless overridden?

2. **Recurring Template Updates**: When updating a recurring template, should we:
   - Update future materialized instances automatically?
   - Leave past instances unchanged?
   - Provide options for both?

3. **Analytics Caching**: What's the acceptable staleness for analytics data? Real-time vs. 5-minute cache vs. daily batch?

4. **Category Management**: Should categories be:
   - System-wide (all users share same categories)?
   - User-customizable?
   - Hybrid (system defaults + user additions)?

5. **Currency Handling**: Should we:
   - Store all amounts in a base currency (USD)?
   - Store in user's preferred currency?
   - Support multi-currency transactions with exchange rates?

---

**Document maintained by:** Development Team
**Questions or feedback:** Create an issue in the GitHub repository
