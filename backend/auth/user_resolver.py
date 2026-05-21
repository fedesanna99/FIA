"""User-ID resolver (alpha.15) — bridge tra JWT auth e legacy demo_user.

Logica:
  1. Se la request ha un Bearer JWT valido → `current_user.id`
  2. Altrimenti se la request fornisce esplicitamente `user_id` → quello
  3. Altrimenti fallback su `DEFAULT_USER_ID` (env: FEAPRO_DEFAULT_USER_ID,
     default "demo_user")

Cosi' l'app rimane backward-compatible al 100%: utenti anonimi continuano
a fare submit di job come "demo_user", utenti loggati come `<JWT.sub>`.

API endpoint pattern:

    @router.post("...")
    def my_endpoint(
        req: MyRequest,
        current_user: Optional[User] = Depends(get_current_user_optional),
    ):
        user_id = resolve_user_id(current_user, req.user_id)
        ...
"""
from __future__ import annotations

import os
from typing import Optional

from .users_db import User


DEFAULT_USER_ID = os.environ.get("FEAPRO_DEFAULT_USER_ID", "demo_user")


def resolve_user_id(
    current_user: Optional[User],
    explicit_user_id: Optional[str] = None,
) -> str:
    """Determina lo user_id effettivo per l'operazione.

    Args:
        current_user: User dal JWT (se loggato), None altrimenti.
        explicit_user_id: user_id passato nella request (body/query). Usato
            solo come fallback se NON c'e' JWT (utile per testing/CLI).

    Returns:
        user_id da usare in job_store.enqueue, billing, ecc.
    """
    if current_user is not None:
        return current_user.id
    if explicit_user_id and explicit_user_id.strip():
        return explicit_user_id.strip()
    return DEFAULT_USER_ID
