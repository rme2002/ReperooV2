from calendar import monthrange
from collections import defaultdict
from datetime import datetime, timezone
from math import floor
from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session

from src.models.model import (
    AvailableMonth,
    CategoryBreakdown,
    MonthSnapshot,
    RecentTransactionSummary,
    SavingsBreakdown,
    SubCategoryBreakdown,
    WeeklySpendingPoint,
)
from src.repositories.budget_plan_repository import BudgetPlanRepository
from src.repositories.insights_repository import InsightsRepository
from src.services.errors import (
    BudgetPlanNotFoundError,
    InsightsValidationError,
)


class InsightsService:
    """Service for generating insights from transaction data."""

    def __init__(
        self,
        insights_repository: InsightsRepository,
        budget_plan_repository: BudgetPlanRepository,
    ):
        self.insights_repository = insights_repository
        self.budget_plan_repository = budget_plan_repository
        # Cache for colors (loaded once per service instance)
        self._category_colors: Optional[dict[str, str]] = None
        self._subcategory_colors: Optional[dict[str, str]] = None

    async def get_month_snapshot(
        self,
        user_id: UUID,
        year: int,
        month: int,
        session: Session,
    ) -> MonthSnapshot:
        """
        Generate complete month snapshot with all aggregations.

        Args:
            user_id: User ID
            year: Year (2000-2100)
            month: Month (1-12)
            session: Database session

        Returns:
            MonthSnapshot model with all insights data

        Raises:
            InsightsValidationError: If year or month is invalid
            BudgetPlanNotFoundError: If user has no budget plan
        """
        # Validate parameters
        if not (2000 <= year <= 2100):
            raise InsightsValidationError(f"Invalid year: {year}. Must be between 2000 and 2100.")
        if not (1 <= month <= 12):
            raise InsightsValidationError(f"Invalid month: {month}. Must be between 1 and 12.")

        # Get month boundaries
        start_date, end_date = self._get_month_boundaries(year, month)

        # Get budget plan
        budget_plan = self.budget_plan_repository.get_budget_plan_by_user_id(session, user_id)
        if not budget_plan:
            raise BudgetPlanNotFoundError("Budget plan not found. Create one to view insights.")

        # Load colors from database
        self._load_category_colors(session)

        # Get all expense transactions for the month
        transactions = self.insights_repository.get_expense_transactions_by_month(
            session, user_id, start_date, end_date
        )

        # Calculate total spent
        total_spent = sum(t.amount for t in transactions)

        # Get logged days count
        logged_days = self.insights_repository.count_logged_days(
            session, user_id, start_date, end_date
        )

        # Get category aggregations
        category_aggs = self.insights_repository.aggregate_by_category(
            session, user_id, start_date, end_date
        )

        # Transform category aggregations into CategoryBreakdown structure
        categories = self._build_category_breakdown(category_aggs, total_spent)

        # Get weekly aggregations
        weekly_aggs = self.insights_repository.aggregate_by_week(
            session, user_id, start_date, end_date
        )

        # Transform weekly aggregations into WeeklySpendingPoint structure
        weekly = self._build_weekly_breakdown(weekly_aggs, year, month)

        # Calculate savings and investments
        savings = self._build_savings_breakdown(
            session, user_id, start_date, end_date, year, month
        )

        # Get recent transactions
        recent_txns = self.insights_repository.get_recent_transactions(
            session, user_id, start_date, end_date, limit=5
        )

        # Transform recent transactions
        transactions_summary = self._build_transactions_summary(recent_txns)

        # Calculate previous month total and delta
        prev_year, prev_month = self._get_previous_month(year, month)
        prev_start, prev_end = self._get_month_boundaries(prev_year, prev_month)
        prev_transactions = self.insights_repository.get_expense_transactions_by_month(
            session, user_id, prev_start, prev_end
        )
        prev_total = sum(t.amount for t in prev_transactions)
        last_month_delta = self._calculate_month_over_month_delta(total_spent, prev_total)

        # Get total days in month
        total_days = monthrange(year, month)[1]

        # Calculate budget from total income transactions for the month
        total_income = self.insights_repository.get_total_income(
            session, user_id, start_date, end_date
        )

        # Build and return MonthSnapshot
        # Use the middle of the requested month for currentDate (not the current system time)
        # This ensures the frontend calculates date ranges for the correct month
        current_date_for_month = datetime(year, month, 15, 12, 0, 0, tzinfo=timezone.utc)

        return MonthSnapshot(
            key=self._format_month_key(year, month),
            label=self._format_month_label(year, month),
            currentDate=current_date_for_month.isoformat(),
            loggedDays=logged_days,
            totalDays=total_days,
            totalSpent=float(total_spent),
            budget=float(total_income),
            lastMonthDelta=last_month_delta,
            categories=categories,
            savings=savings,
            weekly=weekly,
            transactions=transactions_summary,
        )

    async def list_available_months(
        self,
        user_id: UUID,
        session: Session,
    ) -> list[AvailableMonth]:
        """
        Get list of months with transaction data.

        Args:
            user_id: User ID
            session: Database session

        Returns:
            List of AvailableMonth objects sorted by most recent first
        """
        months = self.insights_repository.get_available_months(session, user_id)

        return [
            AvailableMonth(
                key=self._format_month_key(m["year"], m["month"]),
                label=self._format_month_label(m["year"], m["month"]),
                year=m["year"],
                month=m["month"],
            )
            for m in months
        ]

    def _load_category_colors(self, session: Session) -> None:
        """Load category and subcategory colors from database."""
        if self._category_colors is None:
            self._category_colors = self.insights_repository.get_category_colors(session)
        if self._subcategory_colors is None:
            self._subcategory_colors = self.insights_repository.get_subcategory_colors(session)

    def _build_category_breakdown(
        self,
        aggregations: list[dict],
        total_spent: Decimal,
    ) -> list[CategoryBreakdown]:
        """
        Build CategoryBreakdown structure from aggregations.

        Args:
            aggregations: Raw aggregations from repository
            total_spent: Total spending for percentage calculation

        Returns:
            List of CategoryBreakdown objects sorted by percent descending
        """
        # Group by category
        category_data = defaultdict(lambda: {"total": Decimal("0"), "count": 0, "subcategories": []})

        for agg in aggregations:
            cat_id = agg["category_id"]
            subcat_id = agg["subcategory_id"]
            total = agg["total"]
            count = agg["count"]

            category_data[cat_id]["total"] += total
            category_data[cat_id]["count"] += count

            if subcat_id:
                category_data[cat_id]["subcategories"].append({
                    "id": subcat_id,
                    "total": total,
                })

        # Pre-calculate rounded category percentages that sum to 100
        category_ids = list(category_data.keys())
        category_raw_percents = [
            self._calculate_percent(category_data[cat_id]["total"], total_spent)
            for cat_id in category_ids
        ]
        category_percents = self._round_percentages(category_raw_percents)
        category_percent_by_id = {
            cat_id: percent for cat_id, percent in zip(category_ids, category_percents)
        }

        # Build CategoryBreakdown objects
        categories = []
        for cat_id, data in category_data.items():
            cat_total = data["total"]
            cat_percent = category_percent_by_id.get(cat_id, 0)
            cat_color = self._category_colors.get(cat_id, "#cccccc")

            # Build subcategories
            subcategories = []
            if data["subcategories"]:
                subcategory_raw_percents = [
                    self._calculate_percent(sub["total"], cat_total)
                    for sub in data["subcategories"]
                ]
                subcategory_percents = self._round_percentages(subcategory_raw_percents)
                for sub, sub_percent in zip(data["subcategories"], subcategory_percents):
                    sub_color = self._subcategory_colors.get(sub["id"], "#cccccc")
                    subcategories.append(
                        SubCategoryBreakdown(
                            id=sub["id"],
                            total=float(sub["total"]),
                            percent=sub_percent,
                            color=sub_color,
                        )
                    )

            categories.append(
                CategoryBreakdown(
                    id=cat_id,
                    total=float(cat_total),
                    percent=cat_percent,
                    items=data["count"],
                    color=cat_color,
                    subcategories=subcategories if subcategories else None,
                )
            )

        # Sort by percent descending
        categories.sort(key=lambda c: c.percent, reverse=True)
        return categories

    def _build_weekly_breakdown(
        self,
        aggregations: list[dict],
        year: int,
        month: int,
    ) -> list[WeeklySpendingPoint]:
        """
        Build WeeklySpendingPoint structure from aggregations.

        Args:
            aggregations: Raw weekly aggregations from repository
            year: Year
            month: Month

        Returns:
            List of WeeklySpendingPoint objects with all weeks (1-6)
        """
        # Create dict from aggregations
        weekly_data = {agg["week"]: agg["total"] for agg in aggregations}

        # Calculate max possible week in month
        total_days = monthrange(year, month)[1]
        max_week = ((total_days - 1) // 7) + 1

        # Build weekly points with all weeks
        weekly = []
        for week_num in range(1, max_week + 1):
            total = weekly_data.get(week_num, Decimal("0"))
            weekly.append(
                WeeklySpendingPoint(
                    week=week_num,
                    label=f"Week {week_num}",
                    total=float(total),
                )
            )

        return weekly

    def _build_savings_breakdown(
        self,
        session: Session,
        user_id: UUID,
        start_date: datetime,
        end_date: datetime,
        year: int,
        month: int,
    ) -> SavingsBreakdown:
        """
        Build SavingsBreakdown structure.

        Args:
            session: Database session
            user_id: User ID
            start_date: Start of current month
            end_date: End of current month
            year: Current year
            month: Current month

        Returns:
            SavingsBreakdown object with current and delta values
        """
        # Get current month totals
        saved = self.insights_repository.get_total_by_category(
            session, user_id, "savings", start_date, end_date
        )
        invested = self.insights_repository.get_total_by_category(
            session, user_id, "investments", start_date, end_date
        )

        # Get previous month totals for delta
        prev_year, prev_month = self._get_previous_month(year, month)
        prev_start, prev_end = self._get_month_boundaries(prev_year, prev_month)

        prev_saved = self.insights_repository.get_total_by_category(
            session, user_id, "savings", prev_start, prev_end
        )
        prev_invested = self.insights_repository.get_total_by_category(
            session, user_id, "investments", prev_start, prev_end
        )

        # Calculate deltas
        saved_delta = self._calculate_month_over_month_delta(saved, prev_saved) if prev_saved else None
        invested_delta = self._calculate_month_over_month_delta(invested, prev_invested) if prev_invested else None

        return SavingsBreakdown(
            saved=float(saved),
            invested=float(invested),
            savedDelta=saved_delta,
            investedDelta=invested_delta,
        )

    def _build_transactions_summary(
        self,
        transactions: list,
    ) -> list[RecentTransactionSummary]:
        """
        Build RecentTransactionSummary list from transactions.

        Args:
            transactions: List of Transaction models

        Returns:
            List of RecentTransactionSummary objects
        """
        return [
            RecentTransactionSummary(
                amount=float(t.amount),
                categoryId=t.expense_category_id,
                subcategoryId=t.expense_subcategory_id,
                date=t.occurred_at,
            )
            for t in transactions
        ]

    def _calculate_month_over_month_delta(
        self,
        current: Decimal,
        previous: Decimal,
    ) -> float:
        """
        Calculate percentage change from previous month.

        Formula: (current - previous) / previous

        Args:
            current: Current month value
            previous: Previous month value

        Returns:
            Delta as float (0.12 = 12% increase)
        """
        if previous == 0:
            return 1.0 if current > 0 else 0.0

        return float((current - previous) / previous)

    def _calculate_percent(self, part: Decimal, total: Decimal) -> float:
        """
        Calculate percentage with proper handling of zero total.

        Args:
            part: Part value
            total: Total value

        Returns:
            Percentage as float (0-100 scale)
        """
        if total == 0:
            return 0.0
        return float((part / total) * 100)

    def _round_percentages(self, percents: list[float]) -> list[int]:
        """
        Round percentages to whole integers while ensuring the sum is 100.

        Args:
            percents: Raw percentages (float) that should total ~100

        Returns:
            List of integer percentages summing to 100 (or all zeros if total is 0)
        """
        if not percents:
            return []

        total = sum(percents)
        if total == 0:
            return [0 for _ in percents]

        scale = 100.0 / total
        scaled = [p * scale for p in percents]
        rounded = [int(floor(p)) for p in scaled]
        remainder = 100 - sum(rounded)

        if remainder > 0:
            remainders = sorted(
                [(idx, scaled[idx] - rounded[idx]) for idx in range(len(scaled))],
                key=lambda item: item[1],
                reverse=True,
            )
            for idx in range(remainder):
                rounded[remainders[idx][0]] += 1
        elif remainder < 0:
            remainders = sorted(
                [(idx, scaled[idx] - rounded[idx]) for idx in range(len(scaled))],
                key=lambda item: item[1],
            )
            for idx in range(-remainder):
                target_idx = remainders[idx][0]
                if rounded[target_idx] > 0:
                    rounded[target_idx] -= 1

        return rounded

    def _get_month_boundaries(self, year: int, month: int) -> tuple[datetime, datetime]:
        """
        Get first and last moment of month in UTC.

        Args:
            year: Year
            month: Month (1-12)

        Returns:
            Tuple of (start_date, end_date)
        """
        # First moment: YYYY-MM-01 00:00:00.000000+00:00
        start_date = datetime(year, month, 1, 0, 0, 0, tzinfo=timezone.utc)

        # Last moment: YYYY-MM-DD 23:59:59.999999+00:00
        last_day = monthrange(year, month)[1]
        end_date = datetime(year, month, last_day, 23, 59, 59, 999999, tzinfo=timezone.utc)

        return start_date, end_date

    def _get_previous_month(self, year: int, month: int) -> tuple[int, int]:
        """
        Get previous month's year and month.

        Args:
            year: Current year
            month: Current month (1-12)

        Returns:
            Tuple of (prev_year, prev_month)
        """
        if month == 1:
            return year - 1, 12
        return year, month - 1

    def _format_month_key(self, year: int, month: int) -> str:
        """
        Format as 'dec-2025'.

        Args:
            year: Year
            month: Month (1-12)

        Returns:
            Month key string
        """
        month_names = ['jan', 'feb', 'mar', 'apr', 'may', 'jun',
                       'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
        return f"{month_names[month - 1]}-{year}"

    def _format_month_label(self, year: int, month: int) -> str:
        """
        Format as 'December 2025'.

        Args:
            year: Year
            month: Month (1-12)

        Returns:
            Month label string
        """
        month_names = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December']
        return f"{month_names[month - 1]} {year}"
