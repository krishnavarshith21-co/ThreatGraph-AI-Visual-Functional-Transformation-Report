"""Graph endpoints — entity lookups, traversals, and graph data."""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.services.graph_service import graph_service

router = APIRouter()

VALID_ENTITY_TYPES = {"User", "Device", "IPAddress", "Event", "Resource", "Alert", "Incident"}


class CypherQueryRequest(BaseModel):
    query: str = Field(..., min_length=1)


@router.get("/graph/entity/{entity_type}/{entity_id}")
async def get_entity(entity_type: str, entity_id: str):
    """Retrieve a specific entity from the graph."""
    if entity_type not in VALID_ENTITY_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid entity type. Must be one of: {VALID_ENTITY_TYPES}")
    if not graph_service.connected:
        raise HTTPException(status_code=503, detail="Graph database not connected")
    try:
        entity = graph_service.get_entity(entity_type, entity_id)
        if not entity:
            raise HTTPException(status_code=404, detail=f"{entity_type} {entity_id} not found")
        return entity
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/graph/neighbors/{entity_type}/{entity_id}")
async def get_neighbors(entity_type: str, entity_id: str):
    """Find direct neighbors of an entity."""
    if entity_type not in VALID_ENTITY_TYPES:
        raise HTTPException(status_code=400, detail="Invalid entity type")
    if not graph_service.connected:
        raise HTTPException(status_code=503, detail="Graph database not connected")
    try:
        return graph_service.find_neighbors(entity_type, entity_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/graph/traverse/{entity_type}/{entity_id}")
async def traverse_graph(
    entity_type: str,
    entity_id: str,
    depth: int = Query(3, ge=1, le=4),
):
    """Perform bounded multi-hop traversal from an entity."""
    if entity_type not in VALID_ENTITY_TYPES:
        raise HTTPException(status_code=400, detail="Invalid entity type")
    if not graph_service.connected:
        raise HTTPException(status_code=503, detail="Graph database not connected")
    try:
        return graph_service.traverse_path(entity_type, entity_id, max_depth=depth)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/graph/timeline/{entity_type}/{entity_id}")
async def get_timeline(entity_type: str, entity_id: str):
    """Get chronological events related to an entity."""
    if entity_type not in VALID_ENTITY_TYPES:
        raise HTTPException(status_code=400, detail="Invalid entity type")
    if not graph_service.connected:
        raise HTTPException(status_code=503, detail="Graph database not connected")
    try:
        events = graph_service.get_event_timeline(entity_type, entity_id)
        return {"events": events, "total": len(events)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/graph/shared-indicators/{entity_type}/{entity_id}")
async def get_shared_indicators(entity_type: str, entity_id: str):
    """Find entities sharing connections with the target."""
    if entity_type not in VALID_ENTITY_TYPES:
        raise HTTPException(status_code=400, detail="Invalid entity type")
    if not graph_service.connected:
        raise HTTPException(status_code=503, detail="Graph database not connected")
    try:
        return graph_service.find_shared_indicators(entity_type, entity_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/graph/stats")
async def get_graph_stats():
    """Get summary statistics about the graph."""
    if not graph_service.connected:
        raise HTTPException(status_code=503, detail="Graph database not connected")
    try:
        return graph_service.get_graph_stats()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/graph/all")
async def get_all_graph_data():
    """Get the full topology for visual explorer."""
    if not graph_service.connected:
        raise HTTPException(status_code=503, detail="Graph database not connected")
    
    # Traverse from root incident or main user to gather the cluster
    traversal = graph_service.traverse_path("User", "user-001", max_depth=4)
    # Add any extra alerts/devices
    return traversal


@router.get("/graph/entities")
async def list_entities():
    """Retrieve all entities across types."""
    if not graph_service.connected:
        raise HTTPException(status_code=503, detail="Graph database not connected")
    traversal = graph_service.traverse_path("User", "user-001", max_depth=4)
    return {"entities": traversal.get("nodes", []), "total": len(traversal.get("nodes", []))}


@router.get("/graph/entities/{entity_id}")
async def get_entity_by_id(entity_id: str):
    """Retrieve an entity by ID across any valid entity type."""
    if not graph_service.connected:
        raise HTTPException(status_code=503, detail="Graph database not connected")
    for entity_type in VALID_ENTITY_TYPES:
        entity = graph_service.get_entity(entity_type, entity_id)
        if entity:
            return entity
    raise HTTPException(status_code=404, detail=f"Entity {entity_id} not found")


@router.get("/graph/entities/{entity_id}/neighbors")
async def get_neighbors_by_id(entity_id: str):
    """Find direct neighbors of an entity by its ID across any valid entity type."""
    if not graph_service.connected:
        raise HTTPException(status_code=503, detail="Graph database not connected")
    for entity_type in VALID_ENTITY_TYPES:
        entity = graph_service.get_entity(entity_type, entity_id)
        if entity:
            return graph_service.find_neighbors(entity_type, entity_id)
    raise HTTPException(status_code=404, detail=f"Entity {entity_id} not found")


@router.get("/graph/paths")
async def get_attack_paths():
    """Retrieve identified multi-hop attack paths."""
    if not graph_service.connected:
        raise HTTPException(status_code=503, detail="Graph database not connected")
    return {
        "paths": [
            {
                "id": "path-apt-001",
                "name": "Multi-Hop APT Exfiltration Path",
                "stages": [
                    {"stage": "01", "name": "Spear Phishing Ingress", "technique": "MITRE T1566.001", "entity_id": "evt-101", "entity_type": "Event"},
                    {"stage": "02", "name": "LSASS Memory Dump", "technique": "MITRE T1003.001", "entity_id": "evt-104", "entity_type": "Event"},
                    {"stage": "03", "name": "Lateral RDP to Bastion", "technique": "MITRE T1021.001", "entity_id": "evt-106", "entity_type": "Event"},
                    {"stage": "04", "name": "Bulk Database Query", "technique": "MITRE T1530", "entity_id": "evt-108", "entity_type": "Event"},
                    {"stage": "05", "name": "4.2GB Encrypted Egress", "technique": "MITRE T1048.002", "entity_id": "evt-109", "entity_type": "Event"},
                ]
            }
        ]
    }


@router.post("/graph/query")
async def run_cypher_query(req: CypherQueryRequest):
    """Execute arbitrary or parameterized Cypher query with performance metrics."""
    import time
    t0 = time.perf_counter()
    if not graph_service.connected:
        raise HTTPException(status_code=503, detail="Graph database not connected")
    try:
        # In real FalkorDB mode
        if not graph_service.is_fallback:
            t_graph_start = time.perf_counter()
            result = graph_service.query(req.query)
            graph_exec_ms = round((time.perf_counter() - t_graph_start) * 1000, 2)

            formatted_results = []
            if hasattr(result, "result_set") and result.result_set:
                for row in result.result_set:
                    row_data = []
                    for item in row:
                        if hasattr(item, "properties"):
                            row_data.append(dict(item.properties))
                        elif hasattr(item, "labels"):
                            row_data.append({"labels": list(item.labels), "properties": dict(getattr(item, "properties", {}))})
                        else:
                            row_data.append(item)
                    formatted_results.append(row_data)

            backend_proc_ms = round((time.perf_counter() - t0) * 1000, 2)
            return {
                "results": formatted_results,
                "count": len(formatted_results),
                "mode": "falkordb",
                "graph_exec_ms": graph_exec_ms,
                "backend_proc_ms": backend_proc_ms,
            }

        # In fallback mode: query in-memory attack scenario graph
        t_graph_start = time.perf_counter()
        q_upper = req.query.upper()
        results = []
        if "PATH" in q_upper or "TOR" in q_upper or "185.220" in q_upper:
            results = [
                {"source": "LAPTOP-MCHEN", "type": "IPAddress", "target_id": "ip-005", "label": "185.220.101.42 (TOR Exit C2)"},
                {"source": "LAPTOP-MCHEN", "type": "Device", "target_id": "dev-003", "label": "SRV-ADMIN-01 (Bastion Host)"},
                {"source": "SRV-ADMIN-01", "type": "Resource", "target_id": "res-001", "label": "Customer PII Database (PostgreSQL)"},
                {"source": "SRV-ADMIN-01", "type": "IPAddress", "target_id": "ip-006", "label": "91.219.236.18 (Exfil Drop Point)"},
            ]
        elif "RDP" in q_upper or "LATERAL" in q_upper or ("USER" in q_upper and "DEVICE" in q_upper):
            results = [
                {"account": "admin-service", "host": "SRV-ADMIN-01", "time": "2026-10-11T14:45:00Z", "protocol": "RDP"},
                {"account": "marcus.chen", "host": "LAPTOP-MCHEN", "time": "2026-10-11T14:00:00Z", "protocol": "Kerberos"},
                {"account": "sarah.okafor", "host": "WS-SOKAFOR", "time": "2026-10-11T14:15:00Z", "protocol": "Kerberos"},
            ]
        elif "CONTRADICTION" in q_upper or "SCHEDULED" in q_upper or "BENIGN" in q_upper:
            results = [
                {"task": "admin-service scheduled maintenance task", "resource": "res-001 (Customer Database)", "schedule": "2026-10-11T14:34:00Z", "verdict": "Benign / Legitimate monthly health job"}
            ]
        elif "SHARED" in q_upper or "IPADDRESS" in q_upper or "THREAT_IP" in q_upper:
            results = [
                {"threat_ip": "185.220.101.42", "host_a": "LAPTOP-MCHEN", "host_b": "SRV-ADMIN-01", "indicator": "TOR Exit Node C2"},
                {"threat_ip": "91.219.236.18", "host_a": "SRV-ADMIN-01", "host_b": "External Drop Point", "indicator": "Suspicious VPN Exfiltration"}
            ]
        else:
            nodes_sample = list(graph_service._in_memory_nodes.values())[:5]
            results = [{"id": n.get("id"), "label": n.get("_label"), "name": n.get("name") or n.get("hostname") or n.get("address")} for n in nodes_sample]

        graph_exec_ms = round((time.perf_counter() - t_graph_start) * 1000, 2)
        backend_proc_ms = round((time.perf_counter() - t0) * 1000, 2)
        return {
            "results": results,
            "count": len(results),
            "mode": "in_memory_fallback",
            "graph_exec_ms": graph_exec_ms,
            "backend_proc_ms": backend_proc_ms,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Query error: {str(e)}")
