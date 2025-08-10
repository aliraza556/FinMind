from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from ..extensions import db
from ..models import User
import logging

bp = Blueprint("auth", __name__)
logger = logging.getLogger("finmind.auth")


@bp.post("/register")
def register():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")
    if not email or not password:
        logger.warning("Register missing email/password")
        return jsonify(error="email and password required"), 400
    if db.session.query(User).filter_by(email=email).first():
        logger.info("Register email already used: %s", email)
        return jsonify(error="email already used"), 400
    user = User(email=email, password_hash=generate_password_hash(password))
    db.session.add(user)
    db.session.commit()
    logger.info("Registered user id=%s email=%s", user.id, email)
    return jsonify(message="registered"), 201


@bp.post("/login")
def login():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")
    user = db.session.query(User).filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, password):
        logger.warning("Login failed for email=%s", email)
        return jsonify(error="invalid credentials"), 401
    access = create_access_token(identity=str(user.id))
    refresh = create_refresh_token(identity=str(user.id))
    logger.info("Login success user_id=%s", user.id)
    return jsonify(access_token=access, refresh_token=refresh)


@bp.post("/refresh")
@jwt_required(refresh=True)
def refresh():
    uid = get_jwt_identity()
    access = create_access_token(identity=str(uid))
    logger.info("Refreshed token for user_id=%s", uid)
    return jsonify(access_token=access)
