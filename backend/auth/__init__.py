"""Auth module (alpha.13) — JWT bearer + bcrypt + SQLite users.

Public API:
- `hash_password(plain) -> str` / `verify_password(plain, hash) -> bool`
- `create_access_token(user_id) -> str` / `decode_access_token(token) -> dict`
- `UsersDB` (SQLite CRUD: register, get_by_email, get_by_id)
- `get_current_user` FastAPI dependency (header Authorization: Bearer)
"""
from .password import hash_password, verify_password
from .jwt_tokens import create_access_token, decode_access_token, JWTError
from .users_db import UsersDB, User, UserAlreadyExistsError, UserNotFoundError
from .dependencies import get_current_user, get_current_user_optional

__all__ = [
    "hash_password", "verify_password",
    "create_access_token", "decode_access_token", "JWTError",
    "UsersDB", "User", "UserAlreadyExistsError", "UserNotFoundError",
    "get_current_user", "get_current_user_optional",
]
