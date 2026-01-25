.PHONY: help set-level set-streak test-exp get-token

# Default values
LEVEL ?= 1
XP ?= 0
STREAK ?= 0
LONGEST ?=
EMAIL ?= romea123@test.com

help:
	@echo "Available commands:"
	@echo ""
	@echo "  make set-level LEVEL=<level> [XP=<xp>] [EMAIL=<email>]"
	@echo "    Set user to specific level for testing"
	@echo "    Examples:"
	@echo "      make set-level LEVEL=10"
	@echo "      make set-level LEVEL=25 XP=50"
	@echo "      make set-level LEVEL=15 EMAIL=user@test.com"
	@echo ""
	@echo "  make set-streak STREAK=<days> [LONGEST=<days>] [EMAIL=<email>]"
	@echo "    Set user's streak for testing (auto-clears and re-awards achievements)"
	@echo "    Examples:"
	@echo "      make set-streak STREAK=30"
	@echo "      make set-streak STREAK=50 LONGEST=100"
	@echo "      make set-streak STREAK=25 EMAIL=user@test.com"
	@echo ""
	@echo "  make test-exp"
	@echo "    Run full experience endpoint tests"
	@echo ""
	@echo "  make get-token [EMAIL=<email>]"
	@echo "    Get JWT token for API testing"
	@echo ""
	@echo "Evolution Stages Quick Reference:"
	@echo "  Baby (1-5)      | Young (6-15)    | Adult (16-30)"
	@echo "  Prime (31-50)   | Legendary (51+)"
	@echo ""
	@echo "Streak Milestones Quick Reference:"
	@echo "  Getting Started (1-6)    | Building Habit (7-13)"
	@echo "  On Fire (14-29)          | Dedicated (30-49)"
	@echo "  Unstoppable (50-99)      | Legendary (100+)"

set-level:
	@if [ "$(LONGEST)" ]; then \
		uv run --env-file .env.local python set_level.py $(LEVEL) --xp $(XP) --email $(EMAIL); \
	else \
		uv run --env-file .env.local python set_level.py $(LEVEL) --xp $(XP) --email $(EMAIL); \
	fi

set-streak:
	@if [ "$(LONGEST)" ]; then \
		uv run --env-file .env.local python set_streak.py $(STREAK) --longest $(LONGEST) --email $(EMAIL); \
	else \
		uv run --env-file .env.local python set_streak.py $(STREAK) --email $(EMAIL); \
	fi

test-exp:
	@uv run --env-file .env.local python test_experience_endpoints.py

get-token:
	@uv run --env-file .env.local python get_jwt_token.py

# Quick preset commands for common test scenarios
baby-roo:
	@echo "Setting to Baby Roo (Level 3)..."
	@make set-level LEVEL=3

young-roo:
	@echo "Setting to Young Roo (Level 10)..."
	@make set-level LEVEL=10

adult-roo:
	@echo "Setting to Adult Roo (Level 20)..."
	@make set-level LEVEL=20

prime-roo:
	@echo "Setting to Prime Roo (Level 35)..."
	@make set-level LEVEL=35

legendary-roo:
	@echo "Setting to Legendary Roo (Level 55)..."
	@make set-level LEVEL=55

new-streak:
	@echo "Setting streak to 0 (new user)..."
	@make set-streak STREAK=0

fire-streak:
	@echo "Setting streak to 20 days (On Fire)..."
	@make set-streak STREAK=20

legendary-streak:
	@echo "Setting streak to 150 days (Legendary)..."
	@make set-streak STREAK=150
