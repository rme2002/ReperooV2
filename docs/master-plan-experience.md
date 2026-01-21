# Master Plan: Experience/Leveling System Implementation

**Goal**: Implement a gamification system where users reach Legendary status (L51) in approximately one year of daily usage.

---

## Quick Reference

### XP System Summary
- **Daily Login**: +15 XP
- **Transaction**: +3 XP (max 5/day = +15 XP cap)
- **Streak Milestones**: 7d (+50), 14d (+75), 30d (+150), 60d (+250), 100d (+400), etc.
- **Financial Goals**: +100 XP per goal (savings/investment) when met (must be > 0)

### Level System
- **Formula**: Level N requires N × 10 XP to reach next level
- **Cumulative XP to reach levels**:
  - L10: 450 XP (~19 days)
  - L20: 1,900 XP (~2.5 months)
  - L30: 4,350 XP (~6 months)
  - L51: 12,750 XP (~1 year)

### Evolution Stages
- Baby (L1-5)
- Young (L6-15)
- Adult (L16-30)
- Prime (L31-50)
- Legendary (L51+)

### Key Design Decisions
- Server-side date tracking (prevents client manipulation)
- No freeze days in this version
- No visual animations in this version
- Check-on-login for inactivity (no background jobs)
- Transaction XP cap prevents farming

---

## Implementation Steps

### Step 1: OpenAPI Schema Updates
**File**: `packages/openapi/api.yaml`

Add these endpoints and schemas:

```yaml
paths:
  /api/v1/experience/status:
    get:
      summary: Get current experience status
      tags: [experience]
      security:
        - BearerAuth: []
      responses:
        200:
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ExperienceResponse'

  /api/v1/experience/check-in:
    post:
      summary: Daily check-in
      tags: [experience]
      security:
        - BearerAuth: []
      responses:
        200:
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CheckInResponse'

  /api/v1/experience/history:
    get:
      summary: Get XP history
      tags: [experience]
      security:
        - BearerAuth: []
      parameters:
        - name: limit
          in: query
          schema:
            type: integer
            default: 50
        - name: offset
          in: query
          schema:
            type: integer
            default: 0
      responses:
        200:
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ExperienceHistoryResponse'

  /api/v1/experience/streak-milestones:
    get:
      summary: Get streak milestones
      tags: [experience]
      security:
        - BearerAuth: []
      responses:
        200:
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/StreakMilestonesResponse'

components:
  schemas:
    ExperienceResponse:
      type: object
      required:
        - user_id
        - current_level
        - current_xp
        - xp_for_next_level
        - total_xp_for_current_level
        - evolution_stage
        - current_streak
        - longest_streak
        - transactions_today_count
        - transactions_daily_limit
      properties:
        user_id:
          type: string
          format: uuid
        current_level:
          type: integer
        current_xp:
          type: integer
        xp_for_next_level:
          type: integer
        total_xp_for_current_level:
          type: integer
        evolution_stage:
          type: string
          enum: [Baby, Young, Adult, Prime, Legendary]
        current_streak:
          type: integer
        longest_streak:
          type: integer
        last_login_date:
          type: string
          format: date
          nullable: true
        transactions_today_count:
          type: integer
        transactions_daily_limit:
          type: integer

    CheckInResponse:
      type: object
      required:
        - xp_awarded
        - new_total_xp
        - new_level
        - level_up
        - streak_incremented
        - new_streak
        - streak_broken
        - message
      properties:
        xp_awarded:
          type: integer
        new_total_xp:
          type: integer
        new_level:
          type: integer
        level_up:
          type: boolean
        previous_level:
          type: integer
        streak_incremented:
          type: boolean
        new_streak:
          type: integer
        streak_broken:
          type: boolean
        inactivity_penalties:
          type: array
          items:
            $ref: '#/components/schemas/XPEvent'
        milestone_reached:
          type: object
          nullable: true
          properties:
            days:
              type: integer
            xp_reward:
              type: integer
        message:
          type: string

    XPEvent:
      type: object
      required:
        - id
        - xp_amount
        - event_type
        - description
        - created_at
      properties:
        id:
          type: string
          format: uuid
        xp_amount:
          type: integer
        event_type:
          type: string
          enum: [daily_login, transaction, streak_milestone, inactivity_penalty, financial_goal]
        description:
          type: string
        created_at:
          type: string
          format: date-time

    ExperienceHistoryResponse:
      type: object
      required:
        - events
        - total_count
        - has_more
      properties:
        events:
          type: array
          items:
            $ref: '#/components/schemas/XPEvent'
        total_count:
          type: integer
        has_more:
          type: boolean

    StreakMilestonesResponse:
      type: object
      required:
        - current_streak
        - milestones
      properties:
        current_streak:
          type: integer
        milestones:
          type: array
          items:
            type: object
            properties:
              days:
                type: integer
              xp_reward:
                type: integer
              achieved:
                type: boolean
              achieved_at:
                type: string
                format: date-time
                nullable: true
              days_remaining:
                type: integer
                nullable: true
```

**After editing**, run:
```bash
cd packages/openapi
npm run generate-api-client
```

---

### Step 2: Database Models

#### 2a. Update Profile Model
**File**: `apps/api/src/db/models/profile.py`

Add these fields:
```python
from sqlalchemy import Integer, Date

# Add to Profile class:
current_level: Mapped[int] = mapped_column(Integer, default=1)
current_xp: Mapped[int] = mapped_column(Integer, default=0)
current_streak: Mapped[int] = mapped_column(Integer, default=0)
longest_streak: Mapped[int] = mapped_column(Integer, default=0)
last_login_date: Mapped[date | None] = mapped_column(Date, nullable=True)
total_xp_earned: Mapped[int] = mapped_column(Integer, default=0)
transactions_today_count: Mapped[int] = mapped_column(Integer, default=0)
last_transaction_date: Mapped[date | None] = mapped_column(Date, nullable=True)
```

#### 2b. Create XPEvent Model
**File**: `apps/api/src/db/models/xp_event.py` (NEW)

```python
from sqlalchemy import Integer, String, Text, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from uuid import uuid4, UUID
from datetime import datetime

from apps.api.src.db.models.base import Base, TimestampMixin

class XPEvent(TimestampMixin, Base):
    __tablename__ = "xp_events"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("profiles.id", ondelete="CASCADE"))
    xp_amount: Mapped[int] = mapped_column(Integer)
    event_type: Mapped[str] = mapped_column(String(50))
    description: Mapped[str] = mapped_column(Text)
    metadata: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime]
```

#### 2c. Run Migrations
```bash
cd apps/api
alembic revision --autogenerate -m "Add experience gamification fields"
alembic upgrade head
```

---

### Step 3: Experience Service Core Logic
**File**: `apps/api/src/services/experience_service.py` (NEW)

Key methods to implement:

```python
class ExperienceService:
    def __init__(self, profile_repository, xp_event_repository):
        self.profile_repository = profile_repository
        self.xp_event_repository = xp_event_repository

    # Level calculation
    def calculate_level_from_xp(self, xp: int) -> int:
        """Level = floor((sqrt(1 + 0.8*xp) - 1) / 2) + 1"""
        if xp <= 0:
            return 1
        n = (-1 + math.sqrt(1 + 0.8 * xp)) / 2
        return max(1, math.floor(n) + 1)

    def calculate_total_xp_for_level(self, level: int) -> int:
        """Total XP to reach level: 5 * (level-1) * level"""
        if level <= 1:
            return 0
        n = level - 1
        return 5 * n * (n + 1)

    def xp_required_for_next_level(self, current_level: int) -> int:
        """XP needed for next level: current_level * 10"""
        return current_level * 10

    def get_evolution_stage(self, level: int) -> str:
        """Return Baby/Young/Adult/Prime/Legendary"""
        if level >= 51:
            return "Legendary"
        elif level >= 31:
            return "Prime"
        elif level >= 16:
            return "Adult"
        elif level >= 6:
            return "Young"
        else:
            return "Baby"

    # Main operations
    async def check_in(self, user_id: UUID, session: Session) -> dict:
        """
        Daily check-in:
        1. Check if already checked in today (last_login_date)
        2. Check for inactivity (apply penalties, reset streak)
        3. Award +15 XP login bonus
        4. Update streak
        5. Check for milestone
        6. Update last_login_date (SERVER TIME)
        7. Recalculate level
        """
        # Implementation details in full plan

    async def award_transaction_xp(self, user_id: UUID, session: Session) -> dict | None:
        """
        Award +3 XP for transaction (max 5/day):
        1. Check/reset daily counter
        2. Check cap (return None if reached)
        3. Award XP
        4. Increment counter
        5. Recalculate level
        """
        # Implementation details in full plan

    async def award_financial_goal_xp(
        self, user_id: UUID, month: int, year: int, session: Session
    ) -> list:
        """
        Check if savings/investment goals met (must be > 0):
        1. Check if already awarded for this month
        2. Get budget plan
        3. Get month snapshot
        4. Award +100 XP per goal met
        5. Recalculate level
        """
        # Implementation details in full plan

    # Helper methods
    async def _apply_inactivity_penalties(...)
    async def _check_and_award_streak_milestone(...)
    async def _create_xp_event(...)
```

**Full implementation**: See `/Users/romnickevangelista/.claude/plans/valiant-foraging-parrot.md` lines 444-735

---

### Step 4: Experience Routes
**File**: `apps/api/src/routes/experience_routes.py` (NEW)

```python
from fastapi import APIRouter, Depends
from apps.api.src.services.experience_service import ExperienceService
from apps.api.src.models.model import (
    ExperienceResponse,
    CheckInResponse,
    ExperienceHistoryResponse,
    StreakMilestonesResponse
)

router = APIRouter(prefix="/api/v1/experience", tags=["experience"])

@router.get("/status", response_model=ExperienceResponse)
async def get_experience_status(...):
    """Get current XP, level, streak"""

@router.post("/check-in", response_model=CheckInResponse)
async def check_in(...):
    """Daily check-in (awards XP, updates streak)"""

@router.get("/history", response_model=ExperienceHistoryResponse)
async def get_experience_history(...):
    """Get XP transaction history"""

@router.get("/streak-milestones", response_model=StreakMilestonesResponse)
async def get_streak_milestones(...):
    """Get milestone progress"""
```

Register in `apps/api/src/routes/router.py`:
```python
from apps.api.src.routes import experience_routes
app.include_router(experience_routes.router)
```

---

### Step 5: Integration Points

#### 5a. Transaction Routes Integration
**File**: `apps/api/src/routes/transaction_routes.py`

Add to `create_expense_transaction` and `create_income_transaction`:
```python
# After creating transaction
xp_result = await experience_service.award_transaction_xp(
    authenticated_user_id, session
)
# Optional: include xp_result in response
```

#### 5b. Insights Routes Integration
**File**: `apps/api/src/routes/insights_routes.py`

Add to `get_month_snapshot`:
```python
# After getting snapshot
xp_events = await experience_service.award_financial_goal_xp(
    user_id, month, year, session
)
# Optional: include xp_events in response
```

---

### Step 6: Frontend - Experience Provider
**File**: `apps/mobile/components/home/ExperienceProvider.tsx` (NEW)

```typescript
import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface ExperienceData {
  currentLevel: number;
  currentXP: number;
  xpForNextLevel: number;
  evolutionStage: string;
  currentStreak: number;
  longestStreak: number;
  transactionsTodayCount: number;
  transactionsDailyLimit: number;
}

const ExperienceContext = createContext<ExperienceData | null>(null);

export function ExperienceProvider({ children }) {
  const [experienceData, setExperienceData] = useState<ExperienceData | null>(null);

  useEffect(() => {
    const checkIn = async () => {
      // Check in on app launch
      const checkInResult = await api.post('/experience/check-in');

      // Handle level up, streak broken, etc.
      if (checkInResult.level_up) {
        // Show level up notification
      }

      if (checkInResult.streak_broken) {
        // Show streak broken notification
      }

      // Fetch current status
      const status = await api.get('/experience/status');
      setExperienceData(status);
    };

    checkIn();
  }, []);

  return (
    <ExperienceContext.Provider value={experienceData}>
      {children}
    </ExperienceContext.Provider>
  );
}

export const useExperience = () => useContext(ExperienceContext);
```

---

### Step 7: Frontend - Home Screen Integration

#### 7a. Delete Dummy Data
**Delete**: `apps/mobile/components/dummy_data/profile.ts`

#### 7b. Update Home Screen
**File**: `apps/mobile/app/(tabs)/index.tsx`

```typescript
import { ExperienceProvider, useExperience } from '@/components/home/ExperienceProvider';

// Wrap app with provider
<ExperienceProvider>
  <OverviewScreen />
</ExperienceProvider>

// Use in component
const experience = useExperience();
const level = experience?.currentLevel || 1;
const xp = experience?.currentXP || 0;
const streak = experience?.currentStreak || 0;
const transactionsToday = experience?.transactionsTodayCount || 0;
```

#### 7c. Update Mascot Hero Section
**File**: `apps/mobile/components/home/MascotHeroSection.tsx`

```typescript
const experience = useExperience();
const evolutionStage = experience?.evolutionStage || 'Baby';
const level = experience?.currentLevel || 1;
const xp = experience?.currentXP || 0;
const xpForNext = experience?.xpForNextLevel || 10;

// Display level badge, XP progress bar
// All stages use heroBase1.png for now
```

---

### Step 8: Testing

#### Manual Testing Checklist
1. **New user**: Sign up → verify L1, 0 XP, 0 streak
2. **First login**: +15 XP, streak = 1
3. **Transaction**: +3 XP (test up to 6, verify cap at 5)
4. **Second login same day**: No duplicate XP
5. **Consecutive days**: Streak increments
6. **Milestone**: Reach 7 days → +50 XP bonus
7. **Inactivity**: Skip 1 day → -15 XP, streak reset
8. **Financial goal**: Set goal > 0, meet it → +100 XP

#### Automated Tests
- Unit tests for `calculate_level_from_xp()`
- Unit tests for `xp_required_for_next_level()`
- Integration test for check-in flow
- E2E test for transaction → XP flow

---

## Implementation Workflow

### Session 1: Backend Foundation
**What to implement**: Steps 1-2
- Update OpenAPI schema
- Run codegen
- Update database models
- Run migrations

**Files touched**:
- `packages/openapi/api.yaml`
- `apps/api/src/models/model.py` (auto-generated)
- `apps/api/src/db/models/profile.py`
- `apps/api/src/db/models/xp_event.py` (new)

**How to start new session**:
```
I want to implement Step 1-2 of the experience system master plan.
See: /Users/romnickevangelista/Documents/GitHub/ReperooV2/docs/master-plan-experience.md
```

---

### Session 2: Core Service Logic
**What to implement**: Step 3
- Create ExperienceService
- Implement level calculations
- Implement check-in logic
- Implement transaction XP
- Implement financial goal XP

**Files touched**:
- `apps/api/src/services/experience_service.py` (new)
- `apps/api/src/repositories/profile_repository.py` (may need updates)
- `apps/api/src/repositories/xp_event_repository.py` (new)

**How to start new session**:
```
I want to implement Step 3 of the experience system master plan.
See: /Users/romnickevangelista/Documents/GitHub/ReperooV2/docs/master-plan-experience.md
Reference the full implementation details in: /Users/romnickevangelista/.claude/plans/valiant-foraging-parrot.md lines 444-735
```

---

### Session 3: API Routes
**What to implement**: Step 4
- Create experience_routes.py
- Implement 4 endpoints
- Register routes

**Files touched**:
- `apps/api/src/routes/experience_routes.py` (new)
- `apps/api/src/routes/router.py`

**How to start new session**:
```
I want to implement Step 4 of the experience system master plan.
See: /Users/romnickevangelista/Documents/GitHub/ReperooV2/docs/master-plan-experience.md
```

---

### Session 4: Backend Integration
**What to implement**: Step 5
- Integrate XP awards into transaction routes
- Integrate financial goal XP into insights routes

**Files touched**:
- `apps/api/src/routes/transaction_routes.py`
- `apps/api/src/routes/insights_routes.py`

**How to start new session**:
```
I want to implement Step 5 of the experience system master plan.
See: /Users/romnickevangelista/Documents/GitHub/ReperooV2/docs/master-plan-experience.md
```

---

### Session 5: Frontend Provider
**What to implement**: Step 6
- Create ExperienceProvider
- Implement check-in on mount
- Expose experience data

**Files touched**:
- `apps/mobile/components/home/ExperienceProvider.tsx` (new)

**How to start new session**:
```
I want to implement Step 6 of the experience system master plan.
See: /Users/romnickevangelista/Documents/GitHub/ReperooV2/docs/master-plan-experience.md
```

---

### Session 6: Frontend Integration
**What to implement**: Step 7
- Delete dummy data
- Update home screen to use ExperienceProvider
- Update MascotHeroSection

**Files touched**:
- `apps/mobile/components/dummy_data/profile.ts` (delete)
- `apps/mobile/app/(tabs)/index.tsx`
- `apps/mobile/components/home/MascotHeroSection.tsx`

**How to start new session**:
```
I want to implement Step 7 of the experience system master plan.
See: /Users/romnickevangelista/Documents/GitHub/ReperooV2/docs/master-plan-experience.md
```

---

### Session 7: Testing & Polish
**What to implement**: Step 8
- Manual testing
- Write automated tests
- Fix any issues

**How to start new session**:
```
I want to implement Step 8 of the experience system master plan - testing.
See: /Users/romnickevangelista/Documents/GitHub/ReperooV2/docs/master-plan-experience.md
```

---

## Quick Context Primer for Future Sessions

When starting any implementation session, provide this context:

```
Project: ReperooV2 - Financial tracking app with gamification
Task: Implementing experience/leveling system

Key Files:
- Master Plan: /Users/romnickevangelista/Documents/GitHub/ReperooV2/docs/master-plan-experience.md
- Detailed Plan: /Users/romnickevangelista/.claude/plans/valiant-foraging-parrot.md

System Overview:
- Users earn XP through daily logins (+15), transactions (+3, max 5/day), streak milestones, and financial goals
- Linear progression: Level N requires N × 10 XP
- Reach L51 (Legendary) in ~1 year of typical usage
- Server-side date tracking prevents cheating
- No freeze days or visual animations in this version

I'm implementing [Step X] - [Step Description]
```

---

## Full Implementation Reference

For complete code examples, algorithms, and implementation details, see:
`/Users/romnickevangelista/.claude/plans/valiant-foraging-parrot.md`

This contains:
- Complete ExperienceService implementation (lines 444-735)
- Full API endpoint implementations
- OpenAPI schema with all details
- Edge cases and security considerations
- Testing strategies
