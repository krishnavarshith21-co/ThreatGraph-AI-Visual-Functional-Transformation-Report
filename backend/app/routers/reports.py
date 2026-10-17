"""Reports endpoints — retrieve and export investigation reports."""

import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse

from app.routers.investigations import investigations_store

router = APIRouter()


@router.get("/reports")
async def list_reports():
    """List all completed investigation reports."""
    reports = []
    for inv in investigations_store.values():
        if inv["status"] == "completed" and inv.get("report"):
            reports.append({
                "investigation_id": inv["id"],
                "alert_id": inv["alert_id"],
                "summary": inv["report"].get("summary", "")[:200],
                "created_at": inv["created_at"],
                "completed_at": inv["completed_at"],
                "outcome": inv.get("outcome"),
            })
    return {"reports": reports, "total": len(reports)}


@router.get("/reports/{investigation_id}")
async def get_report(investigation_id: str):
    """Get full investigation report."""
    inv = investigations_store.get(investigation_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")
    if not inv.get("report"):
        raise HTTPException(status_code=404, detail="No report available for this investigation")
    return inv["report"]


@router.get("/reports/{investigation_id}/export")
async def export_report(investigation_id: str, format: str = "json"):
    """Export investigation report in specified format."""
    inv = investigations_store.get(investigation_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")
    if not inv.get("report"):
        raise HTTPException(status_code=404, detail="No report available")

    report = dict(inv["report"])
    if inv.get("outcome"):
        report["outcome"] = inv["outcome"]
        report["outcome_reason"] = inv.get("outcome_reason")
        report["outcome_recorded_at"] = inv.get("outcome_recorded_at")

    if format == "json":
        return report
    elif format == "text":
        text = _format_report_text(report)
        return PlainTextResponse(content=text, media_type="text/plain")
    elif format == "markdown":
        md = _format_report_markdown(report)
        return PlainTextResponse(content=md, media_type="text/markdown")
    else:
        raise HTTPException(status_code=400, detail="Supported formats: json, text, markdown")


def _format_report_text(report: dict) -> str:
    """Format report as plain text."""
    lines = [
        "=" * 60,
        "THREATGRAPH AI — INVESTIGATION REPORT",
        "=" * 60,
        f"Investigation ID: {report.get('investigation_id', 'N/A')}",
        f"Alert ID: {report.get('alert_id', 'N/A')}",
        f"Status: {report.get('status', 'N/A')}",
        f"Created: {report.get('created_at', 'N/A')}",
        f"Completed: {report.get('completed_at', 'N/A')}",
        "",
        "SUMMARY",
        "-" * 40,
        report.get("summary", "No summary available."),
        "",
        "FINDINGS",
        "-" * 40,
    ]
    for finding in report.get("findings", []):
        lines.append(f"  • {finding}")

    lines.extend(["", "CONTRADICTIONS", "-" * 40])
    for c in report.get("contradictions", []):
        lines.append(f"  • {c}")
    if not report.get("contradictions"):
        lines.append("  None identified.")

    lines.extend(["", "MISSING INFORMATION", "-" * 40])
    for m in report.get("missing_information", []):
        lines.append(f"  • {m}")

    lines.extend(["", "UNCERTAINTY", "-" * 40])
    for u in report.get("uncertainty_notes", []):
        lines.append(f"  • {u}")

    lines.extend([
        "",
        "PRIORITY RATIONALE",
        "-" * 40,
        report.get("priority_rationale", "N/A"),
        "",
        "RECOMMENDED ACTION",
        "-" * 40,
        report.get("recommended_action", "N/A"),
        "",
        "INVESTIGATION STEPS",
        "-" * 40,
    ])
    for step in report.get("agent_steps", []):
        lines.append(f"  Step {step['step']}: {step['tool']}({json.dumps(step['arguments'])}) → {step['result_summary']}")

    if report.get("outcome"):
        lines.extend([
            "",
            "ANALYST DETERMINATION",
            "-" * 40,
            f"Outcome: {report['outcome']}",
            f"Rationale: {report.get('outcome_reason', 'N/A')}",
            f"Recorded At: {report.get('outcome_recorded_at', 'N/A')}",
        ])

    lines.append("=" * 60)
    return "\n".join(lines)


def _format_report_markdown(report: dict) -> str:
    """Format report as markdown."""
    md = f"""# ThreatGraph AI — Investigation Report

**Investigation ID:** `{report.get('investigation_id', 'N/A')}`
**Alert ID:** `{report.get('alert_id', 'N/A')}`
**Status:** {report.get('status', 'N/A')}
**Created:** {report.get('created_at', 'N/A')}
**Completed:** {report.get('completed_at', 'N/A')}

## Summary

{report.get('summary', 'No summary available.')}

## Key Findings

"""
    for f in report.get("findings", []):
        md += f"- {f}\n"

    md += "\n## Contradictions\n\n"
    for c in report.get("contradictions", []):
        md += f"- {c}\n"
    if not report.get("contradictions"):
        md += "None identified.\n"

    md += "\n## Missing Information\n\n"
    for m in report.get("missing_information", []):
        md += f"- {m}\n"

    md += f"""
## Priority Rationale

{report.get('priority_rationale', 'N/A')}

## Recommended Action

{report.get('recommended_action', 'N/A')}

## Investigation Steps

| Step | Tool | Arguments | Result |
|------|------|-----------|--------|
"""
    for s in report.get("agent_steps", []):
        md += f"| {s['step']} | `{s['tool']}` | `{json.dumps(s['arguments'])}` | {s['result_summary']} |\n"

    if report.get("outcome"):
        md += f"\n## Analyst Determination\n\n"
        md += f"- **Outcome:** `{report['outcome']}`\n"
        if report.get("outcome_reason"):
            md += f"- **Rationale:** {report['outcome_reason']}\n"
        if report.get("outcome_recorded_at"):
            md += f"- **Recorded At:** {report['outcome_recorded_at']}\n"

    return md
