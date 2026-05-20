"""
Test sessione collaborativa + WebSocket editing real-time.
"""
from __future__ import annotations
import pytest
from fastapi.testclient import TestClient

from main import app
from core.collab import (
    CollabSession, CollabSessionManager,
    Operation, OpKind, EntityKind, LamportClock, Presence,
    get_collab_manager,
)


class TestLamportClock:
    def test_initial_zero(self):
        c = LamportClock()
        assert c.current == 0

    def test_tick_increments(self):
        c = LamportClock()
        assert c.tick() == 1
        assert c.tick() == 2
        assert c.tick() == 3

    def test_update_with_higher_value(self):
        c = LamportClock(initial=5)
        assert c.update(10) == 11
        assert c.current == 11

    def test_update_with_lower_value(self):
        c = LamportClock(initial=10)
        assert c.update(5) == 11
        assert c.current == 11

    def test_thread_safe_ticks(self):
        """Verifica che i tick siano sequenziali anche concorrenti."""
        import threading
        c = LamportClock()
        results = []
        def worker():
            for _ in range(100):
                results.append(c.tick())
        threads = [threading.Thread(target=worker) for _ in range(4)]
        for t in threads: t.start()
        for t in threads: t.join()
        # Tutti i valori sono distinti
        assert len(set(results)) == 400


class TestCollabSession:
    def test_join_leave(self):
        s = CollabSession("m1")
        s.join(Presence(client_id="c1", label="Alice"))
        assert s.n_users() == 1
        s.join(Presence(client_id="c2", label="Bob"))
        assert s.n_users() == 2
        s.leave("c1")
        assert s.n_users() == 1
        # Leave di client inesistente non crasha
        s.leave("ghost")
        assert s.n_users() == 1

    def test_apply_operation_assigns_lamport_if_zero(self):
        s = CollabSession("m2")
        op = Operation(
            op=OpKind.ADD, entity=EntityKind.NODE, entity_id=1,
            payload={"x": 0, "y": 0, "z": 0},
            client_id="c1", lamport=0,
        )
        applied = s.apply_operation(op)
        assert applied.lamport > 0

    def test_operations_sorted_by_lamport(self):
        s = CollabSession("m3")
        # Inserisco ops fuori ordine
        ops = [
            Operation(op=OpKind.ADD, entity=EntityKind.NODE, entity_id=1,
                       payload={}, client_id="c1", lamport=3),
            Operation(op=OpKind.ADD, entity=EntityKind.NODE, entity_id=2,
                       payload={}, client_id="c1", lamport=1),
            Operation(op=OpKind.ADD, entity=EntityKind.NODE, entity_id=3,
                       payload={}, client_id="c1", lamport=2),
        ]
        for op in ops:
            s.apply_operation(op)
        history = s.history()
        assert [o.lamport for o in history] == [1, 2, 3]

    def test_concurrent_same_lamport_resolved_by_client_id(self):
        s = CollabSession("m4")
        ops = [
            Operation(op=OpKind.ADD, entity=EntityKind.NODE, entity_id=1,
                       payload={}, client_id="alice", lamport=5),
            Operation(op=OpKind.ADD, entity=EntityKind.NODE, entity_id=2,
                       payload={}, client_id="bob", lamport=5),
        ]
        for op in ops:
            s.apply_operation(op)
        history = s.history()
        # Stesso lamport → ordine alfabetico client_id
        assert history[0].client_id == "alice"
        assert history[1].client_id == "bob"

    def test_clock_advances_with_apply(self):
        s = CollabSession("m5")
        op = Operation(op=OpKind.ADD, entity=EntityKind.NODE, entity_id=1,
                        payload={}, client_id="c1", lamport=42)
        s.apply_operation(op)
        # Il clock locale dovrebbe essere max(0, 42)+1 = 43
        assert s.clock.current >= 43

    def test_cursor_update(self):
        s = CollabSession("m6")
        s.join(Presence(client_id="c1"))
        s.update_cursor("c1", (1.0, 2.0, 3.0))
        assert s.presences["c1"].cursor == (1.0, 2.0, 3.0)


class TestCollabSessionManager:
    def test_get_or_create_returns_same(self):
        mgr = CollabSessionManager()
        s1 = mgr.get_or_create("X")
        s2 = mgr.get_or_create("X")
        assert s1 is s2

    def test_remove(self):
        mgr = CollabSessionManager()
        mgr.get_or_create("Y")
        assert mgr.get("Y") is not None
        mgr.remove("Y")
        assert mgr.get("Y") is None

    def test_list_active_only_with_users(self):
        mgr = CollabSessionManager()
        s = mgr.get_or_create("Z")
        assert "Z" not in mgr.list_active()
        s.join(Presence(client_id="u1"))
        assert "Z" in mgr.list_active()


class TestCollabWebSocket:
    """Test end-to-end via TestClient (richiede 'websocket-client' incluso in test deps)."""

    def test_join_and_op_broadcast(self):
        client = TestClient(app)
        with client.websocket_connect("/ws/collab/wstest") as ws1:
            ws1.send_json({"type": "join", "client_id": "alice", "label": "A"})
            joined = ws1.receive_json()
            assert joined["type"] == "joined"
            assert joined["client_id"] == "alice"

            with client.websocket_connect("/ws/collab/wstest") as ws2:
                ws2.send_json({"type": "join", "client_id": "bob", "label": "B"})
                ws2.receive_json()  # joined ack
                # ws1 deve ricevere presence_update
                pres = ws1.receive_json()
                assert pres["type"] == "presence_update"
                assert any(p["client_id"] == "bob" for p in pres["presences"])

                # ws2 invia un'op
                ws2.send_json({
                    "type": "op", "op": "add", "entity": "node",
                    "entity_id": 1, "payload": {"x": 1, "y": 0, "z": 0},
                    "lamport": 0,
                })
                # Sia ws1 che ws2 ricevono op_applied
                rec1 = ws1.receive_json()
                rec2 = ws2.receive_json()
                assert rec1["type"] == "op_applied"
                assert rec2["type"] == "op_applied"
                assert rec1["operation"]["entity_id"] == 1
                # Lamport assegnato dal server > 0
                assert rec1["operation"]["lamport"] > 0

    def test_malformed_op_returns_error(self):
        client = TestClient(app)
        with client.websocket_connect("/ws/collab/wsbad") as ws:
            ws.send_json({"type": "join", "client_id": "x"})
            ws.receive_json()
            ws.send_json({"type": "op", "op": "invalid_kind"})
            err = ws.receive_json()
            assert err["type"] == "error"

    def test_op_before_join_returns_error(self):
        client = TestClient(app)
        with client.websocket_connect("/ws/collab/wsearly") as ws:
            ws.send_json({"type": "op", "op": "add", "entity": "node",
                            "entity_id": 1, "lamport": 1})
            err = ws.receive_json()
            assert err["type"] == "error"
            assert "join" in err["message"].lower()

    def test_unknown_message_type(self):
        client = TestClient(app)
        with client.websocket_connect("/ws/collab/wsuk") as ws:
            ws.send_json({"type": "what_is_this"})
            err = ws.receive_json()
            assert err["type"] == "error"
