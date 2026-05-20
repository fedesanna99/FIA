"""
Session manager per editing collaborativo.

Concetti:
    - Operation : descrittore di una modifica (add/update/remove di nodi,
                  elementi, carichi, vincoli).
    - LamportClock : timestamp logico monotono; incrementato a ogni operazione
                     locale e sincronizzato con max(timestamp ricevuto, locale)+1.
    - CollabSession : per ogni model_id; tiene la lista delle operations
                      ordinate e la presence (utenti attivi).

Le operations sono *idempotenti* in senso debole: applicare due volte la
stessa op produce lo stesso stato (l'add con id esistente diventa update).
"""
from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum
from typing import Any
import threading
import time


class OpKind(str, Enum):
    ADD = "add"
    UPDATE = "update"
    REMOVE = "remove"


class EntityKind(str, Enum):
    NODE = "node"
    ELEMENT = "element"
    LOAD = "load"
    CONSTRAINT = "constraint"


@dataclass(frozen=True)
class Operation:
    """Una singola operazione del client.

    Args:
        op           : add | update | remove
        entity       : node | element | load | constraint
        entity_id    : id dell'oggetto (per add, viene assegnato dal client)
        payload      : dict serializzato dell'entità (None per remove)
        client_id    : identificatore del client che ha emesso l'op
        lamport      : timestamp logico
        wall_time_ms : timestamp wall-clock (debug, non usato per ordering)
    """
    op: OpKind
    entity: EntityKind
    entity_id: int
    payload: dict[str, Any] | None
    client_id: str
    lamport: int
    wall_time_ms: float = field(default_factory=lambda: time.time() * 1000.0)

    def sort_key(self) -> tuple[int, str]:
        """Per ordering totale tra operations: lamport prima, poi client_id."""
        return (self.lamport, self.client_id)


class LamportClock:
    """Lamport clock logico, thread-safe."""

    def __init__(self, initial: int = 0):
        self._t = int(initial)
        self._lock = threading.Lock()

    def tick(self) -> int:
        """Increment locale (per evento generato)."""
        with self._lock:
            self._t += 1
            return self._t

    def update(self, received: int) -> int:
        """Sincronizza con un timestamp ricevuto da altri."""
        with self._lock:
            self._t = max(self._t, int(received)) + 1
            return self._t

    @property
    def current(self) -> int:
        with self._lock:
            return self._t


@dataclass
class Presence:
    """Un utente attivo nella sessione."""
    client_id: str
    label: str = ""
    color: str = "#888888"
    joined_at_ms: float = field(default_factory=lambda: time.time() * 1000.0)
    cursor: tuple[float, float, float] | None = None


class CollabSession:
    """Stato condiviso per il model_id.

    Operations history viene mantenuta in lista ordinata per sort_key.
    Le operations possono essere inviate fuori ordine ma vengono inserite
    nel posto giusto (insertion sort), così il replay è deterministico.
    """

    def __init__(self, model_id: str):
        self.model_id = model_id
        self.operations: list[Operation] = []
        self.presences: dict[str, Presence] = {}
        self.clock = LamportClock()
        self._lock = threading.Lock()

    def join(self, presence: Presence) -> None:
        with self._lock:
            self.presences[presence.client_id] = presence

    def leave(self, client_id: str) -> None:
        with self._lock:
            self.presences.pop(client_id, None)

    def update_cursor(
        self, client_id: str,
        cursor: tuple[float, float, float] | None,
    ) -> None:
        with self._lock:
            p = self.presences.get(client_id)
            if p is not None:
                self.presences[client_id] = Presence(
                    client_id=p.client_id, label=p.label, color=p.color,
                    joined_at_ms=p.joined_at_ms, cursor=cursor,
                )

    def apply_operation(self, op: Operation) -> Operation:
        """Inserisce l'op in ordine e sincronizza il clock.

        Ritorna l'op (eventualmente con lamport ri-assegnato se ne forniva 0).
        """
        with self._lock:
            if op.lamport <= 0:
                new_lamport = self.clock.tick()
                op = Operation(
                    op=op.op, entity=op.entity, entity_id=op.entity_id,
                    payload=op.payload, client_id=op.client_id,
                    lamport=new_lamport,
                    wall_time_ms=op.wall_time_ms,
                )
            else:
                self.clock.update(op.lamport)
            # Insertion sort (le ops sono già quasi-ordinate)
            idx = len(self.operations)
            while idx > 0 and self.operations[idx - 1].sort_key() > op.sort_key():
                idx -= 1
            self.operations.insert(idx, op)
            return op

    def history(self) -> list[Operation]:
        with self._lock:
            return list(self.operations)

    def n_users(self) -> int:
        with self._lock:
            return len(self.presences)


class CollabSessionManager:
    """Singleton: mappa model_id → CollabSession."""

    def __init__(self):
        self._sessions: dict[str, CollabSession] = {}
        self._lock = threading.Lock()

    def get_or_create(self, model_id: str) -> CollabSession:
        with self._lock:
            s = self._sessions.get(model_id)
            if s is None:
                s = CollabSession(model_id)
                self._sessions[model_id] = s
            return s

    def get(self, model_id: str) -> CollabSession | None:
        with self._lock:
            return self._sessions.get(model_id)

    def remove(self, model_id: str) -> None:
        with self._lock:
            self._sessions.pop(model_id, None)

    def list_active(self) -> list[str]:
        with self._lock:
            return [mid for mid, s in self._sessions.items() if s.n_users() > 0]


# Singleton globale
_manager = CollabSessionManager()


def get_collab_manager() -> CollabSessionManager:
    return _manager
