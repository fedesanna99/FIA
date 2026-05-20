"""
Collaboration real-time per FEA Pro.

Architettura:
    - CollabSession   : una sessione per model_id; mantiene presenti, operations
                        history, Lamport clock.
    - Operation       : add/update/remove di nodes/elements/loads/constraints.
    - LamportClock    : timestamp logico per ordinare gli eventi in caso di
                        concorrenza tra client.

Semantica concorrenza:
    - Last-write-wins basato su (lamport, client_id) lessicografico.
    - Le operations applicate in ordine producono lo stato finale; nessun
      auto-merge complesso (sufficiente per uso multi-utente leggero).
"""
from .session import (
    CollabSession, CollabSessionManager,
    Operation, OpKind, EntityKind,
    LamportClock, Presence,
    get_collab_manager,
)

__all__ = [
    "CollabSession", "CollabSessionManager",
    "Operation", "OpKind", "EntityKind",
    "LamportClock", "Presence",
    "get_collab_manager",
]
