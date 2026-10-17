"""Alert endpoints — retrieves alerts from FalkorDB."""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from app.services.graph_service import graph_service

router = APIRouter()


@router.get("/alerts")
async def list_alerts(
    status: Optional[str] = Query(None, description="Filter by status: open, investigating, resolved"),
    limit: int = Query(20, ge=1, le=100),
):
    """List alerts from the graph database."""
    if not graph_service.connected:
        raise HTTPException(status_code=503, detail="FalkorDB not connected")
    try:
        alerts = graph_service.get_alerts(status=status, limit=limit)
        return {"alerts": alerts, "total": len(alerts)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve alerts: {str(e)}")


@router.get("/alerts/{alert_id}")
async def get_alert(alert_id: str):
    """Get a specific alert by ID."""
    if not graph_service.connected:
        raise HTTPException(status_code=503, detail="FalkorDB not connected")
    try:
        alert = graph_service.get_entity("Alert", alert_id)
        if not alert:
            raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")
        return alert
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
