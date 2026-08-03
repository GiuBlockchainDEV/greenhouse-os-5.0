"""FastAPI application entrypoint for GreenhouseOS 5.0."""

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.ai.router import router as ai_router
from app.simulation.engine import SimulationEngine
from app.simulation.schemas import SimulationRequest, SimulationResponse
from app.simulation.websocket_handler import simulation_websocket_handler

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Enterprise-grade greenhouse virtual twin and agronomic simulation API",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_engine = SimulationEngine()

app.include_router(ai_router, prefix=settings.api_prefix)


@app.get("/health")
async def health_check() -> dict[str, str]:
    """Liveness probe endpoint."""
    return {"status": "healthy", "version": settings.app_version}


@app.post(f"{settings.api_prefix}/simulation/run", response_model=SimulationResponse)
async def run_simulation(request: SimulationRequest) -> SimulationResponse:
    """
    Execute FAO-56 Penman-Monteith ET0 with VPD and DLI agronomic metrics.

    Accepts meteorological climate data and optional covering/crop parameters,
    returning reference evapotranspiration and actionable microclimate indices.
    """
    return _engine.run(request)


@app.websocket("/ws/simulation")
async def ws_simulation(websocket: WebSocket) -> None:
    """Real-time simulation WebSocket endpoint (<50 ms target per update)."""
    await simulation_websocket_handler(websocket)
