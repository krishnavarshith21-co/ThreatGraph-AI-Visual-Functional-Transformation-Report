"""Health check endpoints — reports actual service states, environment, and security classifications."""

from datetime import datetime, timezone
from fastapi import APIRouter
from app.services.graph_service import graph_service

router = APIRouter()


@router.get("/health")
async def health_check():
    """Check health of all backend services with explicit development and security labeling."""
    graph_health = graph_service.health_check()

    is_live_db = (
        graph_health.get("status") == "connected"
        and graph_health.get("mode") in ("falkordb", "falkordb_cloud")
    )
    overall = "healthy" if is_live_db else "degraded"

    classification = (
        "DEVELOPMENT / UNENCRYPTED"
        if (is_live_db and not graph_health.get("tls_verified"))
        else "DEVELOPMENT / SECURE"
        if (is_live_db and graph_health.get("tls_verified"))
        else "DEVELOPMENT / DEGRADED"
    )

    return {
        "status": overall,
        "environment": "development",
        "classification": classification,
        "services": {
            "api": {
                "status": "running",
                "environment": "development",
            },
            "falkordb": graph_health,
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
