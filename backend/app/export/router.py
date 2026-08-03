"""Climate computer export API routes."""

from fastapi import APIRouter

from app.export.climate_computer import export_climate_computer
from app.export.schemas import ClimateComputerExport, ExportRequest

router = APIRouter(prefix="/export", tags=["Industrial Export"])


@router.post("/climate-computer", response_model=ClimateComputerExport)
async def export_setpoints(request: ExportRequest) -> ClimateComputerExport:
    """Export microclimate setpoints in Priva, Ridder, or Hoogendoorn JSON format."""
    return export_climate_computer(request)
