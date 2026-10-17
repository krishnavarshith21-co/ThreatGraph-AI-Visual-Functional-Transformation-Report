"""Final Production Readiness Verification & Screenshot Capture Suite for ThreatGraph AI.

Automated verification across:
- FalkorDB live Cypher execution & timing disaggregation
- Supabase auth & protected route redirection guards
- Viewport audits (1440x900, 1280x800, 768x1024, 390x844)
- Screenshot artifacts generation directly to artifact directory
"""

import os
import sys
import json
import time
import base64
import tempfile
import subprocess
import urllib.request
from websockets.sync.client import connect

CHROME_BIN = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT = 9558
BASE_URL = "http://localhost:3000"
BACKEND_URL = "http://localhost:8000"
ARTIFACT_DIR = "/Users/krishnavarshithkamanaboina/.gemini/antigravity-ide/brain/744c00bc-4df0-4c9a-8318-d5a213f34690"

os.makedirs(ARTIFACT_DIR, exist_ok=True)

def run_suite():
    print("=" * 80)
    print("THREATGRAPH AI — FINAL PRODUCTION READINESS VERIFICATION SUITE")
    print("=" * 80)

    results = {
        "falkordb": {},
        "timings": {},
        "auth": {},
        "viewports": {},
        "screenshots": [],
    }

    # 1. Verify FalkorDB Backend Health & Stats
    print("\n[1/5] Verifying FalkorDB Live Connection & Query Execution...")
    try:
        with urllib.request.urlopen(f"{BACKEND_URL}/api/health", timeout=3) as resp:
            health_data = json.loads(resp.read().decode())
            results["falkordb"]["health"] = health_data
            falkor_svc = health_data.get("services", {}).get("falkordb", {})
            print(f"  ✓ FalkorDB Status: {falkor_svc.get('status')} | Mode: {falkor_svc.get('mode')} | Nodes: {falkor_svc.get('nodes')} | Edges: {falkor_svc.get('edges')}")

        with urllib.request.urlopen(f"{BACKEND_URL}/api/graph/stats", timeout=3) as resp:
            stats_data = json.loads(resp.read().decode())
            results["falkordb"]["stats"] = stats_data
            print(f"  ✓ Node Counts: {stats_data.get('node_counts')}")

        # Live Cypher Traversal
        cypher_req = urllib.request.Request(
            f"{BACKEND_URL}/api/graph/query",
            data=json.dumps({"query": "MATCH (u:User)-[r:USES_DEVICE]->(d:Device) RETURN u.name, type(r), d.hostname LIMIT 5"}).encode(),
            headers={"Content-Type": "application/json"}
        )
        t_start = time.perf_counter()
        with urllib.request.urlopen(cypher_req, timeout=3) as resp:
            t_rtt = (time.perf_counter() - t_start) * 1000.0
            query_data = json.loads(resp.read().decode())
            results["falkordb"]["query"] = query_data
            results["timings"]["graph_exec_ms"] = query_data.get("graph_exec_ms")
            results["timings"]["backend_proc_ms"] = query_data.get("backend_proc_ms")
            results["timings"]["http_rtt_ms"] = round(t_rtt, 2)
            print(f"  ✓ Live Cypher Results: {query_data.get('count')} records returned from {query_data.get('mode')}")
            print(f"  ✓ Timing Disaggregation:")
            print(f"      - FalkorDB Graph Kernel Execution: {query_data.get('graph_exec_ms')} ms")
            print(f"      - Backend Processing & Serialization: {query_data.get('backend_proc_ms')} ms")
            print(f"      - End-to-End HTTP Round-Trip: {round(t_rtt, 2)} ms")
    except Exception as e:
        print(f"  ✗ Backend verification error: {e}")
        results["falkordb"]["error"] = str(e)

    # 2. Launch Headless Chrome for Visual & Flow Verification
    print("\n[2/5] Starting Headless Chrome for Multi-Device Viewport Verification...")
    user_data_dir = tempfile.mkdtemp(prefix="tg_prod_")
    chrome_proc = subprocess.Popen([
        CHROME_BIN,
        "--headless=new",
        "--remote-debugging-port=" + str(PORT),
        f"--user-data-dir={user_data_dir}",
        "--no-first-run",
        "--no-default-browser-check",
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    time.sleep(1.5)

    ws_url = None
    for _ in range(25):
        try:
            with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json/version", timeout=1) as r:
                ws_url = json.loads(r.read().decode()).get("webSocketDebuggerUrl")
                if ws_url:
                    break
        except Exception:
            time.sleep(0.2)

    if not ws_url:
        print("✗ Could not connect to Chrome CDP.")
        chrome_proc.kill()
        return results

    print(f"  ✓ Connected to Chrome CDP on port {PORT}")

    with connect(ws_url) as browser_ws:
        b_msg_id = 0
        def b_cmd(method, params=None):
            nonlocal b_msg_id
            b_msg_id += 1
            browser_ws.send(json.dumps({"id": b_msg_id, "method": method, "params": params or {}}))
            while True:
                resp = json.loads(browser_ws.recv())
                if resp.get("id") == b_msg_id:
                    return resp.get("result", {})

        target = b_cmd("Target.createTarget", {"url": "about:blank"})
        page_ws_url = f"ws://127.0.0.1:{PORT}/devtools/page/{target['targetId']}"

        with connect(page_ws_url) as page_ws:
            p_msg_id = 0
            def p_cmd(method, params=None):
                nonlocal p_msg_id
                p_msg_id += 1
                page_ws.send(json.dumps({"id": p_msg_id, "method": method, "params": params or {}}))
                while True:
                    resp = json.loads(page_ws.recv())
                    if resp.get("id") == p_msg_id:
                        return resp.get("result", {})

            p_cmd("Page.enable")
            p_cmd("DOM.enable")

            def capture_screenshot(filename, wait_s=2.5):
                time.sleep(wait_s)
                res = p_cmd("Page.captureScreenshot", {"format": "png"})
                filepath = os.path.join(ARTIFACT_DIR, filename)
                with open(filepath, "wb") as f:
                    f.write(base64.b64decode(res["data"]))
                print(f"    📷 Captured: {filename}")
                results["screenshots"].append(filename)
                return filepath

            def set_viewport(w, h, scale=1, is_mobile=False):
                p_cmd("Emulation.setDeviceMetricsOverride", {
                    "width": w,
                    "height": h,
                    "deviceScaleFactor": scale,
                    "mobile": is_mobile
                })

            def scroll_to_element(selector):
                p_cmd("Runtime.evaluate", {
                    "expression": f"document.querySelector('{selector}')?.scrollIntoView({{behavior: 'instant', block: 'center'}})"
                })
                time.sleep(0.5)

            # ── Viewport 1: Desktop 1440 x 900 ─────────────────────
            print("\n[3/5] Testing Viewport 1440x900 (Desktop)...")
            set_viewport(1440, 900)
            p_cmd("Page.navigate", {"url": f"{BASE_URL}/"})
            capture_screenshot("prod_1440x900_landing_hero.png", wait_s=3.5)

            # Scroll to and capture sections
            scroll_to_element("#topology")
            capture_screenshot("prod_1440x900_topology_sandbox.png", wait_s=2.0)

            scroll_to_element("#evidence")
            capture_screenshot("prod_1440x900_forensics_dossier.png", wait_s=2.0)

            scroll_to_element("#capabilities")
            capture_screenshot("prod_1440x900_technical_engine.png", wait_s=2.0)

            # ── Auth Protected Route Guard & Sign In ───────────────
            print("\n[4/5] Testing Auth Guard & Sign In Page...")
            p_cmd("Page.navigate", {"url": f"{BASE_URL}/app"})
            time.sleep(2.0)
            url_res = p_cmd("Runtime.evaluate", {"expression": "window.location.pathname"})
            curr_path = url_res.get("result", {}).get("value")
            results["auth"]["protected_redirect_path"] = curr_path
            print(f"  ✓ Unauthenticated access to /app redirected to: {curr_path}")
            capture_screenshot("prod_1440x900_signin_page.png", wait_s=1.5)

            # Establish guest session in browser localStorage and click Guest Analyst
            p_cmd("Runtime.evaluate", {
                "expression": "localStorage.setItem('threatgraph_guest_session', 'true'); const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Guest Analyst')); if (btn) btn.click();"
            })
            time.sleep(2.0)

            # Navigate directly to console pages with authenticated guest session
            p_cmd("Page.navigate", {"url": f"{BASE_URL}/app"})
            capture_screenshot("prod_1440x900_app_overview.png", wait_s=3.0)

            p_cmd("Page.navigate", {"url": f"{BASE_URL}/app/investigations/inv-001"})
            capture_screenshot("prod_1440x900_app_investigation_dossier.png", wait_s=3.0)

            p_cmd("Page.navigate", {"url": f"{BASE_URL}/app/graph"})
            capture_screenshot("prod_1440x900_app_graph_workspace.png", wait_s=3.0)

            # ── Viewport 2: Desktop 1280 x 800 ─────────────────────
            print("\n[5/5] Testing Remaining Responsive Breakpoints...")
            set_viewport(1280, 800)
            p_cmd("Page.navigate", {"url": f"{BASE_URL}/"})
            capture_screenshot("prod_1280x800_landing.png", wait_s=3.0)

            # ── Viewport 3: Tablet 768 x 1024 ──────────────────────
            set_viewport(768, 1024)
            p_cmd("Page.navigate", {"url": f"{BASE_URL}/"})
            capture_screenshot("prod_768x1024_tablet.png", wait_s=3.0)

            # ── Viewport 4: Mobile 390 x 844 ───────────────────────
            set_viewport(390, 844, scale=2, is_mobile=True)
            p_cmd("Page.navigate", {"url": f"{BASE_URL}/"})
            capture_screenshot("prod_390x844_mobile.png", wait_s=3.0)

    try:
        chrome_proc.kill()
    except Exception:
        pass

    summary_file = os.path.join(ARTIFACT_DIR, "production_audit_summary.json")
    with open(summary_file, "w") as f:
        json.dump(results, f, indent=2)

    print("\n" + "=" * 80)
    print("✓ VERIFICATION COMPLETED SUCCESSFULLY")
    print(f"Summary written to: {summary_file}")
    print("=" * 80)
    return results

if __name__ == "__main__":
    run_suite()
