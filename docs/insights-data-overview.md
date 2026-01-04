# Insights Plot & Widget Data Overview

This document captures every widget on `apps/mobile/src/features/insights/screens/InsightsScreen.tsx`, the fields each widget consumes, and how we can satisfy those needs with a lean data model. The runtime goal is to expose a backend `MonthSnapshot` payload (see `apps/mobile/src/dummy_data/insights.ts`) per budgeting period so every client can render the same plots without duplicating calculations.

## Widget & Plot Requirements

### 1. Month header & navigation
- **UI:** Month name, date range, logged days counter, previous/next buttons.
- **Required fields:** `snapshot.label`, `snapshot.currentDate`, `snapshot.loggedDays`, `snapshot.totalDays`, ordered month list for paging.
- **Backend notes:** Provide a paginated/month-sorted list of available `MonthSnapshot` objects keyed by ISO month strings so the client can move backward/forward without hard-coding months.

### 2. Budget health widget
- **UI:** Remaining money headline, badge (`On track`, `Tight`, `Over`), total budget vs spent, average spend per logged day, projected daily allowance, "Weekly spending" total, progress bar, and the `lastMonthDelta` annotation.
- **Required fields:** `snapshot.budget`, `snapshot.totalSpent`, `snapshot.loggedDays`, `snapshot.totalDays`, `snapshot.weekly` (aggregate weekly totals), `snapshot.lastMonthDelta`.
- **Derived data:** `remaining = budget - totalSpent`, `averagePerDay = totalSpent / loggedDays`, `perDayAllowance = remaining / (totalDays - loggedDays)`, `remainingPct` for badge thresholds, and running sum of weekly totals.
- **Backend notes:** Only the raw numbers must cross the wire; React Native derives presentation strings. Ensure last-month deltas are available (i.e., send `previous_month_total_spent` or the computed delta).

### 3. Spending donut chart ("Where your money went")
- **UI:** Donut showing share per high-level category, legend split into two columns.
- **Required fields:** Array of `{ id, label, total, percent, color }` ordered by percent, plus the month `snapshot.totalSpent`.
- **Backend notes:** Percent values should already sum to ~100 (client trusts backend). Colors default to the category config but can be overridden per user/plan.

### 4. Savings & investments bar
- **UI:** Two line items (Saved, Invested) plus a stacked progress bar reflecting their share of money allocated to future goals.
- **Required fields:** `snapshot.savings.saved`, `snapshot.savings.invested`, optional deltas for trend copy.
- **Backend notes:** Savings/investment amounts can either be explicit transfers tracked in the transactions dataset or taken from goal-tracking tables. Today they are separate numbers in the snapshot.

### 5. Category breakdown table + subcategory donut
- **UI:** Table with category totals (`total`, `%`, `items`) and, when tapped, an inline panel with a per-category donut + legend for subcategories.
- **Required fields:** Same category array as the donut, but each category also needs `items` (transaction count) and `subcategories?: { id, total, percent, color }[]`.
- **Backend notes:** Maintain consistent ordering with the category config (see `shared/config/spending-categories.json`) so subtotals align with icons/labels. Percentages within each category should sum to 100.

### 6. Weekly spending chart
- **UI:** Bar chart with touch tooltips, axis labels, and a summary total.
- **Required fields:** `snapshot.weekly` array of `{ week: number, label: string, total: number }` with five entries max (weeks inside the month).
- **Derived data:** Axis ticks (`computeAxisTicks`) and tooltip copy are computed inside the component.
- **Backend notes:** Weekly totals can be derived by grouping transactions by `DATE_TRUNC('week', occurred_at)` and trimming to the selected month.

### 7. Recent transactions list
- **UI:** Last five expenses with amount, category/subcategory label, and MMM DD date.
- **Required fields:** `snapshot.transactions[]` sorted DESC by `occurred_at` with `{ amount, categoryId, subcategoryId?, date }`.
- **Backend notes:** Provide enough records for pagination, but the UI currently only shows five. `date` can be an ISO string; the component formats it into the short form.

### 8. FAB + Add spending modal
- **UI:** Floating button that opens quick actions; `AddSpendingModal` (see `apps/mobile/src/components/AddSpendingModal.tsx`) needs category/subcategory metadata.
- **Required fields:** Authoritative category dictionary (id, label, icon, default color, available subcategories). This can be bundled in the same API response or cached client-side with ETags.
- **Backend notes:** Transactions posted from the modal must include `plan_id`, `category_id`, `subcategory_id`, `amount`, `occurred_at`, and optional notes.

## Derived Data Responsibilities

To keep the mobile/web clients thin, the backend should emit a complete `MonthSnapshot`. With only a **budget plan dataset** and a **transactions dataset**, the API can produce that snapshot by:

1. Selecting the active `budget_plan` for the requested user + month (`budget`, `currency`, `goal_days`, `logged_days`).
2. Summing `transactions.amount` for that month to produce `totalSpent`, `weekly` buckets, and `lastMonthDelta` (by also querying the prior month).
3. Aggregating transactions by `category_id` and `subcategory_id` to compute `total`, `percent`, `items`, and sorted subtitle arrays.
4. Applying category metadata (label, icon, default color) from configuration tables before serializing the response.
5. Tagging savings/investment categories or dedicated transaction types to compute `snapshot.savings`.
6. Selecting the latest `n` transactions (limit 5) for the transaction feed.

## Database Structure Proposal

The insight features can run on two core fact tables (budget plans + transactions) supplemented by lightweight dimension tables that mirror the existing JSON category config. Supabase/Postgres friendly typing is assumed.

### `spending_categories`
| column | type | description |
| --- | --- | --- |
| `id` | `text` (PK) | Matches the IDs used in the mobile config (`essentials`, `lifestyle`, …). |
| `label` | `text` | Human-readable name. |
| `icon` | `text` | Optional icon identifier for UI surfaces. |
| `sort_order` | `int` | Controls rendering order. |

### `spending_subcategories`
| column | type | description |
| --- | --- | --- |
| `id` | `text` (PK) | Unique within the table (`groceries`, `housing`, …). |
| `category_id` | `text` (FK → `spending_categories.id`) | Parent category. |
| `label` | `text` | Display label. |
| `sub_color` | `text` | Default HEX color; optional override. |
| `sort_order` | `int` | Controls donut legend order. |

### `budget_plans`
| column | type | description |
| --- | --- | --- |
| `id` | `uuid` (PK) | Unique plan identifier. |
| `user_id` | `uuid` (FK → `profiles.id`) | Owner of the plan. |
| `savings_goal` | `numeric(12,2)` | Target savings amount for the month. |
| `investment_goal` | `numeric(12,2)` | Target investment amount for the month. |
| `created_at/updated_at` | `timestamptz` | Audit columns. |

### `transactions`
| column | type | description |
| --- | --- | --- |
| `id` | `uuid` (PK) | Transaction id. |
| `user_id` | `uuid` (FK → `profiles.id`) | Owner, enabling shared budgets later. |
| `amount` | `numeric(12,2)` | Always positive; `type` defines direction. |
| `type` | `text` | `expense`, `income`|
| `expense_category_id` | `text` (FK → `spending_categories.id`, nullable) | Required for insights. |
| `expense_subcategory_id` | `text` (FK → `spending_subcategories.id`, nullable) | Optional. |
| `income_category_id` | `text` (FK → `income_categories.id`, nullable) | Required for insights. |
| `occurred_at` | `timestamptz` | Transaction timestamp. |
| `notes` | `text` | Free-form memo / merchant. |
| `created_at` | `timestamptz` | Audit column. |
| `transaction_tag` | `text`, nullable | `want`, `need` |
| `category_check` | `CHECK` | `type = 'expense'` => `expense_category_id` NOT NULL and `income_category_id` NULL; `type = 'income'` => `income_category_id` NOT NULL and `expense_category_id` NULL. |

