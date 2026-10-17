"""FalkorDB Cloud Connection Verification & Security Diagnostics Suite for ThreatGraph AI.

Performs comprehensive layered diagnostics:
1. Environment configuration & security policy inspection (strictly masks credentials)
2. Low-level TCP socket reachability and raw TLS ClientHello handshake probe
3. Clear distinction between successful authentication and verified TLS transport encryption
4. Provider plan assessment (Free Tier unencrypted plain TCP vs Paid Tier verified TLS)
5. Official FalkorDB client authentication & harmless read query (RETURN 1 AS ping)
6. Graph topology statistics and live entity counts
7. Idempotency verification: confirms repeated seeding never creates duplicate nodes or relationships
"""

import os
import sys
import time
import socket
import ssl
from dotenv import load_dotenv

# Load backend/.env if present, otherwise root .env
_backend_env = os.path.abspath(os.path.join(os.path.dirname(__file__), ".env"))
_root_env = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env"))
if os.path.exists(_root_env):
    load_dotenv(_root_env)
if os.path.exists(_backend_env):
    load_dotenv(_backend_env, override=True)

try:
    from falkordb import FalkorDB
except ImportError:
    FalkorDB = None


def run_cloud_diagnostics(verify_idempotency: bool = True) -> dict:
    print("=" * 78)
    print("THREATGRAPH AI — FALKORDB CLOUD CONNECTIVITY & SECURITY AUDIT")
    print("=" * 78)

    report = {
        "config": {},
        "tcp_reachable": False,
        "tls_handshake_supported": False,
        "tls_details": None,
        "auth_success": False,
        "read_query_success": False,
        "security_label": "DISCONNECTED",
        "nodes_count": None,
        "edges_count": None,
        "idempotency_verified": False,
        "error": None,
    }

    # 1. Inspect Environment Configuration
    print("\n[Phase 1: Environment & Security Policy Configuration]")
    falkordb_url = os.getenv("FALKORDB_URL")
    host = os.getenv("FALKORDB_HOST", "r-6jissuruar.instance-9x47fsdej.hc-7up0crkyn.ap-south-1.aws.f2e0a955bb84.cloud")
    port_val = os.getenv("FALKORDB_PORT", "64891")
    try:
        port = int(port_val)
    except ValueError:
        port = 64891
    username = os.getenv("FALKORDB_USERNAME", "threatgraph_app")
    password = os.getenv("FALKORDB_PASSWORD")

    url_is_tls = bool(falkordb_url and falkordb_url.startswith("falkors://"))
    ssl_configured = (os.getenv("FALKORDB_SSL", "false").lower() in ("true", "1", "yes")) or url_is_tls
    require_tls = (os.getenv("FALKORDB_REQUIRE_TLS", "false").lower() in ("true", "1", "yes")) or url_is_tls
    ssl_check_hostname = os.getenv("FALKORDB_SSL_CHECK_HOSTNAME", "true").lower() in ("true", "1", "yes")
    ssl_cert_reqs = os.getenv("FALKORDB_SSL_CERT_REQS", "required")
    ssl_ca_certs = os.getenv("FALKORDB_SSL_CA_CERTS") or None
    graph_name = os.getenv("FALKORDB_GRAPH_NAME", "threatgraph")

    has_pass = bool(password and len(password.strip()) > 0)
    masked_pass = f"*** [length {len(password)}] ***" if has_pass else "<NOT SET / EMPTY>"

    report["config"] = {
        "url_mode": bool(falkordb_url),
        "host": host,
        "port": port,
        "username": username,
        "password_configured": has_pass,
        "ssl_configured": ssl_configured,
        "require_tls": require_tls,
        "ssl_check_hostname": ssl_check_hostname,
        "ssl_cert_reqs": ssl_cert_reqs,
        "graph_name": graph_name,
    }

    print(f"  • Host: {host}")
    print(f"  • Port: {port}")
    print(f"  • Username: {username}")
    print(f"  • Password: {masked_pass}")
    print(f"  • Target Graph: {graph_name}")
    print(f"  • Configured FALKORDB_SSL: {ssl_configured}")
    print(f"  • Strict FALKORDB_REQUIRE_TLS: {require_tls}")
    print(f"  • TLS Hostname Verification: {ssl_check_hostname}")
    print(f"  • TLS Certificate Requirements: {ssl_cert_reqs}")

    # 2. Phase 2: Network Reachability & Low-Level TLS Handshake Probe
    print("\n[Phase 2: Network Reachability & Socket Handshake Probe]")
    t0 = time.perf_counter()
    try:
        with socket.create_connection((host, port), timeout=4) as sock:
            tcp_ms = round((time.perf_counter() - t0) * 1000, 2)
            print(f"  ✓ Raw TCP socket to {host}:{port} connected in {tcp_ms}ms")
            report["tcp_reachable"] = True
            report["tcp_rtt_ms"] = tcp_ms

            # Low-level protocol probe (plain RESP)
            try:
                sock.sendall(b"*1\r\n$4\r\nPING\r\n")
                resp = sock.recv(512).decode("utf-8", errors="replace").strip()
                print(f"  ✓ Raw Protocol Response: {resp}")
                if "-NOAUTH" in resp:
                    print("  ✓ Confirmed instance is listening on plain Redis/FalkorDB RESP protocol (AUTH required)")
            except Exception as e_resp:
                print(f"  ℹ️ Low-level RESP probe note: {e_resp}")
    except Exception as e:
        tcp_ms = round((time.perf_counter() - t0) * 1000, 2)
        print(f"  ✗ TCP connection to {host}:{port} failed after {tcp_ms}ms: {e}")
        report["tcp_reachable"] = False
        report["error"] = f"Network unreachable: {e}"
        return report

    # Direct TLS handshake test on the endpoint
    print("\n[Phase 3: Provider TLS Endpoint & Handshake Evaluation]")
    print(f"  • Probing for active TLS listener on {host}:{port}...")
    tls_supported = False
    tls_context = ssl.create_default_context()
    if ssl_ca_certs:
        try:
            tls_context.load_verify_locations(cafile=ssl_ca_certs)
        except Exception as e_ca:
            print(f"  ⚠️ Could not load CA file {ssl_ca_certs}: {e_ca}")

    try:
        with socket.create_connection((host, port), timeout=3) as raw_sock:
            with tls_context.wrap_socket(raw_sock, server_hostname=host) as ssock:
                tls_supported = True
                cipher = ssock.cipher()
                cert = ssock.getpeercert()
                report["tls_handshake_supported"] = True
                report["tls_details"] = {
                    "version": ssock.version(),
                    "cipher": cipher[0] if cipher else "unknown",
                    "bits": cipher[2] if cipher else None,
                    "peer_cert_subject": cert.get("subject") if cert else None,
                }
                print(f"  ✓ Verified TLS handshake SUCCEEDED!")
                print(f"    Protocol: {ssock.version()}, Cipher: {cipher[0]} ({cipher[2]} bits)")
    except Exception as e_tls:
        report["tls_handshake_supported"] = False
        report["tls_handshake_error"] = str(e_tls)
        print(f"  ℹ️ Direct TLS Handshake: Not supported on this port ({type(e_tls).__name__}: {e_tls})")
        print("  👉 FalkorDB Cloud Provider Analysis:")
        print("     - The Free Tier plan allocates instances on unencrypted plain TCP (port 64891).")
        print("     - The server does not complete a TLS ClientHello handshake; it expects RESP commands.")
        print("     - Verified TLS (falkors://) is provided on paid tiers (Startup, Pro, Enterprise).")

    # Strict enforcement check
    if require_tls and not tls_supported:
        err_msg = (
            f"FalkorDBTLSError: Strict TLS encryption is required by policy (FALKORDB_REQUIRE_TLS=true), "
            f"but endpoint {host}:{port} does not support TLS. Connection refused to prevent insecure transmission."
        )
        print(f"\n❌ {err_msg}")
        report["error"] = err_msg
        report["security_label"] = "DISCONNECTED_TLS_ENFORCEMENT_FAILED"
        return report

    # 4. Phase 4: FalkorDB Client Initialization & Read Query
    print("\n[Phase 4: Official FalkorDB Client Initialization & Authentication]")
    if not FalkorDB:
        print("  ✗ 'falkordb' Python package is not installed.")
        report["error"] = "Missing falkordb package"
        return report

    t_auth_start = time.perf_counter()
    try:
        if falkordb_url:
            client_kwargs = {"socket_timeout": 5}
            if url_is_tls:
                client_kwargs["ssl_check_hostname"] = ssl_check_hostname
                client_kwargs["ssl_cert_reqs"] = ssl_cert_reqs
                if ssl_ca_certs:
                    client_kwargs["ssl_ca_certs"] = ssl_ca_certs
            db = FalkorDB.from_url(falkordb_url, **client_kwargs)
        else:
            client_kwargs = {
                "host": host,
                "port": port,
                "ssl": ssl_configured,
                "socket_timeout": 5,
            }
            if ssl_configured:
                client_kwargs["ssl_check_hostname"] = ssl_check_hostname
                client_kwargs["ssl_cert_reqs"] = ssl_cert_reqs
                if ssl_ca_certs:
                    client_kwargs["ssl_ca_certs"] = ssl_ca_certs
            if username:
                client_kwargs["username"] = username
            if has_pass:
                client_kwargs["password"] = password
            db = FalkorDB(**client_kwargs)

        graph = db.select_graph(graph_name)

        # Harmless Read Query
        read_res = graph.query("RETURN 1 AS ping")
        read_ms = round((time.perf_counter() - t_auth_start) * 1000, 2)
        print(f"  ✓ Authentication SUCCEEDED!")
        print(f"  ✓ Harmless read query ('RETURN 1') executed in {read_ms}ms: result={read_res.result_set}")
        report["auth_success"] = True
        report["read_query_success"] = True
        report["read_latency_ms"] = read_ms

        # Distinction between Auth and Transport Encryption
        print("\n[Phase 5: Security Classification & Transport Analysis]")
        if ssl_configured and tls_supported:
            report["security_label"] = "SECURE_TLS_VERIFIED"
            print("  🔒 Security Classification: SECURE_TLS_VERIFIED")
            print("     Both authentication AND verified TLS encryption are active with hostname validation.")
        else:
            report["security_label"] = "DEVELOPMENT / UNENCRYPTED"
            print("  ⚠️ Security Classification: DEVELOPMENT / UNENCRYPTED (Plain TCP)")
            print("     CRITICAL DISTINCTION:")
            print("     - Environment: DEVELOPMENT (synthetic telemetry & cyber scenarios)")
            print("     - Authentication: SUCCESSFUL (credentials verified, RETURN 1 executed)")
            print("     - Transport Encryption: NONE (standard plain TCP protocol)")
            print("     - Security Label: DEVELOPMENT / UNENCRYPTED. Network packets are unencrypted.")
            print("     - Provider Context: FalkorDB Cloud Free Tier does not offer TLS encryption.")

        # Check existing graph topology
        node_res = graph.query("MATCH (n) RETURN count(n) AS c")
        node_cnt = node_res.result_set[0][0] if node_res.result_set else 0
        rel_res = graph.query("MATCH ()-[r]->() RETURN count(r) AS c")
        rel_cnt = rel_res.result_set[0][0] if rel_res.result_set else 0
        report["nodes_count"] = node_cnt
        report["edges_count"] = rel_cnt
        print(f"\n[Phase 6: Live Graph Topology Inspection]")
        print(f"  ✓ Target Graph '{graph_name}': {node_cnt} Nodes, {rel_cnt} Relationships")

        # 6. Phase 7: Idempotent Seeding Verification
        if verify_idempotency:
            print("\n[Phase 7: Idempotency Verification Test]")
            print("  • Executing seed_data(clear_first=False) to test repeated run idempotency...")
            from seeds.seed_graph import seed_data
            seed_data(clear_first=False)

            node_res2 = graph.query("MATCH (n) RETURN count(n) AS c")
            node_cnt2 = node_res2.result_set[0][0] if node_res2.result_set else 0
            rel_res2 = graph.query("MATCH ()-[r]->() RETURN count(r) AS c")
            rel_cnt2 = rel_res2.result_set[0][0] if rel_res2.result_set else 0

            print(f"  • Initial counts:  {node_cnt} Nodes, {rel_cnt} Relationships")
            print(f"  • Repeated counts: {node_cnt2} Nodes, {rel_cnt2} Relationships")

            if node_cnt == node_cnt2 and rel_cnt == rel_cnt2:
                print("  ✓ IDEMPOTENCY CONFIRMED: Repeated seed run created 0 duplicate nodes and 0 duplicate relationships!")
                report["idempotency_verified"] = True
            else:
                print("  ✗ IDEMPOTENCY FAILURE: Counts changed between runs!")
                report["idempotency_verified"] = False

    except Exception as e:
        err_msg = str(e)
        report["error"] = err_msg
        print(f"  ✗ Connection / Query Error: {type(e).__name__}: {err_msg}")

    print("\n" + "=" * 78)
    return report


if __name__ == "__main__":
    res = run_cloud_diagnostics(verify_idempotency=True)
    is_ok = bool(res.get("tcp_reachable") and res.get("auth_success") and res.get("idempotency_verified"))
    sys.exit(0 if is_ok else 1)
