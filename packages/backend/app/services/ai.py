import json
import math
from datetime import date
from dateutil.relativedelta import relativedelta
from sqlalchemy import extract, func
from ..extensions import db
from ..models import Expense, Category
from ..config import Settings

try:
    from openai import OpenAI
except Exception:  # pragma: no cover
    OpenAI = None


_settings = Settings()

MIN_MONTHS = 3
MAX_MONTHS = 6
DEFAULT_BUDGET = 500.0


def _month_range(target_ym: str, lookback: int = MAX_MONTHS):
    """Return list of YYYY-MM strings for *lookback* months before *target_ym*."""
    year, month = map(int, target_ym.split("-"))
    anchor = date(year, month, 1)
    return [
        (anchor - relativedelta(months=i)).strftime("%Y-%m")
        for i in range(1, lookback + 1)
    ]


def _fetch_monthly_totals(uid: int, months: list[str]):
    """Fetch total spending (expenses only, excluding INCOME) per month."""
    results = {}
    for ym in months:
        y, m = map(int, ym.split("-"))
        total = (
            db.session.query(func.coalesce(func.sum(Expense.amount), 0))
            .filter(
                Expense.user_id == uid,
                extract("year", Expense.spent_at) == y,
                extract("month", Expense.spent_at) == m,
                Expense.expense_type != "INCOME",
            )
            .scalar()
        )
        val = float(total or 0)
        if val > 0:
            results[ym] = val
    return results


def _fetch_category_monthly_totals(uid: int, months: list[str]):
    """Fetch spending per category per month (expenses only)."""
    month_filters = []
    for ym in months:
        y, m = map(int, ym.split("-"))
        month_filters.append((y, m))

    rows = (
        db.session.query(
            Expense.category_id,
            func.coalesce(Category.name, "Uncategorized").label("cat_name"),
            extract("year", Expense.spent_at).label("yr"),
            extract("month", Expense.spent_at).label("mo"),
            func.sum(Expense.amount).label("total"),
        )
        .outerjoin(
            Category,
            (Category.id == Expense.category_id) & (Category.user_id == uid),
        )
        .filter(
            Expense.user_id == uid,
            Expense.expense_type != "INCOME",
        )
        .group_by(
            Expense.category_id,
            Category.name,
            extract("year", Expense.spent_at),
            extract("month", Expense.spent_at),
        )
        .all()
    )

    category_data = {}
    for row in rows:
        ym = f"{int(row.yr):04d}-{int(row.mo):02d}"
        if ym not in months:
            continue
        cat_id = row.category_id
        cat_name = row.cat_name or "Uncategorized"
        if cat_id not in category_data:
            category_data[cat_id] = {"name": cat_name, "monthly": {}}
        category_data[cat_id]["monthly"][ym] = float(row.total)

    return category_data


def _weighted_average(values: list[float]) -> float:
    """Compute weighted average giving more weight to recent months.

    Most recent month gets weight = len(values), oldest gets weight = 1.
    """
    if not values:
        return 0.0
    n = len(values)
    weights = list(range(1, n + 1))
    weighted_sum = sum(v * w for v, w in zip(values, weights))
    return weighted_sum / sum(weights)


def _compute_confidence(months_with_data: int) -> dict:
    """Compute confidence score (0.0 - 1.0) and a human-readable label.

    - 0 months => 0.0 (no data)
    - 1 month  => 0.25 (low)
    - 2 months => 0.45 (low-medium)
    - 3 months => 0.65 (medium)
    - 4 months => 0.78 (medium-high)
    - 5 months => 0.88 (high)
    - 6 months => 0.95 (very high)
    """
    if months_with_data <= 0:
        return {"score": 0.0, "label": "no_data", "months_analyzed": 0}

    score = min(1.0, 1 - math.exp(-0.5 * months_with_data))
    score = round(score, 2)

    if score < 0.3:
        label = "low"
    elif score < 0.6:
        label = "medium"
    elif score < 0.85:
        label = "high"
    else:
        label = "very_high"

    return {
        "score": score,
        "label": label,
        "months_analyzed": months_with_data,
    }


def _compute_trend_pct(values: list[float]) -> float:
    """Compute simple trend percentage (most recent vs older average).

    Positive means spending is increasing.
    """
    if len(values) < 2:
        return 0.0
    recent = values[-1]
    older_avg = sum(values[:-1]) / len(values[:-1])
    if older_avg == 0:
        return 0.0
    return round(((recent - older_avg) / older_avg) * 100, 1)


def _build_category_suggestions(
    category_data: dict, months: list[str]
) -> list[dict]:
    """Build per-category budget suggestions with trends."""
    suggestions = []
    sorted_months = sorted(months)

    for cat_id, info in category_data.items():
        monthly = info["monthly"]
        ordered_values = [monthly.get(m, 0.0) for m in sorted_months]
        nonzero = [v for v in ordered_values if v > 0]

        if not nonzero:
            continue

        avg = _weighted_average(nonzero)
        suggested = round(avg * 0.95, 2)
        trend_pct = _compute_trend_pct(nonzero)
        months_active = len(nonzero)

        suggestions.append(
            {
                "category_id": cat_id,
                "category_name": info["name"],
                "suggested_limit": suggested,
                "average_spending": round(avg, 2),
                "trend_pct": trend_pct,
                "trend_direction": (
                    "increasing" if trend_pct > 2
                    else "decreasing" if trend_pct < -2
                    else "stable"
                ),
                "months_with_data": months_active,
                "monthly_history": {
                    m: monthly.get(m, 0.0) for m in sorted_months
                },
            }
        )

    suggestions.sort(key=lambda s: s["average_spending"], reverse=True)
    return suggestions


def _heuristic_budget(uid: int, ym: str, lookback: int = MAX_MONTHS):
    """Build a multi-month heuristic budget suggestion with confidence score."""
    months = _month_range(ym, lookback)
    monthly_totals = _fetch_monthly_totals(uid, months)
    category_data = _fetch_category_monthly_totals(uid, months)

    months_with_data = len(monthly_totals)
    confidence = _compute_confidence(months_with_data)

    if not monthly_totals:
        return {
            "month": ym,
            "suggested_total": DEFAULT_BUDGET,
            "breakdown": {
                "needs": round(DEFAULT_BUDGET * 0.5, 2),
                "wants": round(DEFAULT_BUDGET * 0.3, 2),
                "savings": round(DEFAULT_BUDGET * 0.2, 2),
            },
            "confidence": confidence,
            "category_suggestions": [],
            "data_range": {"months_requested": lookback, "months_with_data": 0},
            "method": "heuristic_default",
        }

    sorted_months = sorted(monthly_totals.keys())
    ordered_totals = [monthly_totals[m] for m in sorted_months]
    weighted_avg = _weighted_average(ordered_totals)

    reduction = 0.95 if months_with_data >= MIN_MONTHS else 0.90
    target = round(weighted_avg * reduction, 2)

    trend_pct = _compute_trend_pct(ordered_totals)

    category_suggestions = _build_category_suggestions(category_data, months)

    return {
        "month": ym,
        "suggested_total": target,
        "breakdown": {
            "needs": round(target * 0.5, 2),
            "wants": round(target * 0.3, 2),
            "savings": round(target * 0.2, 2),
        },
        "confidence": confidence,
        "spending_trend": {
            "direction": (
                "increasing" if trend_pct > 2
                else "decreasing" if trend_pct < -2
                else "stable"
            ),
            "change_pct": trend_pct,
        },
        "category_suggestions": category_suggestions,
        "data_range": {
            "months_requested": lookback,
            "months_with_data": months_with_data,
            "oldest_month": sorted_months[0],
            "newest_month": sorted_months[-1],
        },
        "monthly_totals": {m: monthly_totals.get(m, 0.0) for m in sorted(months)},
        "method": "heuristic",
    }


def monthly_budget_suggestion(uid: int, ym: str, lookback: int = MAX_MONTHS):
    """Generate dynamic budget suggestion using 3-6 months of historical data.

    Falls back to heuristic if OpenAI is unavailable.
    """
    if _settings.openai_api_key and OpenAI:
        try:
            return _openai_budget(uid, ym, lookback)
        except Exception:
            pass
    return _heuristic_budget(uid, ym, lookback)


def _openai_budget(uid: int, ym: str, lookback: int = MAX_MONTHS):
    """Use OpenAI to generate budget suggestions from multi-month data."""
    client = OpenAI(api_key=_settings.openai_api_key)
    months = _month_range(ym, lookback)
    monthly_totals = _fetch_monthly_totals(uid, months)
    category_data = _fetch_category_monthly_totals(uid, months)

    months_with_data = len(monthly_totals)
    confidence = _compute_confidence(months_with_data)

    cat_summary = {}
    for cat_id, info in category_data.items():
        cat_summary[info["name"]] = {
            m: info["monthly"].get(m, 0) for m in sorted(months)
        }

    prompt = (
        "You are a personal finance advisor. Given the following monthly "
        "spending data over multiple months (by category), suggest a budget "
        "for the upcoming month.\n\n"
        f"Target month: {ym}\n"
        f"Monthly totals: {json.dumps(monthly_totals)}\n"
        f"Category breakdown: {json.dumps(cat_summary)}\n\n"
        "Guidelines:\n"
        "- Use the 50/30/20 rule as a baseline (needs/wants/savings)\n"
        "- Weight recent months more heavily\n"
        "- Identify categories with increasing trends and suggest limits\n"
        "- Provide 2-3 actionable tips\n\n"
        "Return ONLY valid JSON with these exact fields:\n"
        "{\n"
        '  "suggested_total": number,\n'
        '  "breakdown": {"needs": number, "wants": number, "savings": number},\n'
        '  "category_suggestions": [{"category_name": string, '
        '"suggested_limit": number, "reason": string}],\n'
        '  "tips": [string]\n'
        "}"
    )

    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        temperature=0.2,
        messages=[{"role": "user", "content": prompt}],
    )
    content = resp.choices[0].message.content

    obj = json.loads(content)
    obj["month"] = ym
    obj["method"] = "openai"
    obj["confidence"] = confidence
    obj["data_range"] = {
        "months_requested": lookback,
        "months_with_data": months_with_data,
    }
    if monthly_totals:
        sorted_keys = sorted(monthly_totals.keys())
        obj["data_range"]["oldest_month"] = sorted_keys[0]
        obj["data_range"]["newest_month"] = sorted_keys[-1]
    obj["monthly_totals"] = {m: monthly_totals.get(m, 0.0) for m in sorted(months)}
    return obj
