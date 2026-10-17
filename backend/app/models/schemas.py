"""Pydantic models for API request/response schemas."""

from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


# ── Enums ───────────────────────────────────────────────────────────

class InvestigationStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class AlertSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class InvestigationOutcome(str, Enum):
    FURTHER_INVESTIGATION = "further_investigation"
    ACCEPTED = "accepted"
    FALSE_POSITIVE = "false_positive"
    CONTAINMENT = "containment"


# ── Request Models ──────────────────────────────────────────────────

class StartInvestigationRequest(BaseModel):
    alert_id: str = Field(..., description="ID of the alert to investigate")
    description: Optional[str] = Field(None, description="Additional context")


class RecordOutcomeRequest(BaseModel):
    outcome: InvestigationOutcome
    reason: str = Field(..., min_length=1, max_length=1000)
    recommended_action: Optional[str] = None


# ── Response Models ─────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    services: dict[str, Any]
    timestamp: str


class AlertResponse(BaseModel):
    id: str
    title: str
    severity: str
    status: str
    source_event_id: Optional[str] = None
    timestamp: str
    description: Optional[str] = None
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None


class GraphDataResponse(BaseModel):
    nodes: list[dict[str, Any]]
    edges: list[dict[str, Any]]
    depth: Optional[int] = None


class AgentStep(BaseModel):
    step: int
    tool: str
    arguments: dict[str, Any]
    result_summary: str
    timestamp: str


class InvestigationReport(BaseModel):
    investigation_id: str
    alert_id: str
    status: InvestigationStatus
    summary: str
    findings: list[str]
    evidence: list[dict[str, Any]]
    contradictions: list[str]
    missing_information: list[str]
    uncertainty_notes: list[str]
    priority_rationale: str
    recommended_action: str
    attack_path: Optional[list[dict[str, Any]]] = None
    agent_steps: list[AgentStep]
    graph_data: Optional[GraphDataResponse] = None
    created_at: str
    completed_at: Optional[str] = None


class InvestigationResponse(BaseModel):
    id: str
    alert_id: str
    status: InvestigationStatus
    created_at: str
    completed_at: Optional[str] = None
    report: Optional[InvestigationReport] = None
    outcome: Optional[str] = None
    outcome_reason: Optional[str] = None
