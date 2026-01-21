# Experience & Gamification System API Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Leveling System](#leveling-system)
3. [XP Sources](#xp-sources)
4. [Streak System](#streak-system)
5. [Inactivity Penalties](#inactivity-penalties)
6. [Evolution Stages](#evolution-stages)
7. [API Endpoints](#api-endpoints)
8. [Database Schema](#database-schema)
9. [Usage Examples](#usage-examples)
10. [Implementation Notes](#implementation-notes)

---

## System Overview

The gamification system rewards users for consistent engagement with the app through:
- **Experience Points (XP)**: Earned through daily logins and logging transactions
- **Levels**: Calculated from total XP using a mathematical formula
- **Streaks**: Track consecutive days of logging in
- **Evolution Stages**: Visual progression tied to level milestones
- **Milestone Rewards**: Bonus XP for reaching streak goals

### Core Principles
- **Server-side authority**: All dates/times use server time to prevent manipulation
- **Automatic calculation**: Levels calculated from XP (no manual level tracking)
- **Daily caps**: Transaction XP limited to 5 per day to prevent grinding
- **Penalties for inactivity**: Missing days results in XP loss and streak reset

---

## Leveling System

### Formula: N × 10 XP Per Level

Each level requires progressively more XP:
- **Level 1 → 2**: 10 XP
- **Level 2 → 3**: 20 XP
- **Level 3 → 4**: 30 XP
- **Level N → N+1**: N × 10 XP

### Mathematical Formulas

#### Calculate Level from Total XP
```python
def calculate_level_from_xp(xp: int) -> int:
    """
    Formula: Level = floor((sqrt(1 + 8*XP/10) - 1) / 2) + 1

    This is derived from the triangular number sequence:
    Total XP for level N = 5 * N * (N + 1)
    """
    if xp <= 0:
        return 1
    n = (-1 + math.sqrt(1 + 0.8 * xp)) / 2
    return max(1, math.floor(n) + 1)
```

#### Calculate Total XP Needed for Specific Level
```python
def calculate_total_xp_for_level(level: int) -> int:
    """
    Total cumulative XP needed to reach a specific level.
    Formula: 5 * N * (N + 1), where N = level - 1
    """
    if level <= 1:
        return 0
    n = level - 1
    return 5 * n * (n + 1)
```

#### Calculate XP Needed for Next Level
```python
def xp_required_for_next_level(current_level: int) -> int:
    """
    XP needed to go from current level to next level.
    Formula: current_level * 10
    """
    return current_level * 10
```

### Level Progression Table

| Level | Total XP Required | XP for Next Level | Evolution Stage |
|-------|-------------------|-------------------|-----------------|
| 1     | 0                 | 10                | Baby            |
| 2     | 10                | 20                | Baby            |
| 3     | 30                | 30                | Baby            |
| 4     | 60                | 40                | Baby            |
| 5     | 100               | 50                | Baby            |
| 6     | 150               | 60                | Young           |
| 7     | 210               | 70                | Young           |
| 10    | 450               | 100               | Young           |
| 15    | 1,050             | 150               | Young           |
| 16    | 1,200             | 160               | Adult           |
| 20    | 1,900             | 200               | Adult           |
| 30    | 4,350             | 300               | Adult           |
| 31    | 4,650             | 310               | Prime           |
| 40    | 7,800             | 400               | Prime           |
| 50    | 12,250            | 500               | Prime           |
| 51    | 12,750            | 510               | Legendary       |
| 75    | 27,750            | 750               | Legendary       |
| 100   | 49,500            | 1,000             | Legendary       |

### Key Insights
- **Early game is fast**: Levels 1-10 can be reached quickly with consistent daily logins
- **Mid game slows down**: Levels 16-30 require sustained engagement
- **Late game is aspirational**: Level 50+ is for highly dedicated users
- **Level 100 requires**: 49,500 total XP ≈ **3,300 days** of perfect daily login (9+ years!)

---

## XP Sources

### 1. Daily Check-in
**Location**: `experience_service.py:120` (`check_in()`)

- **XP Amount**: +15 XP
- **Frequency**: Once per day (server time)
- **Trigger**: Automatically called by `ExperienceProvider` on app startup
- **Behavior**:
  - First check-in of the day: Awards 15 XP
  - Subsequent check-ins same day: Awards 0 XP, returns message "Already checked in today"
  - Updates `last_login_date` to server's current date

**XP Event Created**:
```json
{
  "event_type": "daily_login",
  "xp_amount": 15,
  "description": "Daily check-in"
}
```

### 2. Transaction Logging
**Location**: `experience_service.py:275` (`award_transaction_xp()`)

- **XP Amount**: +3 XP per transaction
- **Daily Limit**: 5 transactions per day (15 XP max)
- **Frequency**: Per transaction logged
- **Trigger**: Called when user creates/logs a transaction
- **Behavior**:
  - Resets counter at midnight (server time)
  - Returns `None` if daily cap reached
  - Tracks count in `transactions_today_count`

**XP Event Created**:
```json
{
  "event_type": "transaction",
  "xp_amount": 3,
  "description": "Logged transaction"
}
```

**Daily Transaction XP Schedule**:
```
Transaction 1: +3 XP (Total: 3)
Transaction 2: +3 XP (Total: 6)
Transaction 3: +3 XP (Total: 9)
Transaction 4: +3 XP (Total: 12)
Transaction 5: +3 XP (Total: 15)
Transaction 6+: 0 XP (cap reached)
```

### 3. Streak Milestones
**Location**: `experience_service.py:243` (`_check_and_award_streak_milestone()`)

- **Trigger**: Automatically during check-in when streak reaches milestone
- **One-time only**: Each milestone awarded once per user
- **Milestones**:

| Streak Days | XP Reward | Description         |
|-------------|-----------|---------------------|
| 7           | 50        | 1 week streak       |
| 14          | 75        | 2 week streak       |
| 30          | 150       | 1 month streak      |
| 60          | 250       | 2 month streak      |
| 100         | 400       | 100 day streak      |
| 150         | 500       | 150 day streak      |
| 200         | 600       | 200 day streak      |
| 365         | 1,000     | 1 year streak       |

**XP Event Created**:
```json
{
  "event_type": "streak_milestone",
  "xp_amount": 50,
  "description": "7-day streak bonus"
}
```

### 4. Financial Goals (Placeholder)
**Location**: `experience_service.py:323` (`award_financial_goal_xp()`)

- **Status**: Not yet implemented
- **Planned**: +100 XP per savings/investment goal met
- **Trigger**: When viewing month insights
- **Requirements**: Integration with budget plan service

---

## Streak System

### How Streaks Work

**Increment Condition**: Check in on consecutive days
- Day 1: Login → Streak = 1
- Day 2: Login → Streak = 2
- Day 3: Login → Streak = 3

**Break Condition**: Miss 1 or more days
- Day 1: Login → Streak = 5
- Day 2: No login
- Day 3: Login → Streak resets to 1 (broken), inactivity penalties applied

### Streak Fields

**Profile Table**:
- `current_streak`: Current consecutive days (resets to 0 when broken)
- `longest_streak`: All-time best streak (never decreases)
- `last_login_date`: Last date user checked in (server time)

### Streak Logic Flow

**Location**: `experience_service.py:120-183` (`check_in()`)

```python
# 1. Check if already checked in today
if last_login_date == today:
    return "Already checked in today"

# 2. Check for missed days
if last_login_date:
    days_missed = (today - last_login_date).days - 1
    if days_missed > 0:
        # Apply penalties (see Inactivity Penalties section)
        # Reset streak
        current_streak = 0
        streak_broken = True

# 3. Award check-in XP
current_xp += 15

# 4. Increment streak (if not broken)
if not streak_broken:
    current_streak += 1
    if current_streak > longest_streak:
        longest_streak = current_streak

# 5. Check for milestone rewards
if current_streak in [7, 14, 30, 60, 100, 150, 200, 365]:
    # Award bonus XP (one-time only)

# 6. Update last_login_date
last_login_date = today  # SERVER TIME
```

### Important Notes
- **Server time only**: Client cannot manipulate dates
- **Consecutive days**: Must be exactly 1 day apart (no gaps)
- **Milestone check**: Happens AFTER streak increment
- **First login**: If `last_login_date` is `None`, sets streak to 1

---

## Inactivity Penalties

### Penalty Rules

**Trigger**: When `(today - last_login_date).days - 1 > 0`

**Location**: `experience_service.py:220` (`_apply_inactivity_penalties()`)

### Penalty Calculation

For each day missed, apply escalating penalties:
```
Day 1 missed: -15 XP
Day 2 missed: -30 XP
Day 3 missed: -45 XP
Day N missed: -15 * N XP
```

**Formula**: `penalty = -15 * day_number`

### Example Scenario

**Setup**:
- User has 200 XP, Level 5, Streak 10
- Last login: January 1
- Next login: January 5 (missed 3 days)

**Penalties Applied**:
```
Day 1 missed (Jan 2): -15 XP
Day 2 missed (Jan 3): -30 XP
Day 3 missed (Jan 4): -45 XP
Total penalty: -90 XP
```

**Result**:
- XP: 200 - 90 + 15 (check-in) = **125 XP**
- Level: Recalculated (may drop from 5 to 4)
- Streak: Reset to **1** (broken)
- XP Events: 3 penalty events created + 1 check-in event

### XP Events Created
```json
[
  {
    "event_type": "inactivity_penalty",
    "xp_amount": -15,
    "description": "Missed day 1 of inactivity"
  },
  {
    "event_type": "inactivity_penalty",
    "xp_amount": -30,
    "description": "Missed day 2 of inactivity"
  },
  {
    "event_type": "inactivity_penalty",
    "xp_amount": -45,
    "description": "Missed day 3 of inactivity"
  }
]
```

### Protection
- **XP cannot go below 0**: `current_xp = max(0, current_xp + penalty)`
- **Level recalculated**: After penalties, level is updated based on remaining XP
- **Streak always resets**: No protection, streak goes to 0 on any gap

---

## Evolution Stages

**Location**: `experience_service.py:68` (`get_evolution_stage()`)

Visual progression system tied to level milestones:

| Stage       | Level Range | Description                          |
|-------------|-------------|--------------------------------------|
| Baby        | 1-5         | Just starting financial journey      |
| Young       | 6-15        | Building healthy money habits        |
| Adult       | 16-30       | Established financial discipline     |
| Prime       | 31-50       | Advanced money management            |
| Legendary   | 51+         | Financial mastery and expertise      |

### Stage Progression

```python
def get_evolution_stage(level: int) -> str:
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
```

### Visual Representation
Stages are used in the UI to:
- Display different mascot animations/skins
- Show stage badge on profile
- Unlock stage-specific features (future enhancement)

---

## API Endpoints

### Base URL
```
/api/v1/experience
```

### 1. GET /status
**Get current experience status**

**Authentication**: Required (JWT)

**Response**: `ExperienceResponse`
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "current_level": 15,
  "current_xp": 1215,
  "xp_for_next_level": 150,
  "total_xp_for_current_level": 1050,
  "evolution_stage": "Young",
  "current_streak": 28,
  "longest_streak": 45,
  "last_login_date": "2026-01-21",
  "transactions_today_count": 3,
  "transactions_daily_limit": 5
}
```

**Field Descriptions**:
- `current_level`: User's current level (calculated from XP)
- `current_xp`: Total XP accumulated
- `xp_for_next_level`: XP needed to reach next level (e.g., 150 for level 15→16)
- `total_xp_for_current_level`: Cumulative XP needed to reach current level (1050 for level 15)
- `evolution_stage`: Current stage name (Baby/Young/Adult/Prime/Legendary)
- `current_streak`: Consecutive login days
- `longest_streak`: Best streak ever achieved
- `last_login_date`: Last date user checked in (YYYY-MM-DD, server time)
- `transactions_today_count`: Transactions logged today (0-5)
- `transactions_daily_limit`: Max transactions for XP per day (always 5)

**Status Codes**:
- `200`: Success
- `401`: Unauthorized (invalid/missing JWT)
- `404`: Profile not found
- `500`: Server error

**Side Effects**:
- Resets `transactions_today_count` to 0 if new day detected

---

### 2. POST /check-in
**Daily check-in for login XP**

**Authentication**: Required (JWT)

**Response**: `CheckInResponse`
```json
{
  "xp_awarded": 15,
  "new_total_xp": 1230,
  "new_level": 15,
  "level_up": false,
  "previous_level": null,
  "streak_incremented": true,
  "new_streak": 29,
  "streak_broken": false,
  "inactivity_penalties": [],
  "milestone_reached": null,
  "message": "Welcome back! +15 XP"
}
```

**Field Descriptions**:
- `xp_awarded`: XP given this check-in (0 if already checked in today, 15 otherwise)
- `new_total_xp`: Total XP after check-in
- `new_level`: Current level after check-in
- `level_up`: Whether user leveled up from this check-in
- `previous_level`: Level before check-in (only if `level_up` is true)
- `streak_incremented`: Whether streak increased
- `new_streak`: Current streak after check-in
- `streak_broken`: Whether streak was reset due to missed days
- `inactivity_penalties`: Array of XP penalty events (if days were missed)
- `milestone_reached`: Milestone info if streak milestone hit
  ```json
  {
    "days": 30,
    "xp_reward": 150
  }
  ```
- `message`: Human-readable message about check-in result

**Example: Already Checked In**
```json
{
  "xp_awarded": 0,
  "new_total_xp": 1230,
  "new_level": 15,
  "level_up": false,
  "previous_level": null,
  "streak_incremented": false,
  "new_streak": 29,
  "streak_broken": false,
  "inactivity_penalties": [],
  "milestone_reached": null,
  "message": "Already checked in today"
}
```

**Example: Streak Broken with Penalties**
```json
{
  "xp_awarded": 15,
  "new_total_xp": 125,
  "new_level": 4,
  "level_up": false,
  "previous_level": null,
  "streak_incremented": false,
  "new_streak": 1,
  "streak_broken": true,
  "inactivity_penalties": [
    {
      "id": "...",
      "xp_amount": -15,
      "event_type": "inactivity_penalty",
      "description": "Missed day 1 of inactivity",
      "created_at": "2026-01-21T08:00:00Z"
    },
    {
      "id": "...",
      "xp_amount": -30,
      "event_type": "inactivity_penalty",
      "description": "Missed day 2 of inactivity",
      "created_at": "2026-01-21T08:00:00Z"
    }
  ],
  "milestone_reached": null,
  "message": "Welcome back! +15 XP"
}
```

**Example: Milestone Reached**
```json
{
  "xp_awarded": 15,
  "new_total_xp": 1395,
  "new_level": 16,
  "level_up": true,
  "previous_level": 15,
  "streak_incremented": true,
  "new_streak": 30,
  "streak_broken": false,
  "inactivity_penalties": [],
  "milestone_reached": {
    "days": 30,
    "xp_reward": 150
  },
  "message": "Welcome back! +15 XP"
}
```

**Status Codes**:
- `200`: Success (always returns 200, even if already checked in)
- `401`: Unauthorized
- `404`: Profile not found
- `500`: Server error

**Side Effects**:
- Creates `daily_login` XP event (+15 XP)
- May create `inactivity_penalty` events (negative XP)
- May create `streak_milestone` event (bonus XP)
- Updates `current_xp`, `total_xp_earned`
- Updates `current_level` (recalculated)
- Updates `current_streak`, potentially `longest_streak`
- Sets `last_login_date` to server's current date

---

### 3. GET /history
**Get XP transaction history**

**Authentication**: Required (JWT)

**Query Parameters**:
- `limit` (optional): Number of events to return (1-100, default 50)
- `offset` (optional): Number of events to skip (default 0)

**Response**: `ExperienceHistoryResponse`
```json
{
  "events": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "xp_amount": 150,
      "event_type": "streak_milestone",
      "description": "30-day streak bonus",
      "created_at": "2026-01-21T08:00:00Z"
    },
    {
      "id": "...",
      "xp_amount": 15,
      "event_type": "daily_login",
      "description": "Daily check-in",
      "created_at": "2026-01-21T08:00:00Z"
    },
    {
      "id": "...",
      "xp_amount": 3,
      "event_type": "transaction",
      "description": "Logged transaction",
      "created_at": "2026-01-20T14:30:00Z"
    }
  ],
  "total_count": 247,
  "has_more": true
}
```

**Event Types**:
- `daily_login`: +15 XP (daily check-in)
- `transaction`: +3 XP (logged transaction, max 5/day)
- `streak_milestone`: +50 to +1000 XP (streak bonus)
- `inactivity_penalty`: Negative XP (missed days)
- `financial_goal`: +100 XP (future: goal achievement)

**Status Codes**:
- `200`: Success
- `401`: Unauthorized
- `500`: Server error

**Pagination**:
```
GET /history?limit=20&offset=0   # First page
GET /history?limit=20&offset=20  # Second page
GET /history?limit=20&offset=40  # Third page
```

---

### 4. GET /streak-milestones
**Get available streak milestones and progress**

**Authentication**: Required (JWT)

**Response**: `StreakMilestonesResponse`
```json
{
  "current_streak": 29,
  "milestones": [
    {
      "days": 7,
      "xp_reward": 50,
      "achieved": true,
      "achieved_at": "2025-12-28T08:00:00Z",
      "days_remaining": null
    },
    {
      "days": 14,
      "xp_reward": 75,
      "achieved": true,
      "achieved_at": "2026-01-04T08:00:00Z",
      "days_remaining": null
    },
    {
      "days": 30,
      "xp_reward": 150,
      "achieved": false,
      "achieved_at": null,
      "days_remaining": 1
    },
    {
      "days": 60,
      "xp_reward": 250,
      "achieved": false,
      "achieved_at": null,
      "days_remaining": 31
    }
  ]
}
```

**Field Descriptions**:
- `current_streak`: User's current consecutive login days
- `milestones`: Array of all available milestones (8 total)
  - `days`: Days required for milestone
  - `xp_reward`: Bonus XP awarded
  - `achieved`: Whether user has reached this milestone
  - `achieved_at`: Timestamp when milestone was reached (null if not achieved)
  - `days_remaining`: Days until milestone (null if achieved)

**Status Codes**:
- `200`: Success
- `401`: Unauthorized
- `404`: Profile not found
- `500`: Server error

---

## Database Schema

### Table: `profiles`
Stores user gamification stats.

**Gamification Fields**:
```sql
current_level          INTEGER    DEFAULT 1     NOT NULL
current_xp             INTEGER    DEFAULT 0     NOT NULL
current_streak         INTEGER    DEFAULT 0     NOT NULL
longest_streak         INTEGER    DEFAULT 0     NOT NULL
last_login_date        DATE                     NULL
total_xp_earned        INTEGER    DEFAULT 0     NOT NULL
transactions_today_count INTEGER  DEFAULT 0     NOT NULL
last_transaction_date  DATE                     NULL
```

**Field Purposes**:
- `current_level`: Derived from `current_xp` using formula
- `current_xp`: Total XP (can decrease due to penalties)
- `current_streak`: Consecutive login days (resets to 0 when broken)
- `longest_streak`: Best streak record (never decreases)
- `last_login_date`: Last check-in date (server time only)
- `total_xp_earned`: Lifetime XP earned (never decreases, for analytics)
- `transactions_today_count`: Daily transaction counter (resets at midnight)
- `last_transaction_date`: Last transaction log date (for daily reset)

---

### Table: `xp_events`
Audit log of all XP changes.

**Schema**:
```sql
CREATE TABLE xp_events (
    id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID         NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    xp_amount         INTEGER      NOT NULL,
    event_type        VARCHAR(50)  NOT NULL,
    description       TEXT         NOT NULL,
    event_metadata    JSON         NULL,
    created_at        TIMESTAMP    NOT NULL DEFAULT NOW()
);
```

**Event Types**:
- `daily_login`: Check-in XP
- `transaction`: Transaction logging XP
- `streak_milestone`: Streak bonus XP
- `inactivity_penalty`: Negative XP for missed days
- `financial_goal`: Goal achievement XP (future)

**Example Records**:
```sql
-- Daily check-in
('...', user_id, 15, 'daily_login', 'Daily check-in', null, '2026-01-21 08:00:00')

-- Transaction
('...', user_id, 3, 'transaction', 'Logged transaction', null, '2026-01-21 14:30:00')

-- Streak milestone
('...', user_id, 150, 'streak_milestone', '30-day streak bonus', null, '2026-01-21 08:00:00')

-- Inactivity penalty
('...', user_id, -45, 'inactivity_penalty', 'Missed day 3 of inactivity', null, '2026-01-21 08:00:00')
```

---

## Usage Examples

### Example 1: New User First Week

**Day 1** (First Login):
```
Check-in: +15 XP
Status: Level 1, XP 15/10, Streak 1
Level up to 2!
```

**Day 2** (Second Login):
```
Check-in: +15 XP
Status: Level 2, XP 30/20, Streak 2
Level up to 3!
```

**Day 3** (Active User):
```
Check-in: +15 XP
Log 5 transactions: +15 XP (5 × 3)
Status: Level 3, XP 60/30, Streak 3
Level up to 4!
```

**Day 7** (Milestone):
```
Check-in: +15 XP
7-day streak bonus: +50 XP
Status: Level 5, XP 155/50, Streak 7
```

---

### Example 2: Missing Days (Inactivity)

**Setup**: User has Level 5, XP 155, Streak 10

**Day 1**: User doesn't login

**Day 2**: User doesn't login

**Day 3**: User logs back in
```
Penalties:
- Day 1 missed: -15 XP
- Day 2 missed: -30 XP
Total: -45 XP

Check-in: +15 XP
New XP: 155 - 45 + 15 = 125 XP
New Level: 4 (dropped from 5!)
New Streak: 1 (broken, reset from 10)
```

**XP History**:
```
[Penalty] -15 XP: Missed day 1 of inactivity
[Penalty] -30 XP: Missed day 2 of inactivity
[Login] +15 XP: Daily check-in
```

---

### Example 3: Multiple Check-ins Same Day

**Attempt 1** (8:00 AM):
```json
{
  "xp_awarded": 15,
  "message": "Welcome back! +15 XP",
  "new_streak": 8
}
```

**Attempt 2** (2:00 PM):
```json
{
  "xp_awarded": 0,
  "message": "Already checked in today",
  "new_streak": 8
}
```

**Attempt 3** (11:59 PM):
```json
{
  "xp_awarded": 0,
  "message": "Already checked in today",
  "new_streak": 8
}
```

**Next Day** (12:01 AM):
```json
{
  "xp_awarded": 15,
  "message": "Welcome back! +15 XP",
  "new_streak": 9
}
```

---

### Example 4: Level Up Calculation

**User has**: 1,190 XP, Level 15

**Check-in**: +15 XP
- New XP: 1,190 + 15 = 1,205
- Calculate level: `floor((sqrt(1 + 0.8 * 1205) - 1) / 2) + 1 = 15`
- No level up (needs 1,200 for level 16)

**Log 1 transaction**: +3 XP
- New XP: 1,205 + 3 = 1,208
- Calculate level: `floor((sqrt(1 + 0.8 * 1208) - 1) / 2) + 1 = 16`
- **Level up!** 15 → 16

**Response**:
```json
{
  "level_up": true,
  "previous_level": 15,
  "new_level": 16,
  "evolution_stage": "Adult"  // Changed from "Young"
}
```

---

### Example 5: Streak Milestone Chain

**Day 7**: Streak 7
```
Check-in: +15 XP
Milestone: +50 XP (7-day streak)
Total: +65 XP
```

**Day 14**: Streak 14
```
Check-in: +15 XP
Milestone: +75 XP (14-day streak)
Total: +90 XP
```

**Day 30**: Streak 30
```
Check-in: +15 XP
Milestone: +150 XP (30-day streak)
Total: +165 XP
Likely multiple level-ups!
```

---

### Example 6: Daily Transaction Cap

**User logs 8 transactions in one day**:
```
Transaction 1: +3 XP ✓
Transaction 2: +3 XP ✓
Transaction 3: +3 XP ✓
Transaction 4: +3 XP ✓
Transaction 5: +3 XP ✓
Transaction 6: 0 XP (cap reached)
Transaction 7: 0 XP (cap reached)
Transaction 8: 0 XP (cap reached)

Total: 15 XP
```

**Next day**:
```
Counter resets to 0
Transactions 1-5: +3 XP each
```

---

## Implementation Notes

### Frontend Integration

**ExperienceProvider Usage**:
```typescript
import { useExperience } from "@/components/home/ExperienceProvider";

function HomeScreen() {
  const {
    experience,
    isLoading,
    error,
    lastCheckInResponse,
    refreshExperience
  } = useExperience();

  // Auto check-in happens on app startup
  // Experience data available immediately after loading

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <View>
      <LevelBadge level={experience.current_level} />
      <Text>XP: {experience.current_xp}</Text>
      <Text>Streak: {experience.current_streak} days</Text>
      <Text>Stage: {experience.evolution_stage}</Text>

      {/* Show level-up notification */}
      {lastCheckInResponse?.level_up && (
        <LevelUpModal
          newLevel={lastCheckInResponse.new_level}
          previousLevel={lastCheckInResponse.previous_level}
        />
      )}
    </View>
  );
}
```

---

### Backend Service Location

**Files**:
- Service: `apps/api/src/services/experience_service.py`
- Routes: `apps/api/src/routes/experience_routes.py`
- Models: `apps/api/src/db/models/profile.py`, `apps/api/src/db/models/xp_event.py`
- Repository: `apps/api/src/repositories/xp_event_repository.py`

**Key Classes**:
- `ExperienceService`: Business logic for XP, levels, streaks
- `ProfileRepository`: Database operations for profiles
- `XPEventRepository`: Database operations for XP events

---

### Design Decisions

**Why server time only?**
- Prevents users from manipulating device time to game the system
- Ensures fair gameplay across all users
- Simplifies time zone handling

**Why triangular number formula?**
- Provides smooth, predictable progression
- Easy to calculate both forwards (XP → level) and backwards (level → XP)
- Well-balanced difficulty curve

**Why daily caps?**
- Prevents grinding/spamming transactions
- Encourages daily engagement over binge sessions
- Rewards consistency over volume

**Why inactivity penalties?**
- Maintains stakes for streaks
- Prevents users from "pausing" then resuming
- Balances the high rewards of long streaks

**Why auto-increment levels?**
- Single source of truth (XP)
- No manual level tracking needed
- Automatic recalculation after any XP change

---

### Common Pitfalls

**Client Implementation**:
1. **Don't** call check-in multiple times per render
2. **Don't** trust client time for streak calculations
3. **Do** check `lastCheckInResponse` for level-ups/milestones
4. **Do** handle the "already checked in" case gracefully

**Backend Extension**:
1. **Don't** modify `current_level` directly (always recalculate)
2. **Don't** forget to create XP events for audit trail
3. **Do** use transactions for multi-step XP operations
4. **Do** validate XP can't go below 0

---

### Future Enhancements

**Planned Features**:
- Financial goal XP integration
- Social features (compare streaks, leaderboards)
- Achievement badges
- Custom avatars/skins per evolution stage
- Daily challenges for bonus XP
- Premium perks for high-level users

**API Extensions**:
- `POST /recalculate` - Admin endpoint to fix XP/level discrepancies
- `GET /leaderboard` - Top users by level or streak
- `GET /achievements` - Badge/trophy system
- `PUT /avatar` - Customize mascot appearance

---

## Questions?

For technical questions or bug reports, refer to:
- Master plan: `docs/master-plan-experience.md`
- API spec: `packages/openapi/api.yaml`
- Backend code: `apps/api/src/services/experience_service.py`
