"""Seed FalkorDB with a realistic multi-hop cybersecurity investigation scenario.

This script creates a synthetic but realistic dataset including:
- A primary attack scenario (credential theft → lateral movement → data exfiltration)
- Normal benign activity for false-positive testing
- Incomplete evidence scenarios
- Contradictory event records

All data is clearly synthetic and intended for demonstration purposes.
Seeding is 100% idempotent: running it multiple times preserves exact entity
and relationship counts without creating duplicate nodes or edges.
"""

import os
import sys
from datetime import datetime, timedelta

from dotenv import load_dotenv

try:
    from falkordb import FalkorDB
except ImportError:
    FalkorDB = None

# Load backend/.env if present, otherwise root .env
_backend_env = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env"))
_root_env = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))
if os.path.exists(_root_env):
    load_dotenv(_root_env)
if os.path.exists(_backend_env):
    load_dotenv(_backend_env, override=True)


def get_graph():
    if not FalkorDB:
        raise RuntimeError("falkordb Python package is not installed.")

    falkordb_url = os.getenv("FALKORDB_URL")
    graph_name = os.getenv("FALKORDB_GRAPH_NAME", "threatgraph")

    url_is_tls = bool(falkordb_url and falkordb_url.startswith("falkors://"))
    ssl_val = (os.getenv("FALKORDB_SSL", "false").lower() in ("true", "1", "yes")) or url_is_tls
    ssl_check_hostname = os.getenv("FALKORDB_SSL_CHECK_HOSTNAME", "true").lower() in ("true", "1", "yes")
    ssl_cert_reqs = os.getenv("FALKORDB_SSL_CERT_REQS", "required")
    ssl_ca_certs = os.getenv("FALKORDB_SSL_CA_CERTS") or None

    if falkordb_url:
        kwargs = {}
        if url_is_tls:
            kwargs["ssl_check_hostname"] = ssl_check_hostname
            kwargs["ssl_cert_reqs"] = ssl_cert_reqs
            if ssl_ca_certs:
                kwargs["ssl_ca_certs"] = ssl_ca_certs
        db = FalkorDB.from_url(falkordb_url, **kwargs)
    else:
        host = os.getenv("FALKORDB_HOST", "localhost")
        port_val = os.getenv("FALKORDB_PORT", "6379")
        try:
            port = int(port_val)
        except ValueError:
            port = 6379
        username = os.getenv("FALKORDB_USERNAME")
        password = os.getenv("FALKORDB_PASSWORD") or None

        kwargs = {
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
        db = FalkorDB(**kwargs)

    return db.select_graph(graph_name)


def seed_data(clear_first: bool = False):
    """Seed synthetic cybersecurity attack and telemetry data.
    
    Uses MERGE across all nodes and relationships to ensure strict idempotency.
    """
    graph = get_graph()

    if clear_first:
        try:
            graph.query("MATCH (n) DETACH DELETE n")
            print("✓ Cleared existing graph data (--clean requested)")
        except Exception as e:
            print(f"⚠️ Note during clear: {e}")

    base_time = datetime(2026, 10, 11, 14, 0, 0)

    def ts(offset_minutes: int) -> str:
        return (base_time + timedelta(minutes=offset_minutes)).isoformat() + "Z"

    # ══════════════════════════════════════════════════════════════
    # USERS (Idempotent MERGE)
    # ══════════════════════════════════════════════════════════════

    users = [
        ("user-001", "Marcus Chen", "marcus.chen@acme-corp.com", "Engineering", "senior_engineer", "active"),
        ("user-002", "Sarah Okafor", "sarah.okafor@acme-corp.com", "Finance", "financial_analyst", "active"),
        ("user-003", "admin-service", "admin@acme-corp.com", "IT", "system_admin", "active"),
        ("user-004", "James Rivera", "james.rivera@acme-corp.com", "Engineering", "devops_engineer", "active"),
        ("user-005", "Priya Sharma", "priya.sharma@acme-corp.com", "HR", "hr_manager", "active"),
    ]

    for uid, name, email, dept, role, status in users:
        graph.query(
            """MERGE (u:User {id: $id})
               ON CREATE SET u.name = $name, u.email = $email,
                             u.department = $dept, u.role = $role, u.status = $status,
                             u.created_at = $created
               ON MATCH SET u.name = $name, u.email = $email,
                            u.department = $dept, u.role = $role, u.status = $status""",
            {
                "id": uid, "name": name, "email": email,
                "dept": dept, "role": role, "status": status,
                "created": ts(-10080),  # created a week ago
            },
        )
    print(f"✓ Seeded {len(users)} users (idempotent)")

    # ══════════════════════════════════════════════════════════════
    # DEVICES (Idempotent MERGE)
    # ══════════════════════════════════════════════════════════════

    devices = [
        ("dev-001", "LAPTOP-MCHEN", "laptop", "Windows 11", "Engineering Lab"),
        ("dev-002", "WS-SOKAFOR", "workstation", "Windows 11", "Finance Floor 3"),
        ("dev-003", "SRV-ADMIN-01", "server", "Ubuntu 22.04", "Data Center A"),
        ("dev-004", "LAPTOP-JRIVERA", "laptop", "macOS 14", "Engineering Lab"),
        ("dev-005", "SRV-DB-PROD-01", "server", "RHEL 9", "Data Center A"),
        ("dev-006", "SRV-FILES-01", "server", "Windows Server 2022", "Data Center B"),
    ]

    for did, hostname, dtype, os_name, location in devices:
        graph.query(
            """MERGE (d:Device {id: $id})
               ON CREATE SET d.hostname = $hostname, d.device_type = $dtype,
                             d.os = $os, d.location = $location, d.status = 'online'
               ON MATCH SET d.hostname = $hostname, d.device_type = $dtype,
                            d.os = $os, d.location = $location, d.status = 'online'""",
            {"id": did, "hostname": hostname, "dtype": dtype, "os": os_name, "location": location},
        )
    print(f"✓ Seeded {len(devices)} devices (idempotent)")

    # ══════════════════════════════════════════════════════════════
    # IP ADDRESSES (Idempotent MERGE)
    # ══════════════════════════════════════════════════════════════

    ips = [
        ("ip-001", "10.0.1.45", "internal", "Engineering VLAN"),
        ("ip-002", "10.0.2.30", "internal", "Finance VLAN"),
        ("ip-003", "10.0.0.10", "internal", "Server VLAN"),
        ("ip-004", "10.0.1.88", "internal", "Engineering VLAN"),
        ("ip-005", "185.220.101.42", "external", "TOR Exit Node — known malicious"),
        ("ip-006", "91.219.236.18", "external", "Suspicious VPN endpoint"),
        ("ip-007", "10.0.3.15", "internal", "HR VLAN"),
        ("ip-008", "203.0.113.50", "external", "Cloud storage API endpoint"),
    ]

    for iid, addr, ip_type, desc in ips:
        graph.query(
            """MERGE (i:IPAddress {id: $id})
               ON CREATE SET i.address = $addr, i.type = $type, i.description = $desc
               ON MATCH SET i.address = $addr, i.type = $type, i.description = $desc""",
            {"id": iid, "addr": addr, "type": ip_type, "desc": desc},
        )
    print(f"✓ Seeded {len(ips)} IP addresses (idempotent)")

    # ══════════════════════════════════════════════════════════════
    # RESOURCES (Idempotent MERGE)
    # ══════════════════════════════════════════════════════════════

    resources = [
        ("res-001", "Customer Database", "database", "critical", "Production customer records"),
        ("res-002", "Financial Reports Q3", "file_share", "high", "Quarterly financial documents"),
        ("res-003", "Source Code Repo", "code_repository", "high", "Main application source code"),
        ("res-004", "HR Personnel Records", "database", "critical", "Employee PII and records"),
        ("res-005", "Build Pipeline Config", "configuration", "medium", "CI/CD pipeline configuration"),
        ("res-006", "API Keys Vault", "secret_store", "critical", "Production API keys and secrets"),
    ]

    for rid, name, rtype, sensitivity, desc in resources:
        graph.query(
            """MERGE (r:Resource {id: $id})
               ON CREATE SET r.name = $name, r.resource_type = $rtype,
                             r.sensitivity = $sensitivity, r.description = $desc
               ON MATCH SET r.name = $name, r.resource_type = $rtype,
                            r.sensitivity = $sensitivity, r.description = $desc""",
            {"id": rid, "name": name, "rtype": rtype, "sensitivity": sensitivity, "desc": desc},
        )
    print(f"✓ Seeded {len(resources)} resources (idempotent)")

    # ══════════════════════════════════════════════════════════════
    # EVENTS — Primary Attack Scenario (Idempotent MERGE)
    # ══════════════════════════════════════════════════════════════

    attack_events = [
        ("evt-101", "Phishing email received", "email_received", ts(0),
         "Spear-phishing email with malicious attachment received by marcus.chen@acme-corp.com from external sender spoofing HR department"),
        ("evt-102", "Malicious attachment opened", "file_execution", ts(3),
         "User opened PDF attachment which executed embedded macro. File hash: 4a3b2c1d..."),
        ("evt-103", "Outbound C2 connection", "network_connection", ts(5),
         "Outbound HTTPS connection to 185.220.101.42:443 established from LAPTOP-MCHEN"),
        ("evt-104", "Credential harvesting detected", "credential_access", ts(8),
         "LSASS memory dump detected on LAPTOP-MCHEN. Credentials for marcus.chen and admin-service potentially compromised"),
        ("evt-105", "Unusual authentication", "authentication", ts(15),
         "admin-service account authenticated from 10.0.1.45 (Engineering VLAN) instead of usual 10.0.0.10 (Server VLAN)"),
        ("evt-106", "Lateral movement — RDP", "remote_access", ts(20),
         "RDP session from LAPTOP-MCHEN to SRV-ADMIN-01 using admin-service credentials"),
        ("evt-107", "Privilege escalation attempt", "privilege_escalation", ts(25),
         "admin-service attempted to add account to Domain Admins group from unusual source"),
        ("evt-108", "Database query — bulk export", "data_access", ts(35),
         "Bulk SELECT query on Customer Database from SRV-ADMIN-01. 15,000 records accessed."),
        ("evt-109", "Large file transfer", "data_exfiltration", ts(40),
         "4.2 GB file transfer to 91.219.236.18 via encrypted channel from SRV-ADMIN-01"),
        ("evt-110", "Log deletion attempt", "log_tampering", ts(45),
         "Attempt to clear Windows Event Logs on SRV-ADMIN-01 using wevtutil.exe"),
    ]

    for eid, title, etype, timestamp, desc in attack_events:
        graph.query(
            """MERGE (e:Event {id: $id})
               ON CREATE SET e.title = $title, e.event_type = $etype,
                             e.timestamp = $timestamp, e.description = $desc,
                             e.source = 'synthetic_demo', e.severity = 'high'
               ON MATCH SET e.title = $title, e.event_type = $etype,
                            e.timestamp = $timestamp, e.description = $desc,
                            e.source = 'synthetic_demo', e.severity = 'high'""",
            {"id": eid, "title": title, "etype": etype, "timestamp": timestamp, "desc": desc},
        )

    # Benign events
    benign_events = [
        ("evt-201", "Normal login", "authentication", ts(-60),
         "Regular morning login by sarah.okafor from Finance workstation"),
        ("evt-202", "Financial report access", "data_access", ts(-55),
         "sarah.okafor accessed Financial Reports Q3 — routine quarterly review"),
        ("evt-203", "Code commit", "code_change", ts(-30),
         "james.rivera pushed commit to Source Code Repo — normal development activity"),
        ("evt-204", "Build pipeline run", "automation", ts(-25),
         "Automated build pipeline triggered by code commit — normal CI/CD"),
        ("evt-205", "HR records access", "data_access", ts(-120),
         "priya.sharma accessed HR Personnel Records — normal HR function"),
        ("evt-206", "VPN connection", "network_connection", ts(-90),
         "james.rivera connected via VPN from remote location — approved remote work"),
    ]

    for eid, title, etype, timestamp, desc in benign_events:
        graph.query(
            """MERGE (e:Event {id: $id})
               ON CREATE SET e.title = $title, e.event_type = $etype,
                             e.timestamp = $timestamp, e.description = $desc,
                             e.source = 'synthetic_demo', e.severity = 'low'
               ON MATCH SET e.title = $title, e.event_type = $etype,
                            e.timestamp = $timestamp, e.description = $desc,
                            e.source = 'synthetic_demo', e.severity = 'low'""",
            {"id": eid, "title": title, "etype": etype, "timestamp": timestamp, "desc": desc},
        )

    # Contradictory event
    graph.query(
        """MERGE (e:Event {id: 'evt-301'})
           ON CREATE SET e.title = 'admin-service scheduled task',
                         e.event_type = 'automation', e.timestamp = $ts,
                         e.description = 'admin-service ran scheduled database maintenance task — this is a legitimate scheduled operation that could explain some of the database access patterns',
                         e.source = 'synthetic_demo', e.severity = 'info'
           ON MATCH SET e.title = 'admin-service scheduled task',
                        e.event_type = 'automation', e.timestamp = $ts,
                        e.description = 'admin-service ran scheduled database maintenance task — this is a legitimate scheduled operation that could explain some of the database access patterns',
                        e.source = 'synthetic_demo', e.severity = 'info'""",
        {"ts": ts(34)},
    )

    print(f"✓ Seeded {len(attack_events) + len(benign_events) + 1} events (idempotent)")

    # ══════════════════════════════════════════════════════════════
    # ALERTS (Idempotent MERGE)
    # ══════════════════════════════════════════════════════════════

    alerts = [
        ("alert-001", "Suspicious outbound connection to known TOR exit node",
         "critical", "open", "evt-103",
         "Network IDS detected outbound connection to IP flagged as TOR exit node"),
        ("alert-002", "Credential dump detected — LSASS access",
         "critical", "open", "evt-104",
         "EDR detected potential credential harvesting via LSASS memory access"),
        ("alert-003", "Unusual admin authentication pattern",
         "high", "open", "evt-105",
         "Admin account authenticated from unexpected network segment"),
        ("alert-004", "Bulk database export detected",
         "high", "open", "evt-108",
         "DLP system flagged bulk export of customer records"),
        ("alert-005", "Large encrypted file transfer to external IP",
         "critical", "open", "evt-109",
         "Network monitoring detected 4.2GB transfer to suspicious external IP"),
        ("alert-006", "Log tampering attempt detected",
         "high", "open", "evt-110",
         "SIEM detected attempt to clear audit logs"),
    ]

    for aid, title, severity, status, source_event, desc in alerts:
        graph.query(
            """MERGE (a:Alert {id: $id})
               ON CREATE SET a.title = $title, a.severity = $severity,
                             a.status = $status, a.source_event_id = $source_event,
                             a.description = $desc, a.timestamp = $ts,
                             a.source = 'synthetic_demo'
               ON MATCH SET a.title = $title, a.severity = $severity,
                            a.status = $status, a.source_event_id = $source_event,
                            a.description = $desc, a.timestamp = $ts,
                            a.source = 'synthetic_demo'""",
            {"id": aid, "title": title, "severity": severity, "status": status,
             "source_event": source_event, "desc": desc, "ts": ts(50)},
        )
    print(f"✓ Seeded {len(alerts)} alerts (idempotent)")

    # ══════════════════════════════════════════════════════════════
    # INCIDENTS (Idempotent MERGE)
    # ══════════════════════════════════════════════════════════════

    graph.query(
        """MERGE (inc:Incident {id: 'inc-001'})
           ON CREATE SET inc.title = 'Suspected APT — Credential Theft and Data Exfiltration',
                         inc.status = 'open', inc.priority = 'critical',
                         inc.description = 'Multiple correlated alerts suggesting advanced persistent threat activity including credential theft, lateral movement, and potential data exfiltration',
                         inc.created_at = $ts, inc.source = 'synthetic_demo'
           ON MATCH SET inc.title = 'Suspected APT — Credential Theft and Data Exfiltration',
                        inc.status = 'open', inc.priority = 'critical',
                        inc.description = 'Multiple correlated alerts suggesting advanced persistent threat activity including credential theft, lateral movement, and potential data exfiltration',
                        inc.created_at = $ts, inc.source = 'synthetic_demo'""",
        {"ts": ts(55)},
    )
    print("✓ Seeded 1 incident (idempotent)")

    # ══════════════════════════════════════════════════════════════
    # RELATIONSHIPS (Idempotent MERGE)
    # ══════════════════════════════════════════════════════════════

    relationships = [
        # User-Device associations
        ("User", "user-001", "USES_DEVICE", "Device", "dev-001"),
        ("User", "user-002", "USES_DEVICE", "Device", "dev-002"),
        ("User", "user-003", "USES_DEVICE", "Device", "dev-003"),
        ("User", "user-004", "USES_DEVICE", "Device", "dev-004"),

        # Device-IP associations
        ("Device", "dev-001", "HAS_IP", "IPAddress", "ip-001"),
        ("Device", "dev-002", "HAS_IP", "IPAddress", "ip-002"),
        ("Device", "dev-003", "HAS_IP", "IPAddress", "ip-003"),
        ("Device", "dev-004", "HAS_IP", "IPAddress", "ip-004"),

        # Attack chain events → users
        ("User", "user-001", "PERFORMED", "Event", "evt-101"),
        ("User", "user-001", "PERFORMED", "Event", "evt-102"),
        ("User", "user-001", "PERFORMED", "Event", "evt-103"),
        ("User", "user-001", "PERFORMED", "Event", "evt-104"),
        ("User", "user-003", "PERFORMED", "Event", "evt-105"),  # compromised admin
        ("User", "user-003", "PERFORMED", "Event", "evt-106"),
        ("User", "user-003", "PERFORMED", "Event", "evt-107"),
        ("User", "user-003", "PERFORMED", "Event", "evt-108"),
        ("User", "user-003", "PERFORMED", "Event", "evt-109"),
        ("User", "user-003", "PERFORMED", "Event", "evt-110"),

        # Attack events → devices
        ("Event", "evt-101", "OCCURRED_ON", "Device", "dev-001"),
        ("Event", "evt-102", "OCCURRED_ON", "Device", "dev-001"),
        ("Event", "evt-103", "OCCURRED_ON", "Device", "dev-001"),
        ("Event", "evt-104", "OCCURRED_ON", "Device", "dev-001"),
        ("Event", "evt-105", "OCCURRED_ON", "Device", "dev-001"),  # auth from wrong device
        ("Event", "evt-106", "OCCURRED_ON", "Device", "dev-003"),  # lateral movement to server
        ("Event", "evt-107", "OCCURRED_ON", "Device", "dev-003"),
        ("Event", "evt-108", "OCCURRED_ON", "Device", "dev-003"),
        ("Event", "evt-109", "OCCURRED_ON", "Device", "dev-003"),
        ("Event", "evt-110", "OCCURRED_ON", "Device", "dev-003"),

        # Events → IPs
        ("Event", "evt-103", "CONNECTED_TO", "IPAddress", "ip-005"),  # TOR exit
        ("Event", "evt-109", "CONNECTED_TO", "IPAddress", "ip-006"),  # suspicious VPN

        # Events → Resources
        ("Event", "evt-108", "ACCESSED", "Resource", "res-001"),  # customer DB
        ("Event", "evt-107", "ACCESSED", "Resource", "res-006"),  # API keys vault

        # Benign events
        ("User", "user-002", "PERFORMED", "Event", "evt-201"),
        ("User", "user-002", "PERFORMED", "Event", "evt-202"),
        ("User", "user-004", "PERFORMED", "Event", "evt-203"),
        ("User", "user-004", "PERFORMED", "Event", "evt-204"),
        ("User", "user-005", "PERFORMED", "Event", "evt-205"),
        ("User", "user-004", "PERFORMED", "Event", "evt-206"),
        ("Event", "evt-201", "OCCURRED_ON", "Device", "dev-002"),
        ("Event", "evt-202", "ACCESSED", "Resource", "res-002"),
        ("Event", "evt-203", "ACCESSED", "Resource", "res-003"),
        ("Event", "evt-205", "ACCESSED", "Resource", "res-004"),

        # Contradictory event
        ("User", "user-003", "PERFORMED", "Event", "evt-301"),
        ("Event", "evt-301", "OCCURRED_ON", "Device", "dev-003"),
        ("Event", "evt-301", "ACCESSED", "Resource", "res-001"),

        # Alert → Event links
        ("Alert", "alert-001", "TRIGGERED_BY", "Event", "evt-103"),
        ("Alert", "alert-002", "TRIGGERED_BY", "Event", "evt-104"),
        ("Alert", "alert-003", "TRIGGERED_BY", "Event", "evt-105"),
        ("Alert", "alert-004", "TRIGGERED_BY", "Event", "evt-108"),
        ("Alert", "alert-005", "TRIGGERED_BY", "Event", "evt-109"),
        ("Alert", "alert-006", "TRIGGERED_BY", "Event", "evt-110"),

        # Incident → Alert links
        ("Incident", "inc-001", "INCLUDES", "Alert", "alert-001"),
        ("Incident", "inc-001", "INCLUDES", "Alert", "alert-002"),
        ("Incident", "inc-001", "INCLUDES", "Alert", "alert-003"),
        ("Incident", "inc-001", "INCLUDES", "Alert", "alert-004"),
        ("Incident", "inc-001", "INCLUDES", "Alert", "alert-005"),
        ("Incident", "inc-001", "INCLUDES", "Alert", "alert-006"),
    ]

    for src_type, src_id, rel, dst_type, dst_id in relationships:
        graph.query(
            f"""
            MATCH (a:{src_type} {{id: $src_id}}), (b:{dst_type} {{id: $dst_id}})
            MERGE (a)-[r:{rel}]->(b)
            ON CREATE SET r.created_at = $ts, r.source = 'synthetic_demo'
            """,
            {"src_id": src_id, "dst_id": dst_id, "ts": ts(0)},
        )

    print(f"✓ Seeded {len(relationships)} relationships (idempotent)")

    # Verify counts
    node_res = graph.query("MATCH (n) RETURN count(n) as c")
    total_nodes = node_res.result_set[0][0] if node_res.result_set else 0

    rel_res = graph.query("MATCH ()-[r]->() RETURN count(r) as c")
    total_rels = rel_res.result_set[0][0] if rel_res.result_set else 0

    print(f"\n📊 Verified Live Counts: {total_nodes} Nodes, {total_rels} Relationships")
    return {"nodes": total_nodes, "relationships": total_rels}


if __name__ == "__main__":
    clean_arg = "--clean" in sys.argv
    seed_data(clear_first=clean_arg)
