"""Comprehensive Verification Test Suite for ThreatGraph AI Backend.

Executes all 10 audit requirements:
- Service health & degradation states
- Graph traversal, node queries, Cypher execution
- Full investigation pipeline (start, poll, trace steps, findings, outcome)
- Traceability of findings to graph records
- Contradiction & uncertainty honesty
- Reports & export validation (JSON, Markdown, Text)
- Error handling & edge cases (404, 400, 409, 503)
"""

import os
import sys
import json
import time

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.dirname(__file__))

from starlette.testclient import TestClient
from app.main import app
from app.services.graph_service import graph_service
from app.routers.investigations import investigations_store

client = TestClient(app)

results = {
    "passed": [],
    "failed": [],
    "details": {},
}

def record_pass(test_name, detail=""):
    results["passed"].append(test_name)
    results["details"][test_name] = {"status": "PASSED", "detail": detail}
    print(f"  ✓ {test_name}: {detail}")

def record_fail(test_name, reason=""):
    results["failed"].append(test_name)
    results["details"][test_name] = {"status": "FAILED", "reason": reason}
    print(f"  ✗ {test_name}: {reason}")

print("\n" + "="*70)
print("THREATGRAPH AI — SYSTEM VERIFICATION AUDIT")
print("="*70)

# ── TEST 1: Health Check Endpoint ──────────────────────────────────
print("\n[Section 1: Health Check & Service Status]")
try:
    res = client.get("/api/health")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    data = res.json()
    assert "status" in data, "Missing overall status"
    assert "services" in data, "Missing services object"
    assert data["services"]["api"]["status"] == "running", "API service not running"
    assert "falkordb" in data["services"], "Missing falkordb health"
    record_pass("Health Check /api/health", f"Status={data['status']}, Mode={data['services']['falkordb'].get('mode')}")
except Exception as e:
    record_fail("Health Check /api/health", str(e))

# ── TEST 2: Alerts Endpoint ─────────────────────────────────────────
print("\n[Section 2: Alerts Ingestion & Retrieval]")
try:
    res = client.get("/api/alerts")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    data = res.json()
    assert "alerts" in data, "Missing alerts array"
    assert len(data["alerts"]) > 0, "No alerts found"
    alert_ids = [a["id"] for a in data["alerts"]]
    assert "alert-001" in alert_ids, "alert-001 missing"
    record_pass("List Alerts /api/alerts", f"Retrieved {len(data['alerts'])} alerts: {alert_ids}")
except Exception as e:
    record_fail("List Alerts /api/alerts", str(e))

# ── TEST 3: Direct Graph Querying & Schema Stats ───────────────────
print("\n[Section 3: Graph Engine & Topology Queries]")
try:
    stats_res = client.get("/api/graph/stats")
    assert stats_res.status_code == 200, f"Expected 200, got {stats_res.status_code}"
    stats_data = stats_res.json()
    counts = stats_data["node_counts"]
    assert counts.get("User", 0) > 0, "No User nodes"
    assert counts.get("Device", 0) > 0, "No Device nodes"
    assert counts.get("Event", 0) > 0, "No Event nodes"
    assert counts.get("IPAddress", 0) > 0, "No IPAddress nodes"
    assert counts.get("Resource", 0) > 0, "No Resource nodes"
    record_pass("Graph Stats /api/graph/stats", f"Counts: {counts}")
except Exception as e:
    record_fail("Graph Stats /api/graph/stats", str(e))

try:
    # Entity lookup
    user_res = client.get("/api/graph/entity/User/user-001")
    assert user_res.status_code == 200, f"Expected 200, got {user_res.status_code}"
    user_data = user_res.json()
    assert user_data["name"] == "Marcus Chen", f"Expected Marcus Chen, got {user_data.get('name')}"
    record_pass("Get Entity /api/graph/entity/User/user-001", f"Found user '{user_data['name']}' ({user_data['role']})")
except Exception as e:
    record_fail("Get Entity /api/graph/entity/User/user-001", str(e))

try:
    # Neighbors lookup
    nbr_res = client.get("/api/graph/neighbors/Device/dev-001")
    assert nbr_res.status_code == 200, f"Expected 200, got {nbr_res.status_code}"
    nbr_data = nbr_res.json()
    neighbors = nbr_data.get("neighbors", [])
    relationships = nbr_data.get("relationships", [])
    assert len(neighbors) > 0, "No neighbors found for dev-001"
    record_pass("Get Neighbors /api/graph/neighbors/Device/dev-001", f"{len(neighbors)} neighbors, {len(relationships)} relationships")
except Exception as e:
    record_fail("Get Neighbors /api/graph/neighbors/Device/dev-001", str(e))

try:
    # Bounded multi-hop traversal (depth = 3)
    trav_res = client.get("/api/graph/traverse/Device/dev-001?depth=3")
    assert trav_res.status_code == 200, f"Expected 200, got {trav_res.status_code}"
    trav_data = trav_res.json()
    assert len(trav_data.get("nodes", [])) >= 10, "Traversal returned too few nodes"
    assert len(trav_data.get("edges", [])) >= 10, "Traversal returned too few edges"
    record_pass("Multi-Hop Traversal /api/graph/traverse", f"Mapped {len(trav_data['nodes'])} nodes, {len(trav_data['edges'])} edges at depth 3")
except Exception as e:
    record_fail("Multi-Hop Traversal /api/graph/traverse", str(e))

try:
    # Event timeline lookup
    time_res = client.get("/api/graph/timeline/User/user-001")
    assert time_res.status_code == 200, f"Expected 200, got {time_res.status_code}"
    time_data = time_res.json()
    events = time_data.get("events", [])
    assert len(events) > 0, "No events in timeline for user-001"
    # Verify chronological order
    timestamps = [e.get("timestamp", "") for e in events]
    assert timestamps == sorted(timestamps), "Events are not sorted chronologically"
    record_pass("Event Timeline /api/graph/timeline", f"Retrieved {len(events)} chronologically sorted events")
except Exception as e:
    record_fail("Event Timeline /api/graph/timeline", str(e))

try:
    # Shared indicators
    shared_res = client.get("/api/graph/shared-indicators/Device/dev-003")
    assert shared_res.status_code == 200, f"Expected 200, got {shared_res.status_code}"
    shared_data = shared_res.json()
    assert "shared_indicators" in shared_data, "Missing shared_indicators"
    record_pass("Shared Indicators /api/graph/shared-indicators", f"Retrieved {len(shared_data['shared_indicators'])} correlations")
except Exception as e:
    record_fail("Shared Indicators /api/graph/shared-indicators", str(e))

try:
    # Full topology export /api/graph/all
    all_res = client.get("/api/graph/all")
    assert all_res.status_code == 200, f"Expected 200, got {all_res.status_code}"
    all_data = all_res.json()
    assert len(all_data.get("nodes", [])) > 0, "No nodes in full topology"
    record_pass("Full Topology /api/graph/all", f"{len(all_data['nodes'])} nodes, {len(all_data['edges'])} edges")
except Exception as e:
    record_fail("Full Topology /api/graph/all", str(e))

# ── TEST 4: Full End-to-End Investigation Workflow ───────────────────
print("\n[Section 4: Synthetic Investigation Execution Workflow]")
inv_id = None
try:
    # Start investigation on alert-002 (Credential dump)
    start_res = client.post("/api/investigations", json={
        "alert_id": "alert-002",
        "description": "Verification audit run for credential access on LAPTOP-MCHEN"
    })
    assert start_res.status_code == 200, f"Expected 200, got {start_res.status_code}: {start_res.text}"
    start_data = start_res.json()
    inv_id = start_data["id"]
    assert inv_id.startswith("inv-alert-002"), f"Unexpected ID format: {inv_id}"
    record_pass("Start Investigation POST /api/investigations", f"Dispatched {inv_id} for alert-002")
except Exception as e:
    record_fail("Start Investigation POST /api/investigations", str(e))

# Check investigation progress & completion
if inv_id:
    try:
        # Since BackgroundTasks in TestClient run synchronously, it should already be completed
        detail_res = client.get(f"/api/investigations/{inv_id}")
        assert detail_res.status_code == 200, f"Expected 200, got {detail_res.status_code}"
        detail_data = detail_res.json()
        status = detail_data["status"]
        assert status == "completed", f"Investigation status is {status}, expected completed"
        
        report = detail_data["report"]
        assert report is not None, "Report object is None"
        steps = report.get("agent_steps", [])
        assert len(steps) >= 5, f"Expected >= 5 agent steps, got {len(steps)}"
        record_pass("Investigation Completion & Report Retrieval", f"Status={status}, {len(steps)} autonomous steps")
    except Exception as e:
        record_fail("Investigation Completion & Report Retrieval", str(e))

# ── TEST 5: Autonomous AI Agent Tool Calling Traceability ────────────
print("\n[Section 5: AI Agent Tool Decisions & Grounding]")
if inv_id:
    try:
        inv = client.get(f"/api/investigations/{inv_id}").json()
        report = inv["report"]
        steps = report["agent_steps"]

        # Step 1: Must query alert details
        assert steps[0]["tool"] == "get_alert_details", f"Step 1 was {steps[0]['tool']}, expected get_alert_details"
        assert steps[0]["arguments"]["alert_id"] == "alert-002"

        # Step 2: Must query triggering event details
        assert steps[1]["tool"] == "get_event_details", f"Step 2 was {steps[1]['tool']}, expected get_event_details"
        source_event_id = steps[1]["arguments"]["event_id"]
        assert source_event_id == "evt-104", f"Expected source event evt-104 for alert-002, got {source_event_id}"

        # Step 3: Must find neighbors of triggering event
        assert steps[2]["tool"] == "find_entity_neighbors"
        assert steps[2]["arguments"]["entity_id"] == source_event_id

        # Step 4: Must traverse attack path from discovered endpoint
        assert steps[3]["tool"] == "traverse_attack_path"

        # Step 5: Must examine timeline
        assert steps[4]["tool"] == "get_event_timeline"

        record_pass("Agent Tool Decision Chain", f"Verified sequence: {[s['tool'] for s in steps]}")
    except Exception as e:
        record_fail("Agent Tool Decision Chain", str(e))

# ── TEST 6: Findings Traceability & Contradiction Honesty ────────────
print("\n[Section 6: Evidence Grounding & Contradictions]")
if inv_id:
    try:
        inv = client.get(f"/api/investigations/{inv_id}").json()
        report = inv["report"]
        findings = report.get("findings", [])
        contradictions = report.get("contradictions", [])
        missing_info = report.get("missing_information", [])
        uncertainties = report.get("uncertainty_notes", [])

        assert len(findings) > 0, "No findings generated"
        assert len(contradictions) > 0, "Contradictions not reported"
        assert len(missing_info) > 0, "Missing information not reported"
        assert len(uncertainties) > 0, "Uncertainty notes not reported"

        # Verify evidence provenance
        evidence_list = report.get("evidence", [])
        assert len(evidence_list) == len(report.get("agent_steps", [])), "Evidence count mismatch with steps"

        # Check honest contradiction reporting
        has_maintenance_contradiction = any("maintenance" in c.lower() or "evt-301" in c for c in contradictions)
        assert has_maintenance_contradiction, "Benign maintenance contradiction missing"

        record_pass("Findings & Contradictions Honesty", f"{len(findings)} findings, {len(contradictions)} contradictions, {len(missing_info)} information gaps")
    except Exception as e:
        record_fail("Findings & Contradictions Honesty", str(e))

# ── TEST 7: Record Analyst Outcome Decision ─────────────────────────
print("\n[Section 7: Analyst Outcome Commit Hook]")
if inv_id:
    try:
        outcome_res = client.post(f"/api/investigations/{inv_id}/outcome", json={
            "outcome": "containment",
            "reason": "Host LAPTOP-MCHEN and SRV-ADMIN-01 isolated due to confirmed credential dumping and multi-hop exfiltration path.",
            "recommended_action": "Revoke admin-service credentials and initiate forensics."
        })
        assert outcome_res.status_code == 200, f"Expected 200, got {outcome_res.status_code}"
        outcome_data = outcome_res.json()
        assert outcome_data["outcome"] == "containment"

        # Verify persistence in investigation dossier
        updated_inv = client.get(f"/api/investigations/{inv_id}").json()
        assert updated_inv["outcome"] == "containment"
        assert "isolated" in updated_inv["outcome_reason"]
        record_pass("Record Outcome POST /outcome", f"Outcome successfully committed and persisted as '{updated_inv['outcome']}'")
    except Exception as e:
        record_fail("Record Outcome POST /outcome", str(e))

# ── TEST 8: Reports Listing and Multi-Format Exports ────────────────
print("\n[Section 8: Reports Listing & Export Formats]")
try:
    rep_list_res = client.get("/api/reports")
    assert rep_list_res.status_code == 200, f"Expected 200, got {rep_list_res.status_code}"
    rep_list = rep_list_res.json().get("reports", [])
    assert len(rep_list) > 0, "No reports available"
    rep_inv_id = rep_list[0]["investigation_id"]

    # Export JSON
    json_export = client.get(f"/api/reports/{rep_inv_id}/export?format=json")
    assert json_export.status_code == 200
    json_data = json_export.json()
    assert "summary" in json_data and "findings" in json_data

    # Export Markdown
    md_export = client.get(f"/api/reports/{rep_inv_id}/export?format=markdown")
    assert md_export.status_code == 200
    assert "text/markdown" in md_export.headers["content-type"]
    md_text = md_export.text
    assert "# ThreatGraph AI — Investigation Report" in md_text
    assert "## Key Findings" in md_text
    assert "## Investigation Steps" in md_text

    # Export Plain Text
    txt_export = client.get(f"/api/reports/{rep_inv_id}/export?format=text")
    assert txt_export.status_code == 200
    assert "text/plain" in txt_export.headers["content-type"]
    assert "THREATGRAPH AI — INVESTIGATION REPORT" in txt_export.text

    record_pass("Reports & Multi-Format Exports", f"Successfully exported report {rep_inv_id} as JSON, Markdown, and Text")
except Exception as e:
    record_fail("Reports & Multi-Format Exports", str(e))

# ── TEST 9: Error Handling & Boundary Edge Cases ────────────────────
print("\n[Section 9: Error Handling, Boundary & Degradation Cases]")

# 9.1 Invalid Entity Type
try:
    res = client.get("/api/graph/entity/InvalidEntityType/xyz")
    assert res.status_code == 400, f"Expected 400, got {res.status_code}"
    record_pass("Invalid Entity Type -> 400", f"Returned 400 with message: {res.json().get('detail')}")
except Exception as e:
    record_fail("Invalid Entity Type -> 400", str(e))

# 9.2 Non-Existent Entity ID
try:
    res = client.get("/api/graph/entity/User/user-non-existent-999")
    assert res.status_code == 404, f"Expected 404, got {res.status_code}"
    record_pass("Non-Existent Entity -> 404", f"Returned 404: {res.json().get('detail')}")
except Exception as e:
    record_fail("Non-Existent Entity -> 404", str(e))

# 9.3 Investigation on Non-Existent Alert
try:
    res = client.post("/api/investigations", json={"alert_id": "alert-nonexistent-999"})
    assert res.status_code == 404, f"Expected 404, got {res.status_code}"
    record_pass("Start Investigation Non-Existent Alert -> 404", f"Returned 404: {res.json().get('detail')}")
except Exception as e:
    record_fail("Start Investigation Non-Existent Alert -> 404", str(e))

# 9.4 Duplicate Running Investigation Prevention
try:
    # Temporarily set an investigation to 'running'
    investigations_store["test-dup"] = {
        "id": "test-dup", "alert_id": "alert-003", "status": "running",
        "created_at": "2026-10-12T00:00:00Z", "completed_at": None, "report": None, "outcome": None
    }
    dup_res = client.post("/api/investigations", json={"alert_id": "alert-003"})
    assert dup_res.status_code == 409, f"Expected 409 Conflict, got {dup_res.status_code}"
    record_pass("Duplicate Running Investigation -> 409 Conflict", f"Returned 409: {dup_res.json().get('detail')}")
    del investigations_store["test-dup"]
except Exception as e:
    record_fail("Duplicate Running Investigation -> 409 Conflict", str(e))

# 9.5 Invalid Outcome Value
if inv_id:
    try:
        bad_outcome_res = client.post(f"/api/investigations/{inv_id}/outcome", json={
            "outcome": "invalid_outcome_value",
            "reason": "Test reason"
        })
        assert bad_outcome_res.status_code == 400, f"Expected 400, got {bad_outcome_res.status_code}"
        record_pass("Invalid Outcome Enum -> 400", f"Returned 400: {bad_outcome_res.json().get('detail')}")
    except Exception as e:
        record_fail("Invalid Outcome Enum -> 400", str(e))

# 9.6 Traversal Depth Boundary Validation (depth > 4 should fail 422)
try:
    res = client.get("/api/graph/traverse/Device/dev-001?depth=10")
    assert res.status_code == 422, f"Expected 422 Unprocessable Entity, got {res.status_code}"
    record_pass("Traversal Depth Boundary (>4) -> 422", "Query parameter validation enforced")
except Exception as e:
    record_fail("Traversal Depth Boundary (>4) -> 422", str(e))

# 9.7 Database Disconnection Handling (503 Service Unavailable)
try:
    # Temporarily disconnect graph service
    orig_connected = graph_service._connected
    graph_service._connected = False
    
    disc_res = client.get("/api/graph/stats")
    assert disc_res.status_code == 503, f"Expected 503, got {disc_res.status_code}"
    
    disc_inv = client.post("/api/investigations", json={"alert_id": "alert-001"})
    assert disc_inv.status_code == 503, f"Expected 503, got {disc_inv.status_code}"
    
    health_disc = client.get("/api/health").json()
    assert health_disc["status"] == "degraded" or health_disc["services"]["falkordb"]["status"] == "disconnected"
    
    # Restore connection
    graph_service._connected = orig_connected
    record_pass("Database Disconnection Handling -> 503 & Degraded Health", "All graph endpoints gracefully return 503 when disconnected")
except Exception as e:
    graph_service._connected = True
    record_fail("Database Disconnection Handling -> 503 & Degraded Health", str(e))

# ── Section 10: TLS Hardening, Security Classification & Idempotency ──
print("\n[Section 10: TLS Hardening, Security Classification & Idempotency]")

# 10.1 Health Endpoint TLS & Security Classification
try:
    health_res = client.get("/api/health")
    assert health_res.status_code == 200, f"Expected 200, got {health_res.status_code}"
    health_data = health_res.json()
    assert health_data.get("environment") == "development", "Missing or incorrect top-level environment"
    assert health_data.get("classification") == "DEVELOPMENT / UNENCRYPTED", f"Unexpected classification: {health_data.get('classification')}"
    
    fdb_health = health_data["services"]["falkordb"]
    assert "tls" in fdb_health, "Missing tls dictionary in falkordb health"
    assert fdb_health["security_label"] == "DEVELOPMENT / UNENCRYPTED", f"Expected 'DEVELOPMENT / UNENCRYPTED', got {fdb_health.get('security_label')}"
    assert fdb_health["encryption"] == "none (plain_tcp)", "Expected encryption 'none (plain_tcp)'"
    assert fdb_health["environment"] == "development", "Missing falkordb environment"
    assert fdb_health["tier"] == "falkordb_cloud_free", "Missing falkordb tier"
    
    # Critical verification: plain TCP must NEVER be labeled SECURE
    if not fdb_health.get("tls_verified"):
        assert "SECURE" not in fdb_health["security_label"], "Unencrypted connection falsely labeled SECURE"
        assert fdb_health["tls"]["verified"] is False, "tls.verified falsely True"
    
    record_pass(
        "Health Endpoint TLS & Security Labeling",
        f"Environment={health_data['environment']}, Classification={health_data['classification']}, SecurityLabel={fdb_health['security_label']}, Encryption={fdb_health['encryption']}"
    )
except Exception as e:
    record_fail("Health Endpoint TLS & Security Labeling", str(e))

# 10.2 Idempotent Graph Seeding Verification
try:
    from seeds.seed_graph import seed_data
    # Capture before counts
    before_stats = client.get("/api/graph/stats").json()["node_counts"]
    # Seed again without clearing
    seed_result = seed_data(clear_first=False)
    # Capture after counts
    after_stats = client.get("/api/graph/stats").json()["node_counts"]
    
    assert before_stats == after_stats, f"Node counts mutated after repeated seed: before={before_stats}, after={after_stats}"
    assert seed_result["nodes"] == 49, f"Expected 49 nodes, got {seed_result['nodes']}"
    assert seed_result["relationships"] == 57, f"Expected 57 relationships, got {seed_result['relationships']}"
    record_pass(
        "Graph Seeding Idempotency Audit",
        f"Repeated run preserved exact topology: {seed_result['nodes']} nodes, {seed_result['relationships']} relationships (0 duplicates)"
    )
except Exception as e:
    record_fail("Graph Seeding Idempotency Audit", str(e))

# ── SUMMARY ────────────────────────────────────────────────────────
print("\n" + "="*70)
print(f"VERIFICATION RESULTS: {len(results['passed'])} PASSED, {len(results['failed'])} FAILED")
print("="*70)
with open("test_results.json", "w") as f:
    json.dump(results, f, indent=2)
print("Wrote detailed results to backend/test_results.json\n")
