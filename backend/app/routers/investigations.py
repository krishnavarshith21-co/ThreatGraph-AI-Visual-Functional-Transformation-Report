"""Investigation endpoints — start, track, persist, and manage investigations."""

import asyncio
import json
import os
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field

from app.services.graph_service import graph_service
from app.agent.investigator import run_investigation, _run_autonomous_investigation

router = APIRouter()

DB_FILE_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "investigations_db.json")

# In-memory store backed by disk persistence
investigations_store: dict[str, dict] = {}


def _save_investigations():
    """Persist investigations to local JSON database."""
    try:
        with open(DB_FILE_PATH, "w", encoding="utf-8") as f:
            json.dump(investigations_store, f, indent=2)
    except Exception as e:
        print(f"⚠️ Failed to persist investigations to disk: {e}")


def _load_investigations():
    """Load investigations from persistent disk storage, seeding default if empty."""
    global investigations_store
    if os.path.exists(DB_FILE_PATH):
        try:
            with open(DB_FILE_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    investigations_store = data
                    print(f"✓ Loaded {len(investigations_store)} persistent investigations from disk.")
                    return
        except Exception as e:
            print(f"⚠️ Could not read {DB_FILE_PATH}: {e}")

    _init_demo_investigation()


def _init_demo_investigation():
    """Seed a default completed investigation for immediate inspection."""
    alert = graph_service.get_entity("Alert", "alert-001")
    if alert:
        report = _run_autonomous_investigation("alert-001", alert, "Initial automated triage of alert-001")
        inv_id = "inv-demo-001"
        report["investigation_id"] = inv_id
        investigations_store[inv_id] = {
            "id": inv_id,
            "alert_id": "alert-001",
            "description": "Critical outbound connection to TOR exit node flagged by NIDS",
            "status": "completed",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "report": report,
            "outcome": "containment",
            "outcome_reason": "Confirmed lateral movement and exfiltration path. Host isolation initiated.",
        }
        _save_investigations()


# Initialize on import
_load_investigations()


class StartInvestigationRequest(BaseModel):
    alert_id: str = Field(..., min_length=1)
    description: Optional[str] = None


class RecordOutcomeRequest(BaseModel):
    outcome: str = Field(..., description="further_investigation | accepted | false_positive | containment")
    reason: str = Field(..., min_length=1, max_length=1000)
    recommended_action: Optional[str] = None


@router.post("/investigations")
async def start_investigation(req: StartInvestigationRequest, background_tasks: BackgroundTasks):
    """Start a new AI-powered investigation for an alert."""
    if not graph_service.connected:
        raise HTTPException(status_code=503, detail="Graph service not connected.")

    # Check alert exists
    alert = graph_service.get_entity("Alert", req.alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert {req.alert_id} not found in graph")

    # Prevent duplicate running investigations for same alert
    for inv in investigations_store.values():
        if inv.get("alert_id") == req.alert_id and inv.get("status") == "running":
            raise HTTPException(
                status_code=409,
                detail=f"Investigation already running for alert {req.alert_id}",
            )

    inv_id = f"inv-{req.alert_id}-{int(datetime.now(timezone.utc).timestamp())}"

    investigations_store[inv_id] = {
        "id": inv_id,
        "alert_id": req.alert_id,
        "description": req.description,
        "status": "running",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None,
        "report": None,
        "outcome": None,
        "outcome_reason": None,
    }
    _save_investigations()

    # Run investigation in background
    background_tasks.add_task(_execute_investigation, inv_id, req.alert_id, req.description or "")

    return {
        "id": inv_id,
        "alert_id": req.alert_id,
        "status": "running",
        "message": "Investigation started. Poll /api/investigations/{id} for updates.",
    }


async def _execute_investigation(inv_id: str, alert_id: str, description: str):
    """Execute the investigation, persist to disk, and notify status."""
    try:
        report = await run_investigation(alert_id, description)
        investigations_store[inv_id]["status"] = "completed"
        investigations_store[inv_id]["completed_at"] = datetime.now(timezone.utc).isoformat()
        investigations_store[inv_id]["report"] = report
    except Exception as e:
        investigations_store[inv_id]["status"] = "failed"
        investigations_store[inv_id]["completed_at"] = datetime.now(timezone.utc).isoformat()
        investigations_store[inv_id]["report"] = {
            "error": str(e),
            "summary": f"Investigation failed: {str(e)}",
            "agent_steps": [],
        }
    finally:
        _save_investigations()


@router.get("/investigations")
async def list_investigations(
    status: Optional[str] = None,
    limit: int = 20,
):
    """List all investigations."""
    if not investigations_store:
        _load_investigations()

    invs = list(investigations_store.values())
    if status:
        invs = [i for i in invs if i.get("status") == status]
    invs.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return {"investigations": invs[:limit], "total": len(invs)}


@router.get("/investigations/{investigation_id}")
async def get_investigation(investigation_id: str):
    """Get investigation details and report."""
    if not investigations_store:
        _load_investigations()

    inv = investigations_store.get(investigation_id)
    if not inv and investigation_id in ("inv-001", "INV-001", "inv-1"):
        inv = investigations_store.get("inv-demo-001")

    if not inv:
        raise HTTPException(status_code=404, detail=f"Investigation {investigation_id} not found")
    return inv


@router.get("/investigations/{investigation_id}/timeline")
async def get_investigation_timeline(investigation_id: str):
    """Get the chronological attack timeline associated with this investigation."""
    inv = await get_investigation(investigation_id)
    report = inv.get("report") or {}
    attack_path = report.get("attack_path") or []
    agent_steps = report.get("agent_steps") or []
    return {
        "investigation_id": investigation_id,
        "attack_path": attack_path,
        "agent_steps": agent_steps,
        "count": len(attack_path) + len(agent_steps)
    }


@router.get("/investigations/{investigation_id}/evidence")
async def get_investigation_evidence(investigation_id: str):
    """Get the supporting evidence collected in this investigation."""
    inv = await get_investigation(investigation_id)
    report = inv.get("report") or {}
    evidence = report.get("evidence") or []
    findings = report.get("findings") or []
    contradictions = report.get("contradictions") or []
    return {
        "investigation_id": investigation_id,
        "evidence": evidence,
        "findings": findings,
        "contradictions": contradictions,
        "total_evidence": len(evidence)
    }


@router.post("/investigations/{investigation_id}/outcome")
async def record_outcome(investigation_id: str, req: RecordOutcomeRequest):
    """Record the analyst's outcome decision for an investigation and persist to disk."""
    inv = investigations_store.get(investigation_id)
    if not inv and investigation_id in ("inv-001", "INV-001", "inv-1"):
        inv = investigations_store.get("inv-demo-001")

    if not inv:
        raise HTTPException(status_code=404, detail=f"Investigation {investigation_id} not found")
    if inv.get("status") != "completed":
        raise HTTPException(status_code=400, detail="Can only record outcome for completed investigations")

    valid_outcomes = {"further_investigation", "accepted", "false_positive", "containment"}
    if req.outcome not in valid_outcomes:
        raise HTTPException(status_code=400, detail=f"Invalid outcome. Must be one of: {valid_outcomes}")

    inv["outcome"] = req.outcome
    inv["outcome_reason"] = req.reason
    if req.recommended_action:
        inv["recommended_action_recorded"] = req.recommended_action
    inv["outcome_recorded_at"] = datetime.now(timezone.utc).isoformat()

    _save_investigations()

    return {"message": "Outcome recorded and persisted", "investigation_id": investigation_id, "outcome": req.outcome}


@router.post("/investigations/{investigation_id}/decisions")
async def record_decision_alias(investigation_id: str, req: RecordOutcomeRequest):
    """Alias for /outcome matching API specification."""
    return await record_outcome(investigation_id, req)


@router.get("/investigations/{investigation_id}/report")
async def get_investigation_report_alias(investigation_id: str):
    """Get report for investigation."""
    inv = await get_investigation(investigation_id)
    if not inv.get("report"):
        raise HTTPException(status_code=404, detail="No report available for this investigation")
    return inv["report"]


@router.post("/investigations/{investigation_id}/export")
async def export_investigation_report(investigation_id: str, format: str = "markdown"):
    """Export investigation report in JSON, text, or markdown format."""
    inv = await get_investigation(investigation_id)
    report = inv.get("report")
    if not report:
        raise HTTPException(status_code=404, detail="No report available for export")

    report_copy = dict(report)
    if inv.get("outcome"):
        report_copy["outcome"] = inv["outcome"]
        report_copy["outcome_reason"] = inv.get("outcome_reason")
        report_copy["outcome_recorded_at"] = inv.get("outcome_recorded_at")

    if format == "json":
        return report_copy
    elif format == "markdown":
        from app.routers.reports import _format_report_markdown
        return PlainTextResponse(content=_format_report_markdown(report_copy), media_type="text/markdown")
    elif format == "text":
        from app.routers.reports import _format_report_text
        return PlainTextResponse(content=_format_report_text(report_copy), media_type="text/plain")
    else:
        raise HTTPException(status_code=400, detail="Supported formats: json, markdown, text")
