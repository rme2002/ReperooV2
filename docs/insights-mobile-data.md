# Insights Mobile Data Contract

This document describes the exact data required by the mobile insights screen and the API payloads that supply it.

Sources:
- UI usage: `apps/mobile/components/insights/screens/InsightsScreen.tsx`
- API models: `apps/api/src/models/model.py`
- Endpoints: `apps/api/src/routes/insights_routes.py`, `packages/openapi/api.yaml`

## UI Data Requirements (Insights Screen)

The screen renders one month snapshot at a time and a list of available months for navigation.

### Month navigation/header
- `snapshot.label`
- `snapshot.loggedDays`
- `snapshot.totalDays`
- Available months list for prev/next navigation

### Budget health widget
- `snapshot.budget`
- `snapshot.totalSpent`
- `snapshot.loggedDays`
- `snapshot.totalDays`
- `snapshot.weekly[]` (weekly totals are summed)
- `snapshot.lastMonthDelta`

### Spending donut + legend
- `snapshot.totalSpent`
- `snapshot.categories[]` with `id`, `percent`, `color`

### Savings & investments
- `snapshot.savings.saved`
- `snapshot.savings.invested`

### Category breakdown table + subcategory donut
- `snapshot.categories[]` with `id`, `total`, `percent`, `items`, `color`
- `snapshot.categories[].subcategories[]` with `id`, `total`, `percent`, `color`

### Weekly spending chart
- `snapshot.weekly[]` with `week`, `label`, `total`

### Recent transactions
- `snapshot.transactions[]` with `amount`, `categoryId`, `subcategoryId`, `date`

Notes:
- Category/subcategory labels are resolved client-side from `shared/config/spending-categories.json`.
- Category/subcategory colors come from the API (persisted in DB) and are used directly in charts.

## Endpoints

### GET /api/v1/insights/month-snapshot
- Query params: `year` (2000-2100), `month` (1-12)
- Response: `MonthSnapshot`
- Errors: 400, 401, 404 (no budget plan or no data), 500

### GET /api/v1/insights/available-months
- Response: `AvailableMonth[]` (most recent first)
- Errors: 401, 500

## Schemas

### AvailableMonth
```json
{
  "key": "dec-2025",
  "label": "December 2025",
  "year": 2025,
  "month": 12
}
```

### MonthSnapshot
```json
{
  "key": "dec-2025",
  "label": "December 2025",
  "currentDate": "2025-12-06T00:00:00Z",
  "loggedDays": 12,
  "totalDays": 31,
  "totalSpent": 756.0,
  "budget": 1200.0,
  "lastMonthDelta": 0.12,
  "categories": [
    {
      "id": "essentials",
      "total": 320.0,
      "percent": 42.0,
      "items": 18,
      "color": "#f59a3e",
      "subcategories": [
        {
          "id": "groceries",
          "total": 160.5,
          "percent": 50.0,
          "color": "#f7b267"
        }
      ]
    }
  ],
  "savings": {
    "saved": 120.0,
    "invested": 85.0,
    "savedDelta": 0.08,
    "investedDelta": 0.05
  },
  "weekly": [
    {
      "week": 1,
      "label": "Week 1",
      "total": 180.5
    }
  ],
  "transactions": [
    {
      "amount": 42.5,
      "categoryId": "essentials",
      "subcategoryId": "groceries",
      "date": "2025-12-04T00:00:00Z"
    }
  ]
}
```

### Field Notes
- `lastMonthDelta` is a decimal ratio (e.g., 0.12 = 12% increase, -0.2 = 20% decrease).
- `weekly` is always filled for every week in the month (week 1..N) with zero totals where needed.
- `transactions` is currently limited to 5 most recent expenses for the month.
- `budget` is derived from income transactions for the month in `InsightsService`.
