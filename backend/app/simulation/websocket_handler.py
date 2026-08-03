"""WebSocket gateway for real-time greenhouse simulation."""

import json
import logging

from fastapi import WebSocket, WebSocketDisconnect
from pydantic import ValidationError

from app.simulation.realtime_engine import RealtimeSimulationEngine
from app.simulation.websocket_schemas import (
    WSErrorPayload,
    WSEventType,
    WSUpdateSimulation,
)

logger = logging.getLogger(__name__)

_realtime_engine = RealtimeSimulationEngine()


async def simulation_websocket_handler(websocket: WebSocket) -> None:
    """
    Handle real-time simulation WebSocket connections.

    Accepts UPDATE_SIMULATION events and responds with SIMULATION_RESULTS.
    Supports PING/PONG keepalive for connection health monitoring.
    """
    await websocket.accept()
    logger.info("WebSocket client connected")

    try:
        while True:
            raw = await websocket.receive_text()

            try:
                message = json.loads(raw)
            except json.JSONDecodeError:
                error = WSErrorPayload(message="Invalid JSON payload")
                await websocket.send_text(error.model_dump_json())
                continue

            event_type = message.get("event")

            if event_type == WSEventType.PING:
                await websocket.send_text(json.dumps({"event": WSEventType.PONG}))
                continue

            if event_type != WSEventType.UPDATE_SIMULATION:
                error = WSErrorPayload(message=f"Unsupported event: {event_type}")
                await websocket.send_text(error.model_dump_json())
                continue

            try:
                update = WSUpdateSimulation.model_validate(message)
            except ValidationError as exc:
                error = WSErrorPayload(message=f"Validation error: {exc.error_count()} field(s)")
                await websocket.send_text(error.model_dump_json())
                continue

            results = _realtime_engine.run(update.data)
            await websocket.send_text(results.model_dump_json())

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception:
        logger.exception("WebSocket handler error")
        try:
            error = WSErrorPayload(message="Internal simulation error")
            await websocket.send_text(error.model_dump_json())
        except Exception:
            pass
