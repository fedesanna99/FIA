"""Auth module (alpha.13-.15) — JWT bearer + bcrypt + SQLite users +
user_id resolver per propagazione alpha.15.

Public API:
- `hash_password(plain) -> str` / `verify_password(plain, hash) -> bool`
- `create_access_token(user_id) -> str` / `decode_access_token(token) -> dict`
- `UsersDB` (SQLite CRUD: register, get_by_email, get_by_id)
- `get_current_user` FastAPI dependency (header Authorization: Bearer)
- `resolve_user_id(current_user, explicit)` — bridge JWT ↔ demo_user
"""
from .password import hash_password, verify_password
from .jwt_tokens import create_access_token, decode_access_token, JWTError
from .users_db import UsersDB, User, UserAlreadyExistsError, UserNotFoundError
from .dependencies import get_current_user, get_current_user_optional
from .user_resolver import resolve_user_id, DEFAULT_USER_ID

__all__ = [
    "hash_password", "verify_password",
    "create_access_token", "decode_access_token", "JWTError",
    "UsersDB", "User", "UserAlreadyExistsError", "UserNotFoundError",
    "get_current_user", "get_current_user_optional",
    "resolve_user_id", "DEFAULT_USER_ID",
]
