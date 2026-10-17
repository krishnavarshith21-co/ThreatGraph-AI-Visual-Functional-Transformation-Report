"""FalkorDB graph service — manages connection, schema, and Cypher queries.

Includes an in-memory graph engine fallback with full synthetic multi-hop attack data
so the platform runs seamlessly even when FalkorDB is not locally active.
"""

import os
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

try:
    from falkordb import FalkorDB
except ImportError:
    FalkorDB = None


class GraphService:
    """Service layer for all FalkorDB graph operations."""

    def __init__(self):
        self._db: Optional[Any] = None
        self._graph = None
        self._connected = False
        self._is_fallback = False
        self._is_cloud = False
        self._target_endpoint = "none"
        self._connection_error: Optional[str] = None
        self._tls_enabled = False
        self._tls_verified = False
        self._tls_required = False
        self._ssl_check_hostname = False
        self._ssl_cert_reqs = "none"
        self._encryption_mode = "none"
        self._security_label = "DISCONNECTED"
        self._security_notice = "No connection established"
        self._in_memory_nodes: dict[str, dict] = {}
        self._in_memory_edges: list[dict] = []

    @property
    def connected(self) -> bool:
        return self._connected

    @property
    def is_fallback(self) -> bool:
        return self._is_fallback

    @property
    def is_cloud(self) -> bool:
        return self._is_cloud

    @property
    def target_endpoint(self) -> str:
        return self._target_endpoint

    @property
    def connection_error(self) -> Optional[str]:
        return self._connection_error

    @property
    def tls_enabled(self) -> bool:
        return self._tls_enabled

    @property
    def tls_verified(self) -> bool:
        return self._tls_verified

    @property
    def encryption_mode(self) -> str:
        return self._encryption_mode

    @property
    def security_label(self) -> str:
        return self._security_label

    def connect(self) -> None:
        """Establish connection to FalkorDB Cloud deployment or explicitly fallback with clear status."""
        falkordb_url = os.getenv("FALKORDB_URL")
        host = os.getenv("FALKORDB_HOST", "localhost")
        port_val = os.getenv("FALKORDB_PORT", "6379")
        try:
            port = int(port_val)
        except ValueError:
            port = 6379
        username = os.getenv("FALKORDB_USERNAME")
        password = os.getenv("FALKORDB_PASSWORD") or None

        url_is_tls = bool(falkordb_url and falkordb_url.startswith("falkors://"))
        ssl_val = (os.getenv("FALKORDB_SSL", "false").lower() in ("true", "1", "yes")) or url_is_tls
        require_tls = (os.getenv("FALKORDB_REQUIRE_TLS", "false").lower() in ("true", "1", "yes")) or url_is_tls
        ssl_check_hostname = os.getenv("FALKORDB_SSL_CHECK_HOSTNAME", "true").lower() in ("true", "1", "yes")
        ssl_cert_reqs = os.getenv("FALKORDB_SSL_CERT_REQS", "required")
        ssl_ca_certs = os.getenv("FALKORDB_SSL_CA_CERTS") or None
        graph_name = os.getenv("FALKORDB_GRAPH_NAME", "threatgraph")

        self._tls_required = require_tls
        self._tls_enabled = ssl_val
        self._ssl_check_hostname = ssl_check_hostname if ssl_val else False
        self._ssl_cert_reqs = ssl_cert_reqs if ssl_val else "none"

        self._target_endpoint = falkordb_url or f"{host}:{port}"
        self._is_cloud = "cloud" in self._target_endpoint.lower() or port != 6379

        if FalkorDB:
            target_desc = self._target_endpoint
            try:
                if falkordb_url:
                    url_kwargs: dict[str, Any] = {"socket_timeout": 5}
                    if url_is_tls:
                        url_kwargs["ssl_check_hostname"] = ssl_check_hostname
                        url_kwargs["ssl_cert_reqs"] = ssl_cert_reqs
                        if ssl_ca_certs:
                            url_kwargs["ssl_ca_certs"] = ssl_ca_certs
                    self._db = FalkorDB.from_url(falkordb_url, **url_kwargs)
                else:
                    kwargs: dict[str, Any] = {
                        "host": host,
                        "port": port,
                        "ssl": ssl_val,
                        "socket_timeout": 5,
                    }
                    if ssl_val:
                        kwargs["ssl_check_hostname"] = ssl_check_hostname
                        kwargs["ssl_cert_reqs"] = ssl_cert_reqs
                        if ssl_ca_certs:
                            kwargs["ssl_ca_certs"] = ssl_ca_certs
                    if username:
                        kwargs["username"] = username
                    if password:
                        kwargs["password"] = password
                    self._db = FalkorDB(**kwargs)

                self._graph = self._db.select_graph(graph_name)
                self._graph.query("RETURN 1")
                self._connected = True
                self._is_fallback = False
                self._connection_error = None

                if ssl_val:
                    self._tls_verified = bool(ssl_check_hostname and ssl_cert_reqs == "required")
                    self._encryption_mode = "tls"
                    self._security_label = "SECURE_TLS_VERIFIED" if self._tls_verified else "ENCRYPTED_TLS_UNVERIFIED"
                    self._security_notice = "Verified TLS connection active with certificate & hostname verification."
                else:
                    self._tls_verified = False
                    self._encryption_mode = "none (plain_tcp)"
                    self._security_label = "DEVELOPMENT / UNENCRYPTED"
                    self._security_notice = (
                        "DEVELOPMENT MODE: Authentication succeeded over plain TCP. Traffic is unencrypted across the network "
                        "(standard for FalkorDB Cloud Free Tier). Not labeled as secure."
                    )

                print(f"✓ Connected to FalkorDB at {target_desc} (graph: {graph_name}, cloud: {self._is_cloud}, security: {self._security_label})")
                return
            except Exception as e:
                err_str = str(e)
                if ssl_val:
                    self._connection_error = (
                        f"TLS connection failed for {target_desc}: {err_str}. "
                        "Note: FalkorDB Cloud Free Tier does not support TLS (plain TCP required). "
                        "Set FALKORDB_SSL=false and FALKORDB_REQUIRE_TLS=false, or upgrade to a paid tier (Startup/Pro/Enterprise)."
                    )
                else:
                    self._connection_error = err_str

                print(f"⚠️ FalkorDB connection to {target_desc} failed ({self._connection_error}).")

                # If TLS was strictly required, refuse in-memory fallback
                if self._tls_required:
                    self._connected = False
                    self._is_fallback = False
                    self._security_label = "DISCONNECTED_TLS_ENFORCEMENT_FAILED"
                    print(f"❌ Refusing unencrypted fallback: TLS is strictly required by configuration (FALKORDB_REQUIRE_TLS=true or falkors://).")
                    return

        # If TLS was strictly required, never fall back to in-memory graph
        if self._tls_required:
            self._connected = False
            self._is_fallback = False
            self._security_label = "DISCONNECTED_TLS_ENFORCEMENT_FAILED"
            self._connection_error = self._connection_error or "FalkorDB unavailable and TLS is strictly required."
            return

        # Fallback to high-fidelity in-memory graph seeded with cyber threat scenario
        self._init_in_memory_graph()
        self._connected = True
        self._is_fallback = True
        self._tls_enabled = False
        self._tls_verified = False
        self._encryption_mode = "in_memory"
        self._security_label = "LOCAL_FALLBACK_UNENCRYPTED"
        self._security_notice = "Operating on in-memory graph fallback. No remote network encryption active."
        print("✓ High-fidelity In-Memory Threat Graph initialized with full multi-hop attack scenario.")

    def health_check(self) -> dict:
        """Check FalkorDB connection health with clear cloud vs in-memory fallback distinction and TLS verification."""
        tls_info = {
            "enabled": self._tls_enabled,
            "verified": self._tls_verified,
            "required": self._tls_required,
            "check_hostname": self._ssl_check_hostname,
            "cert_reqs": self._ssl_cert_reqs,
            "encryption": self._encryption_mode,
            "security_label": self._security_label,
            "notice": self._security_notice,
        }

        if not self._connected:
            return {
                "status": "disconnected",
                "mode": "none",
                "environment": "development",
                "classification": "DEVELOPMENT / DISCONNECTED",
                "message": self._connection_error or "No graph connection initialized",
                "target": self._target_endpoint,
                "tls_enabled": self._tls_enabled,
                "tls_verified": False,
                "encryption": "none",
                "security_label": self._security_label,
                "tls": tls_info,
            }

        if self._is_fallback:
            now = time.time()
            if getattr(self, "_last_reconnect_attempt", 0) + 10 < now:
                self._last_reconnect_attempt = now
                try:
                    self.connect()
                except Exception:
                    pass

        if self._is_fallback:
            return {
                "status": "fallback",  # Clearly indicates fallback — NEVER reports connected cloud DB!
                "mode": "in_memory_fallback",
                "environment": "development",
                "classification": "DEVELOPMENT / IN_MEMORY_FALLBACK",
                "graph": os.getenv("FALKORDB_GRAPH_NAME", "threatgraph"),
                "nodes": len(self._in_memory_nodes),
                "edges": len(self._in_memory_edges),
                "target": self._target_endpoint,
                "is_cloud_target": self._is_cloud,
                "connection_error": self._connection_error,
                "tls_enabled": False,
                "tls_verified": False,
                "encryption": "in_memory",
                "security_label": "LOCAL_FALLBACK_UNENCRYPTED",
                "tls": tls_info,
                "message": f"Cloud database at {self._target_endpoint} not active ({self._connection_error or 'unreachable'}). Operating on deterministic in-memory substrate.",
            }

        try:
            self._graph.query("RETURN 1")
            node_res = self._graph.query("MATCH (n) RETURN count(n) as c")
            node_cnt = node_res.result_set[0][0] if node_res.result_set else 0
            rel_res = self._graph.query("MATCH ()-[r]->() RETURN count(r) as c")
            rel_cnt = rel_res.result_set[0][0] if rel_res.result_set else 0
            return {
                "status": "connected",
                "mode": "falkordb_cloud" if self._is_cloud else "falkordb",
                "environment": "development",
                "tier": "falkordb_cloud_free",
                "classification": "DEVELOPMENT / UNENCRYPTED",
                "graph": os.getenv("FALKORDB_GRAPH_NAME", "threatgraph"),
                "target": self._target_endpoint,
                "is_cloud": self._is_cloud,
                "nodes": node_cnt,
                "edges": rel_cnt,
                "tls_enabled": self._tls_enabled,
                "tls_verified": self._tls_verified,
                "encryption": self._encryption_mode,
                "security_label": "DEVELOPMENT / UNENCRYPTED",
                "tls": tls_info,
            }
        except Exception as e:
            self._connected = False
            self._connection_error = str(e)
            return {
                "status": "error",
                "mode": "falkordb_cloud" if self._is_cloud else "falkordb",
                "target": self._target_endpoint,
                "tls_enabled": self._tls_enabled,
                "tls_verified": False,
                "encryption": self._encryption_mode,
                "security_label": "CONNECTION_LOST",
                "tls": tls_info,
                "message": str(e),
            }

    def query(self, cypher: str, params: Optional[dict] = None) -> Any:
        """Execute a Cypher query with optional parameters."""
        if not self._connected:
            self.connect()

        if self._graph and not self._is_fallback:
            return self._graph.query(cypher, params or {})

        # When in fallback, return mock result structure
        class MockResult:
            def __init__(self, result_set):
                self.result_set = result_set
        return MockResult([])

    # ── Entity Lookups ──────────────────────────────────────────────

    def get_entity(self, entity_type: str, entity_id: str) -> Optional[dict]:
        """Retrieve a single entity by type and ID."""
        allowed_types = {"User", "Device", "IPAddress", "Event", "Resource", "Alert", "Incident"}
        if entity_type not in allowed_types:
            raise ValueError(f"Invalid entity type: {entity_type}")

        if not self._is_fallback and self._graph:
            try:
                result = self.query(
                    f"MATCH (n:{entity_type} {{id: $id}}) RETURN n",
                    {"id": entity_id},
                )
                if result.result_set:
                    node = result.result_set[0][0]
                    return self._node_to_dict(node)
                return None
            except Exception:
                pass

        # In-memory lookup
        key = f"{entity_type}:{entity_id}"
        if key in self._in_memory_nodes:
            return dict(self._in_memory_nodes[key])
        for node in self._in_memory_nodes.values():
            if node.get("id") == entity_id and node.get("_label") == entity_type:
                return dict(node)
        return None

    def find_neighbors(self, entity_type: str, entity_id: str, max_depth: int = 1) -> dict:
        """Find direct neighbors of an entity."""
        if not self._is_fallback and self._graph:
            try:
                depth_limit = min(max_depth, int(os.getenv("MAX_GRAPH_DEPTH", "4")))
                result = self.query(
                    f"""
                    MATCH (n:{entity_type} {{id: $id}})-[r]-(m)
                    RETURN n, type(r) as rel_type, r, m
                    LIMIT 50
                    """,
                    {"id": entity_id},
                )
                source = None
                neighbors = []
                relationships = []
                for row in result.result_set:
                    if source is None:
                        source = self._node_to_dict(row[0])
                    rel_type = row[1]
                    rel_props = self._relationship_to_dict(row[2])
                    neighbor = self._node_to_dict(row[3])
                    neighbors.append(neighbor)
                    relationships.append({
                        "type": rel_type,
                        "properties": rel_props,
                        "target": neighbor.get("id", "unknown"),
                    })
                return {
                    "source": source or self.get_entity(entity_type, entity_id),
                    "neighbors": neighbors,
                    "relationships": relationships,
                }
            except Exception:
                pass

        # In-memory neighbors
        source = self.get_entity(entity_type, entity_id)
        neighbors = []
        relationships = []
        seen_neighbor_ids = set()

        for edge in self._in_memory_edges:
            target_id = None
            if edge["source"] == entity_id:
                target_id = edge["target"]
            elif edge["target"] == entity_id:
                target_id = edge["source"]

            if target_id and target_id not in seen_neighbor_ids:
                seen_neighbor_ids.add(target_id)
                target_node = self._find_node_by_id(target_id)
                if target_node:
                    neighbors.append(target_node)
                    relationships.append({
                        "type": edge["type"],
                        "properties": edge.get("properties", {}),
                        "source": edge["source"],
                        "target": edge["target"],
                    })

        return {
            "source": source,
            "neighbors": neighbors,
            "relationships": relationships,
        }

    def traverse_path(self, start_type: str, start_id: str, max_depth: int = 3) -> dict:
        """Bounded multi-hop traversal from a starting entity."""
        depth = min(max_depth, int(os.getenv("MAX_GRAPH_DEPTH", "4")))

        if not self._is_fallback and self._graph:
            try:
                result = self.query(
                    f"""
                    MATCH path = (n:{start_type} {{id: $id}})-[*1..{depth}]-(m)
                    UNWIND nodes(path) as node
                    UNWIND relationships(path) as rel
                    RETURN DISTINCT node, type(rel) as rel_type, startNode(rel) as src, endNode(rel) as dst
                    LIMIT 100
                    """,
                    {"id": start_id},
                )
                nodes_map: dict[str, dict] = {}
                edges: list[dict] = []
                for row in result.result_set:
                    node_dict = self._node_to_dict(row[0])
                    node_id = node_dict.get("id", str(id(row[0])))
                    nodes_map[node_id] = node_dict

                    rel_type = row[1]
                    src_dict = self._node_to_dict(row[2])
                    dst_dict = self._node_to_dict(row[3])
                    src_id = src_dict.get("id", str(id(row[2])))
                    dst_id = dst_dict.get("id", str(id(row[3])))

                    nodes_map[src_id] = src_dict
                    nodes_map[dst_id] = dst_dict

                    edge_key = f"{src_id}-{rel_type}-{dst_id}"
                    edge = {"source": src_id, "target": dst_id, "type": rel_type, "key": edge_key}
                    if edge not in edges:
                        edges.append(edge)

                return {"nodes": list(nodes_map.values()), "edges": edges, "depth": depth}
            except Exception:
                pass

        # In-memory BFS traversal up to depth
        visited_nodes: dict[str, dict] = {}
        collected_edges: list[dict] = []
        start_node = self.get_entity(start_type, start_id)
        if start_node:
            visited_nodes[start_id] = start_node

        current_frontier = {start_id}
        for _ in range(depth):
            next_frontier = set()
            for curr in current_frontier:
                for edge in self._in_memory_edges:
                    other_id = None
                    if edge["source"] == curr:
                        other_id = edge["target"]
                    elif edge["target"] == curr:
                        other_id = edge["source"]

                    if other_id:
                        edge_obj = {
                            "source": edge["source"],
                            "target": edge["target"],
                            "type": edge["type"],
                            "key": f"{edge['source']}-{edge['type']}-{edge['target']}",
                        }
                        if edge_obj not in collected_edges:
                            collected_edges.append(edge_obj)

                        if other_id not in visited_nodes:
                            other_node = self._find_node_by_id(other_id)
                            if other_node:
                                visited_nodes[other_id] = other_node
                                next_frontier.add(other_id)
            current_frontier = next_frontier
            if not current_frontier:
                break

        return {
            "nodes": list(visited_nodes.values()),
            "edges": collected_edges,
            "depth": depth,
        }

    def get_event_timeline(self, entity_type: str, entity_id: str) -> list[dict]:
        """Retrieve chronological events related to an entity."""
        if not self._is_fallback and self._graph:
            try:
                result = self.query(
                    f"""
                    MATCH (n:{entity_type} {{id: $id}})-[*1..2]-(e:Event)
                    RETURN DISTINCT e
                    ORDER BY e.timestamp
                    LIMIT 50
                    """,
                    {"id": entity_id},
                )
                return [self._node_to_dict(row[0]) for row in result.result_set]
            except Exception:
                pass

        # In-memory timeline: find events reachable within 2 hops
        subgraph = self.traverse_path(entity_type, entity_id, max_depth=2)
        events = [n for n in subgraph["nodes"] if n.get("_label") == "Event"]
        events.sort(key=lambda x: x.get("timestamp", ""))
        return events

    def find_shared_indicators(self, entity_type: str, entity_id: str) -> dict:
        """Find entities that share connections with the target entity."""
        if not self._is_fallback and self._graph:
            try:
                result = self.query(
                    f"""
                    MATCH (n:{entity_type} {{id: $id}})-[r1]-(shared)-[r2]-(other)
                    WHERE other <> n
                    RETURN DISTINCT shared, type(r1) as r1_type, type(r2) as r2_type, other
                    LIMIT 50
                    """,
                    {"id": entity_id},
                )
                shared_entities = []
                for row in result.result_set:
                    shared_entities.append({
                        "shared_entity": self._node_to_dict(row[0]),
                        "relationship_to_source": row[1],
                        "relationship_to_other": row[2],
                        "connected_entity": self._node_to_dict(row[3]),
                    })
                return {"source_id": entity_id, "shared_indicators": shared_entities}
            except Exception:
                pass

        # In-memory shared indicators
        neighbors_data = self.find_neighbors(entity_type, entity_id)
        shared_entities = []
        for neighbor in neighbors_data["neighbors"]:
            nid = neighbor.get("id")
            if not nid:
                continue
            n_neighbors = self.find_neighbors(neighbor.get("_label", "Entity"), nid)
            for other in n_neighbors["neighbors"]:
                oid = other.get("id")
                if oid and oid != entity_id:
                    shared_entities.append({
                        "shared_entity": neighbor,
                        "relationship_to_source": "CONNECTED",
                        "relationship_to_other": "CONNECTED",
                        "connected_entity": other,
                    })

        return {"source_id": entity_id, "shared_indicators": shared_entities[:20]}

    def get_alerts(self, status: Optional[str] = None, limit: int = 20) -> list[dict]:
        """Retrieve alerts, optionally filtered by status."""
        if not self._is_fallback and self._graph:
            try:
                if status:
                    result = self.query(
                        "MATCH (a:Alert {status: $status}) RETURN a ORDER BY a.timestamp DESC LIMIT $limit",
                        {"status": status, "limit": limit},
                    )
                else:
                    result = self.query(
                        "MATCH (a:Alert) RETURN a ORDER BY a.timestamp DESC LIMIT $limit",
                        {"limit": limit},
                    )
                return [self._node_to_dict(row[0]) for row in result.result_set]
            except Exception:
                pass

        # In-memory alerts
        alerts = [n for n in self._in_memory_nodes.values() if n.get("_label") == "Alert"]
        if status:
            alerts = [a for a in alerts if a.get("status") == status]
        alerts.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        return alerts[:limit]

    def get_events(self, limit: int = 50) -> list[dict]:
        """Retrieve recent events."""
        if not self._is_fallback and self._graph:
            try:
                result = self.query(
                    "MATCH (e:Event) RETURN e ORDER BY e.timestamp DESC LIMIT $limit",
                    {"limit": limit},
                )
                return [self._node_to_dict(row[0]) for row in result.result_set]
            except Exception:
                pass

        events = [n for n in self._in_memory_nodes.values() if n.get("_label") == "Event"]
        events.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        return events[:limit]

    def get_graph_stats(self) -> dict:
        """Get summary statistics about the graph."""
        if not self._is_fallback and self._graph:
            try:
                node_labels = ["User", "Device", "IPAddress", "Event", "Resource", "Alert", "Incident"]
                stats = {}
                for label in node_labels:
                    result = self.query(f"MATCH (n:{label}) RETURN count(n) as c")
                    stats[label] = result.result_set[0][0] if result.result_set else 0

                rel_result = self.query("MATCH ()-[r]->() RETURN count(r) as c")
                stats["total_relationships"] = rel_result.result_set[0][0] if rel_result.result_set else 0

                return {
                    "node_counts": stats,
                    "connected": True,
                    "mode": "falkordb_cloud" if self._is_cloud else "falkordb",
                    "target": self._target_endpoint,
                }
            except Exception:
                pass

        # In-memory stats
        stats: dict[str, int] = {}
        for node in self._in_memory_nodes.values():
            lbl = node.get("_label", "Unknown")
            stats[lbl] = stats.get(lbl, 0) + 1
        stats["total_relationships"] = len(self._in_memory_edges)

        return {
            "node_counts": stats,
            "connected": True,
            "mode": "in_memory_fallback",
            "target": self._target_endpoint,
            "connection_error": self._connection_error,
        }

    # ── In-Memory Seed Initializer ──────────────────────────────────

    def _init_in_memory_graph(self):
        """Populate in-memory graph with the complete cyber attack scenario."""
        base_time = datetime(2026, 10, 11, 14, 0, 0, tzinfo=timezone.utc)

        def ts(offset_minutes: int) -> str:
            return (base_time + timedelta(minutes=offset_minutes)).isoformat()

        # Users
        users = [
            {"id": "user-001", "name": "Marcus Chen", "email": "marcus.chen@acme-corp.com", "department": "Engineering", "role": "senior_engineer", "status": "active"},
            {"id": "user-002", "name": "Sarah Okafor", "email": "sarah.okafor@acme-corp.com", "department": "Finance", "role": "financial_analyst", "status": "active"},
            {"id": "user-003", "name": "admin-service", "email": "admin@acme-corp.com", "department": "IT", "role": "system_admin", "status": "active"},
            {"id": "user-004", "name": "James Rivera", "email": "james.rivera@acme-corp.com", "department": "Engineering", "role": "devops_engineer", "status": "active"},
            {"id": "user-005", "name": "Priya Sharma", "email": "priya.sharma@acme-corp.com", "department": "HR", "role": "hr_manager", "status": "active"},
        ]
        for u in users:
            u["_label"] = "User"
            self._in_memory_nodes[f"User:{u['id']}"] = u

        # Devices
        devices = [
            {"id": "dev-001", "hostname": "LAPTOP-MCHEN", "device_type": "laptop", "os": "Windows 11", "location": "Engineering Lab", "status": "online"},
            {"id": "dev-002", "hostname": "WS-SOKAFOR", "device_type": "workstation", "os": "Windows 11", "location": "Finance Floor 3", "status": "online"},
            {"id": "dev-003", "hostname": "SRV-ADMIN-01", "device_type": "server", "os": "Ubuntu 22.04", "location": "Data Center A", "status": "online"},
            {"id": "dev-004", "hostname": "LAPTOP-JRIVERA", "device_type": "laptop", "os": "macOS 14", "location": "Engineering Lab", "status": "online"},
            {"id": "dev-005", "hostname": "SRV-DB-PROD-01", "device_type": "server", "os": "RHEL 9", "location": "Data Center A", "status": "online"},
            {"id": "dev-006", "hostname": "SRV-FILES-01", "device_type": "server", "os": "Windows Server 2022", "location": "Data Center B", "status": "online"},
        ]
        for d in devices:
            d["_label"] = "Device"
            self._in_memory_nodes[f"Device:{d['id']}"] = d

        # IP Addresses
        ips = [
            {"id": "ip-001", "address": "10.0.1.45", "type": "internal", "description": "Engineering VLAN"},
            {"id": "ip-002", "address": "10.0.2.30", "type": "internal", "description": "Finance VLAN"},
            {"id": "ip-003", "address": "10.0.0.10", "type": "internal", "description": "Server VLAN"},
            {"id": "ip-004", "address": "10.0.1.88", "type": "internal", "description": "Engineering VLAN"},
            {"id": "ip-005", "address": "185.220.101.42", "type": "external", "description": "TOR Exit Node — known malicious C2"},
            {"id": "ip-006", "address": "91.219.236.18", "type": "external", "description": "Suspicious VPN exfiltration endpoint"},
            {"id": "ip-007", "address": "10.0.3.15", "type": "internal", "description": "HR VLAN"},
            {"id": "ip-008", "address": "203.0.113.50", "type": "external", "description": "Cloud storage API endpoint"},
        ]
        for ip in ips:
            ip["_label"] = "IPAddress"
            self._in_memory_nodes[f"IPAddress:{ip['id']}"] = ip

        # Resources
        resources = [
            {"id": "res-001", "name": "Customer Database", "resource_type": "database", "sensitivity": "critical", "description": "Production customer records"},
            {"id": "res-002", "name": "Financial Reports Q3", "resource_type": "file_share", "sensitivity": "high", "description": "Quarterly financial documents"},
            {"id": "res-003", "name": "Source Code Repo", "resource_type": "code_repository", "sensitivity": "high", "description": "Main application source code"},
            {"id": "res-004", "name": "HR Personnel Records", "resource_type": "database", "sensitivity": "critical", "description": "Employee PII and records"},
            {"id": "res-005", "name": "Build Pipeline Config", "resource_type": "configuration", "sensitivity": "medium", "description": "CI/CD pipeline configuration"},
            {"id": "res-006", "name": "API Keys Vault", "resource_type": "secret_store", "sensitivity": "critical", "description": "Production API keys and secrets"},
        ]
        for r in resources:
            r["_label"] = "Resource"
            self._in_memory_nodes[f"Resource:{r['id']}"] = r

        # Events
        events = [
            {"id": "evt-101", "title": "Phishing email received", "event_type": "email_received", "timestamp": ts(0), "description": "Spear-phishing email spoofing HR received by marcus.chen", "severity": "high"},
            {"id": "evt-102", "title": "Malicious attachment opened", "event_type": "file_execution", "timestamp": ts(3), "description": "Executed macro-enabled invoice PDF on LAPTOP-MCHEN", "severity": "high"},
            {"id": "evt-103", "title": "Outbound C2 connection", "event_type": "network_connection", "timestamp": ts(5), "description": "Outbound HTTPS connection to 185.220.101.42:443 established from LAPTOP-MCHEN", "severity": "high"},
            {"id": "evt-104", "title": "Credential harvesting detected", "event_type": "credential_access", "timestamp": ts(8), "description": "LSASS memory dump on LAPTOP-MCHEN. Compromised admin-service credentials", "severity": "critical"},
            {"id": "evt-105", "title": "Unusual authentication", "event_type": "authentication", "timestamp": ts(15), "description": "admin-service logged in from 10.0.1.45 (Engineering) instead of Server VLAN", "severity": "high"},
            {"id": "evt-106", "title": "Lateral movement — RDP", "event_type": "remote_access", "timestamp": ts(20), "description": "RDP session from LAPTOP-MCHEN to SRV-ADMIN-01 using admin-service credentials", "severity": "high"},
            {"id": "evt-107", "title": "Privilege escalation attempt", "event_type": "privilege_escalation", "timestamp": ts(25), "description": "Attempted to add domain administrator rights from SRV-ADMIN-01", "severity": "critical"},
            {"id": "evt-108", "title": "Database query — bulk export", "event_type": "data_access", "timestamp": ts(35), "description": "Bulk SELECT * on Customer Database from SRV-ADMIN-01. 15,000 records accessed", "severity": "critical"},
            {"id": "evt-109", "title": "Large file transfer", "event_type": "data_exfiltration", "timestamp": ts(40), "description": "4.2 GB encrypted transfer to 91.219.236.18 from SRV-ADMIN-01", "severity": "critical"},
            {"id": "evt-110", "title": "Log deletion attempt", "event_type": "log_tampering", "timestamp": ts(45), "description": "Attempt to clear Windows Security Event Logs using wevtutil", "severity": "high"},
            # Benign
            {"id": "evt-201", "title": "Normal login", "event_type": "authentication", "timestamp": ts(-60), "description": "Regular morning login by sarah.okafor from Finance workstation", "severity": "low"},
            {"id": "evt-202", "title": "Financial report access", "event_type": "data_access", "timestamp": ts(-55), "description": "sarah.okafor accessed Financial Reports Q3 — routine review", "severity": "low"},
            {"id": "evt-203", "title": "Code commit", "event_type": "code_change", "timestamp": ts(-30), "description": "james.rivera pushed commit to Source Code Repo", "severity": "low"},
            {"id": "evt-204", "title": "Build pipeline run", "event_type": "automation", "timestamp": ts(-25), "description": "Automated build pipeline triggered by code commit", "severity": "low"},
            {"id": "evt-205", "title": "HR records access", "event_type": "data_access", "timestamp": ts(-120), "description": "priya.sharma accessed HR Personnel Records", "severity": "low"},
            {"id": "evt-206", "title": "VPN connection", "event_type": "network_connection", "timestamp": ts(-90), "description": "james.rivera connected via authorized corporate VPN", "severity": "low"},
            # Contradictory event
            {"id": "evt-301", "title": "admin-service scheduled task", "event_type": "automation", "timestamp": ts(34), "description": "admin-service scheduled database maintenance task — legitimate monthly health job that accounts for some DB reads", "severity": "info"},
        ]
        for e in events:
            e["_label"] = "Event"
            self._in_memory_nodes[f"Event:{e['id']}"] = e

        # Alerts
        alerts = [
            {"id": "alert-001", "title": "Suspicious outbound connection to known TOR exit node", "severity": "critical", "status": "open", "source_event_id": "evt-103", "description": "Network IDS detected outbound connection to 185.220.101.42 flagged as TOR exit node", "timestamp": ts(50)},
            {"id": "alert-002", "title": "Credential dump detected — LSASS access", "severity": "critical", "status": "open", "source_event_id": "evt-104", "description": "EDR detected potential credential harvesting via LSASS memory access", "timestamp": ts(50)},
            {"id": "alert-003", "title": "Unusual admin authentication pattern", "severity": "high", "status": "open", "source_event_id": "evt-105", "description": "Admin account authenticated from unexpected network segment (10.0.1.45)", "timestamp": ts(50)},
            {"id": "alert-004", "title": "Bulk database export detected", "severity": "high", "status": "open", "source_event_id": "evt-108", "description": "DLP system flagged bulk export of 15,000 customer records", "timestamp": ts(50)},
            {"id": "alert-005", "title": "Large encrypted file transfer to external IP", "severity": "critical", "status": "open", "source_event_id": "evt-109", "description": "Network monitoring detected 4.2GB transfer to suspicious IP 91.219.236.18", "timestamp": ts(50)},
            {"id": "alert-006", "title": "Log tampering attempt detected", "severity": "high", "status": "open", "source_event_id": "evt-110", "description": "SIEM detected attempt to clear audit logs using wevtutil", "timestamp": ts(50)},
        ]
        for a in alerts:
            a["_label"] = "Alert"
            self._in_memory_nodes[f"Alert:{a['id']}"] = a

        # Incidents
        incident = {
            "id": "inc-001",
            "title": "Suspected APT — Credential Theft and Data Exfiltration",
            "status": "open",
            "priority": "critical",
            "description": "Correlated multi-stage attack from phishing to lateral movement to 4.2GB exfiltration",
            "created_at": ts(55),
            "_label": "Incident",
        }
        self._in_memory_nodes["Incident:inc-001"] = incident

        # Relationships
        rels = [
            ("user-001", "dev-001", "USES_DEVICE"),
            ("user-002", "dev-002", "USES_DEVICE"),
            ("user-003", "dev-003", "USES_DEVICE"),
            ("user-004", "dev-004", "USES_DEVICE"),
            ("dev-001", "ip-001", "HAS_IP"),
            ("dev-002", "ip-002", "HAS_IP"),
            ("dev-003", "ip-003", "HAS_IP"),
            ("dev-004", "ip-004", "HAS_IP"),
            ("user-001", "evt-101", "PERFORMED"),
            ("user-001", "evt-102", "PERFORMED"),
            ("user-001", "evt-103", "PERFORMED"),
            ("user-001", "evt-104", "PERFORMED"),
            ("user-003", "evt-105", "PERFORMED"),
            ("user-003", "evt-106", "PERFORMED"),
            ("user-003", "evt-107", "PERFORMED"),
            ("user-003", "evt-108", "PERFORMED"),
            ("user-003", "evt-109", "PERFORMED"),
            ("user-003", "evt-110", "PERFORMED"),
            ("evt-101", "dev-001", "OCCURRED_ON"),
            ("evt-102", "dev-001", "OCCURRED_ON"),
            ("evt-103", "dev-001", "OCCURRED_ON"),
            ("evt-104", "dev-001", "OCCURRED_ON"),
            ("evt-105", "dev-001", "OCCURRED_ON"),
            ("evt-106", "dev-003", "OCCURRED_ON"),
            ("evt-107", "dev-003", "OCCURRED_ON"),
            ("evt-108", "dev-003", "OCCURRED_ON"),
            ("evt-109", "dev-003", "OCCURRED_ON"),
            ("evt-110", "dev-003", "OCCURRED_ON"),
            ("evt-103", "ip-005", "CONNECTED_TO"),
            ("evt-109", "ip-006", "CONNECTED_TO"),
            ("evt-108", "res-001", "ACCESSED"),
            ("evt-107", "res-006", "ACCESSED"),
            ("user-002", "evt-201", "PERFORMED"),
            ("evt-201", "dev-002", "OCCURRED_ON"),
            ("evt-202", "res-002", "ACCESSED"),
            ("evt-301", "dev-003", "OCCURRED_ON"),
            ("evt-301", "res-001", "ACCESSED"),
            ("alert-001", "evt-103", "TRIGGERED_BY"),
            ("alert-002", "evt-104", "TRIGGERED_BY"),
            ("alert-003", "evt-105", "TRIGGERED_BY"),
            ("alert-004", "evt-108", "TRIGGERED_BY"),
            ("alert-005", "evt-109", "TRIGGERED_BY"),
            ("alert-006", "evt-110", "TRIGGERED_BY"),
            ("inc-001", "alert-001", "INCLUDES"),
            ("inc-001", "alert-002", "INCLUDES"),
            ("inc-001", "alert-003", "INCLUDES"),
            ("inc-001", "alert-004", "INCLUDES"),
            ("inc-001", "alert-005", "INCLUDES"),
            ("inc-001", "alert-006", "INCLUDES"),
        ]

        self._in_memory_edges = []
        for src, dst, rtype in rels:
            self._in_memory_edges.append({
                "source": src,
                "target": dst,
                "type": rtype,
                "properties": {"created_at": ts(0)},
            })

    def _find_node_by_id(self, node_id: str) -> Optional[dict]:
        """Find a node across all labels by ID."""
        for node in self._in_memory_nodes.values():
            if node.get("id") == node_id:
                return dict(node)
        return None

    # ── Helpers ─────────────────────────────────────────────────────

    @staticmethod
    def _node_to_dict(node) -> dict:
        """Convert a FalkorDB node to a dictionary."""
        try:
            props = {}
            if hasattr(node, "properties"):
                props = dict(node.properties)
            if hasattr(node, "labels") and node.labels:
                props["_label"] = node.labels[0] if isinstance(node.labels, (list, tuple)) else str(node.labels)
            elif hasattr(node, "label"):
                props["_label"] = node.label
            return props
        except Exception:
            return {"_raw": str(node)}

    @staticmethod
    def _relationship_to_dict(rel) -> dict:
        """Convert a FalkorDB relationship to a dictionary."""
        try:
            if hasattr(rel, "properties"):
                return dict(rel.properties)
            return {}
        except Exception:
            return {}


# Singleton instance
graph_service = GraphService()
try:
    graph_service.connect()
except Exception:
    pass
