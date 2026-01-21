# Dummy Data Migration Guide

## Current Status

### ✅ Completed Migrations

The following data has been successfully migrated from dummy data to real API endpoints:

| Field | Old Source | New Source | Status |
|-------|-----------|------------|--------|
| `streakDays` | `profileOverview` | `ExperienceProvider` | ✅ Complete |
| `level` | `profileOverview` | `ExperienceProvider` | ✅ Complete |
| `xp` / `currentXP` | `profileOverview` | `ExperienceProvider` | ✅ Complete |
| `xpMax` / `maxXP` | `profileOverview` | `ExperienceProvider` | ✅ Complete |
| `rooStage` / `evolutionStage` | `profileOverview` | `ExperienceProvider` | ✅ Complete |
| `monthlyRemaining` | `profileOverview` | `BudgetProvider + InsightsProvider` | ✅ Complete |
| `monthlyBudget` | `profileOverview` | `BudgetProvider + InsightsProvider` | ✅ Complete |

### ⚠️ Still Using Dummy Data

The following fields are still using dummy data and need to be replaced:

| Field | Current Value | Used In | Action Needed |
|-------|--------------|---------|---------------|
| `todayAmount` | `12.7` | Streak card "logged today" | Add today's transaction summary endpoint |
| `todayItems` | `2` | "Logged X items today" | Add today's transaction count endpoint |
| `hasLoggedToday` | `true` | Conditional message display | Add today's activity check endpoint |

## Migration Steps

### Step 1: Create Today's Transaction Summary Endpoint

**Backend:** `apps/api/src/routes/transaction_routes.py`

Add new endpoint:
```python
@router.get("/today-summary", status_code=status.HTTP_200_OK)
async def get_today_summary(
    current_user_id: UUID = Depends(get_current_user_id),
    session: Session = Depends(get_session),
) -> TodayTransactionSummary:
    """
    Get summary of today's transactions.

    Returns:
        - total_amount: Sum of all transactions today
        - transaction_count: Number of transactions today
        - has_logged_today: Whether user logged any transactions today
    """
    pass
```

**Model:** `packages/openapi/api.yaml`

Add schema:
```yaml
TodayTransactionSummary:
  type: object
  properties:
    total_amount:
      type: number
      format: float
      description: Total amount of transactions today
    transaction_count:
      type: integer
      description: Number of transactions logged today
    has_logged_today:
      type: boolean
      description: Whether user has logged any transactions today
  required:
    - total_amount
    - transaction_count
    - has_logged_today
```

### Step 2: Generate TypeScript Client

```bash
cd apps/mobile
npm run generate-client
```

This will create:
- `lib/gen/model/todayTransactionSummary.ts`
- `lib/gen/transactions/transactions.ts` (updated with new endpoint)

### Step 3: Create TransactionProvider (Optional)

**File:** `apps/mobile/components/transactions/TransactionProvider.tsx`

```typescript
import { createContext, useContext, useEffect, useState } from "react";
import { getTodayTransactionSummary } from "@/lib/gen/transactions/transactions";
import type { TodayTransactionSummary } from "@/lib/gen/model";

type TransactionContextValue = {
  todaySummary: TodayTransactionSummary | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

const TransactionContext = createContext<TransactionContextValue | undefined>(undefined);

export function TransactionProvider({ children }: { children: React.ReactNode }) {
  // Implementation similar to ExperienceProvider
}

export function useTransactionSummary() {
  const context = useContext(TransactionContext);
  if (!context) {
    throw new Error("useTransactionSummary must be used within TransactionProvider");
  }
  return context;
}
```

### Step 4: Update Home Screen

**File:** `apps/mobile/app/(tabs)/index.tsx`

Replace:
```typescript
// REMOVE THIS
import { profileOverview } from "@/components/dummy_data/profile";
const overview = profileOverview;

const todayFormatted = formatCurrency(overview.todayAmount, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
```

With:
```typescript
// ADD THIS
import { useTransactionSummary } from "@/components/transactions/TransactionProvider";

const { todaySummary } = useTransactionSummary();

const todayFormatted = formatCurrency(todaySummary?.total_amount ?? 0, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
```

Update streak card:
```typescript
{/* BEFORE */}
{overview.hasLoggedToday ? (
  <Text style={styles.todaySub}>
    Logged {overview.todayItems} items today
  </Text>
) : (
  <Text style={styles.todaySub}>
    Log now to keep the streak alive
  </Text>
)}

{/* AFTER */}
{todaySummary?.has_logged_today ? (
  <Text style={styles.todaySub}>
    Logged {todaySummary.transaction_count} items today
  </Text>
) : (
  <Text style={styles.todaySub}>
    Log now to keep the streak alive
  </Text>
)}
```

### Step 5: Delete Dummy Data

Once everything is migrated and tested:

```bash
rm apps/mobile/components/dummy_data/profile.ts
rm apps/mobile/components/dummy_data/MIGRATION_GUIDE.md
```

Update imports in:
- `apps/mobile/app/(tabs)/index.tsx` (remove profileOverview import)
- Any other files using `profileOverview`

## Testing Checklist

After migration:

- [ ] Home screen displays today's transaction amount correctly
- [ ] Transaction count updates when new expense/income is added
- [ ] "Logged X items today" message shows correct count
- [ ] "Log now to keep the streak alive" shows when no transactions today
- [ ] Loading states work properly
- [ ] Error states are handled gracefully
- [ ] Data refreshes after creating new transaction

## Alternative Approach (Simpler)

If you don't want to create a new provider, you can add the summary to existing providers:

### Option A: Add to InsightsProvider

Extend `MonthSnapshot` to include `today_summary`:
```typescript
export interface MonthSnapshot {
  // ... existing fields
  today_summary: TodayTransactionSummary;
}
```

### Option B: Add to ExperienceProvider

Since check-ins and transactions are related to daily activity:
```typescript
export interface ExperienceResponse {
  // ... existing fields
  today_transaction_summary: TodayTransactionSummary;
}
```

This would consolidate all "daily activity" data in one place.

## Files to Update

1. **Backend:**
   - `apps/api/src/routes/transaction_routes.py` (new endpoint)
   - `apps/api/src/repositories/transaction_repository.py` (query helper)
   - `packages/openapi/api.yaml` (schema definition)

2. **Mobile:**
   - `apps/mobile/app/(tabs)/index.tsx` (update usage)
   - `apps/mobile/components/transactions/TransactionProvider.tsx` (new provider - optional)
   - `apps/mobile/lib/gen/*` (auto-generated from OpenAPI)

3. **Cleanup:**
   - `apps/mobile/components/dummy_data/profile.ts` (delete)
   - `apps/mobile/components/dummy_data/MIGRATION_GUIDE.md` (delete)

## Estimated Effort

- Backend endpoint: 1-2 hours
- Mobile integration: 1-2 hours
- Testing & cleanup: 1 hour
- **Total: 3-5 hours**

## Notes

- The gamification data migration is already complete! 🎉
- Only transaction summary data remains
- Consider batching this work with other transaction-related features
- This is a nice-to-have, not a blocker for the gamification feature
