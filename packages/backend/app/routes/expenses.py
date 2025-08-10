from datetime import date
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models import Expense, Category
from ..services.cache import cache_delete_patterns, monthly_summary_key
import logging

bp = Blueprint("expenses", __name__)
logger = logging.getLogger("finmind.expenses")


@bp.get("")
@jwt_required()
def list_expenses():
    uid = int(get_jwt_identity())
    items = (
        db.session.query(Expense)
        .filter_by(user_id=uid)
        .order_by(Expense.spent_at.desc())
        .limit(200)
        .all()
    )
    logger.info("List expenses user=%s count=%s", uid, len(items))
    data = [
        {
            "id": e.id,
            "amount": float(e.amount),
            "currency": e.currency,
            "category_id": e.category_id,
            "notes": e.notes,
            "spent_at": e.spent_at.isoformat(),
        }
        for e in items
    ]
    return jsonify(data)


@bp.post("")
@jwt_required()
def create_expense():
    uid = int(get_jwt_identity())
    data = request.get_json() or {}
    e = Expense(
        user_id=uid,
        amount=data.get("amount"),
        currency=data.get("currency", "USD"),
        category_id=data.get("category_id"),
        notes=data.get("notes"),
        spent_at=date.fromisoformat(data.get("spent_at")) if data.get("spent_at") else date.today(),
    )
    db.session.add(e)
    db.session.commit()
    logger.info("Created expense id=%s user=%s amount=%s", e.id, uid, e.amount)
    # Invalidate caches
    cache_delete_patterns([
        monthly_summary_key(uid, e.spent_at.strftime("%Y-%m")),
        f"insights:{uid}:*",
    ])
    return jsonify(id=e.id), 201
