"""WebSocket per progresso solver real-time + editing collaborativo."""
from __future__ import annotations
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from core.collab import (
    get_collab_manager, Operation, OpKind, EntityKind, Presence,
)

router = APIRouter()

_connections: dict[str, set[WebSocket]] = {}
# Mappa model_id → client_id → WebSocket per il broadcast collaborativo
_collab_connections: dict[str, dict[str, WebSocket]] = {}


@router.websocket("/ws/analysis/{model_id}")
async def analysis_progress(websocket: WebSocket, model_id: str):
    await websocket.accept()
    _connections.setdefault(model_id, set()).add(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        _connections.get(model_id, set()).discard(websocket)


async def broadcast_progress(model_id: str, percent: float, message: str = ""):
    payload = {"model_id": model_id, "progress": float(percent), "message": message}
    conns = list(_connections.get(model_id, set()))
    for ws in conns:
        try:
            await ws.send_json(payload)
        except Exception:
            _connections.get(model_id, set()).discard(ws)


# ─────────────────── Editing collaborativo ───────────────────

async def _broadcast_collab(model_id: str, payload: dict, exclude: str | None = None):
    """Invia payload a tutti i client del model_id eccetto opzionale exclude."""
    conns = _collab_connections.get(model_id, {})
    for cid, ws in list(conns.items()):
        if cid == exclude:
            continue
        try:
            await ws.send_json(payload)
        except Exception:
            conns.pop(cid, None)


@router.websocket("/ws/collab/{model_id}")
async def collab_endpoint(websocket: WebSocket, model_id: str):
    """Editing collaborativo.

    Protocollo messaggi (JSON):
        client -> server:
            {"type": "join", "client_id": "...", "label": "...", "color": "..."}
            {"type": "leave"}
            {"type": "op", "op": "add|update|remove", "entity": "node|element|load|constraint",
              "entity_id": int, "payload": {...}, "lamport": int}
            {"type": "cursor", "x": float, "y": float, "z": float}
        server -> client:
            {"type": "joined", "client_id": ..., "presences": [...]}
            {"type": "op_applied", "operation": {...}}
            {"type": "presence_update", "presences": [...]}
            {"type": "error", "message": "..."}
    """
    await websocket.accept()
    session = get_collab_manager().get_or_create(model_id)
    client_id: str | None = None
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "join":
                client_id = str(data.get("client_id", "anon"))
                presence = Presence(
                    client_id=client_id,
                    label=str(data.get("label", "")),
                    color=str(data.get("color", "#888")),
                )
                session.join(presence)
                _collab_connections.setdefault(model_id, {})[client_id] = websocket
                await websocket.send_json({
                    "type": "joined", "client_id": client_id,
                    "presences": [
                        {"client_id": p.client_id, "label": p.label,
                          "color": p.color}
                        for p in session.presences.values()
                    ],
                })
                await _broadcast_collab(model_id, {
                    "type": "presence_update",
                    "presences": [
                        {"client_id": p.client_id, "label": p.label,
                          "color": p.color}
                        for p in session.presences.values()
                    ],
                }, exclude=client_id)

            elif msg_type == "op":
                if client_id is None:
                    await websocket.send_json(
                        {"type": "error", "message": "Devi inviare prima 'join'"}
                    )
                    continue
                try:
                    op = Operation(
                        op=OpKind(data["op"]),
                        entity=EntityKind(data["entity"]),
                        entity_id=int(data["entity_id"]),
                        payload=data.get("payload"),
                        client_id=client_id,
                        lamport=int(data.get("lamport", 0)),
                    )
                except (KeyError, ValueError) as e:
                    await websocket.send_json(
                        {"type": "error", "message": f"op malformata: {e}"}
                    )
                    continue
                applied = session.apply_operation(op)
                payload_out = {
                    "type": "op_applied",
                    "operation": {
                        "op": applied.op.value,
                        "entity": applied.entity.value,
                        "entity_id": applied.entity_id,
                        "payload": applied.payload,
                        "client_id": applied.client_id,
                        "lamport": applied.lamport,
                    },
                }
                # Broadcast a tutti (incluso il mittente, per confermare lamport)
                await _broadcast_collab(model_id, payload_out)

            elif msg_type == "cursor":
                if client_id is None:
                    continue
                session.update_cursor(
                    client_id,
                    (float(data.get("x", 0)),
                      float(data.get("y", 0)),
                      float(data.get("z", 0))),
                )
                await _broadcast_collab(model_id, {
                    "type": "cursor_update",
                    "client_id": client_id,
                    "cursor": data,
                }, exclude=client_id)

            elif msg_type == "leave":
                break

            else:
                await websocket.send_json(
                    {"type": "error", "message": f"tipo sconosciuto: {msg_type}"}
                )

    except WebSocketDisconnect:
        pass
    finally:
        if client_id:
            session.leave(client_id)
            _collab_connections.get(model_id, {}).pop(client_id, None)
            try:
                await _broadcast_collab(model_id, {
                    "type": "presence_update",
                    "presences": [
                        {"client_id": p.client_id, "label": p.label,
                          "color": p.color}
                        for p in session.presences.values()
                    ],
                })
            except Exception:
                pass
