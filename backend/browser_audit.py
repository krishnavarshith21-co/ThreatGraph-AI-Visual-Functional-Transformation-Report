"""Automated Headless Chrome Browser Audit for ThreatGraph AI.

Uses Google Chrome via Chrome DevTools Protocol (CDP) and websockets:
- Desktop (1440x900)
- Tablet (768x1024)
- Mobile (390x844)
- Auth flow (unauthenticated redirect, guest login, session persistence, sign out)
- Application pages (/app, /investigations, /investigations/:id, /graph, /alerts, /reports, /settings)
"""

import os
import sys
import json
import time
import subprocess
import tempfile
import urllib.request
from websockets.sync.client import connect

CHROME_BIN = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT = 9333
BASE_URL = "http://localhost:5173"

def run_browser_audit():
    print("\n" + "="*70)
    print("THREATGRAPH AI — AUTOMATED BROWSER WORKFLOW AUDIT")
    print("="*70)

    user_data_dir = tempfile.mkdtemp(prefix="tg_chrome_")
    chrome_proc = subprocess.Popen([
        CHROME_BIN,
        "--headless",
        "--disable-gpu",
        f"--remote-debugging-port={PORT}",
        f"--user-data-dir={user_data_dir}",
        "--no-first-run",
        "--no-default-browser-check",
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    audit_results = {
        "passed": [],
        "failed": [],
        "details": {},
    }

    def record_p(name, detail=""):
        audit_results["passed"].append(name)
        audit_results["details"][name] = {"status": "PASSED", "detail": detail}
        print(f"  ✓ {name}: {detail}")

    def record_f(name, reason=""):
        audit_results["failed"].append(name)
        audit_results["details"][name] = {"status": "FAILED", "reason": reason}
        print(f"  ✗ {name}: {reason}")

    try:
        # Wait for Chrome to listen on port
        ws_url = None
        for _ in range(30):
            try:
                with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json/version", timeout=1) as resp:
                    data = json.loads(resp.read().decode())
                    ws_url = data.get("webSocketDebuggerUrl")
                    if ws_url:
                        break
            except Exception:
                time.sleep(0.3)

        if not ws_url:
            print("✗ Blocker: Could not connect to Chrome DevTools Protocol")
            return audit_results

        print(f"✓ Connected to Chrome CDP at ws://127.0.0.1:{PORT}")

        with connect(ws_url) as ws:
            msg_id = 0

            def send_cmd(method, params=None):
                nonlocal msg_id
                msg_id += 1
                payload = {"id": msg_id, "method": method, "params": params or {}}
                ws.send(json.dumps(payload))
                while True:
                    res_raw = ws.recv()
                    res = json.loads(res_raw)
                    if res.get("id") == msg_id:
                        return res.get("result", {})

            # Create a target page
            target = send_cmd("Target.createTarget", {"url": "about:blank"})
            target_id = target.get("targetId")
            
            # Connect to page target
            page_ws_url = f"ws://127.0.0.1:{PORT}/devtools/page/{target_id}"
            with connect(page_ws_url) as page_ws:
                page_msg_id = 0
                def send_page_cmd(method, params=None):
                    nonlocal page_msg_id
                    page_msg_id += 1
                    payload = {"id": page_msg_id, "method": method, "params": params or {}}
                    page_ws.send(json.dumps(payload))
                    while True:
                        res_raw = page_ws.recv()
                        res = json.loads(res_raw)
                        if res.get("id") == page_msg_id:
                            return res.get("result", {})

                send_page_cmd("Page.enable")
                send_page_cmd("Runtime.enable")

                def eval_js(expr):
                    r = send_page_cmd("Runtime.evaluate", {"expression": expr, "returnByValue": True})
                    return r.get("result", {}).get("value")

                def nav(url, wait_sec=1.5):
                    send_page_cmd("Page.navigate", {"url": url})
                    time.sleep(wait_sec)

                def set_viewport(w, h, is_mobile=False):
                    send_page_cmd("Emulation.setDeviceMetricsOverride", {
                        "width": w,
                        "height": h,
                        "deviceScaleFactor": 1,
                        "mobile": is_mobile
                    })

                # ── BROWSER TEST 1: Landing Page Desktop (1440x900) ────────
                print("\n[Test 1: Landing Page Desktop Layout 1440x900]")
                set_viewport(1440, 900)
                nav(f"{BASE_URL}/")
                title = eval_js("document.title")
                has_hero = eval_js("Boolean(document.querySelector('h1'))")
                headline_text = eval_js("document.querySelector('h1')?.innerText")
                has_visual = eval_js("Boolean(document.querySelector('canvas') || document.querySelector('svg'))")
                has_demo_preview = eval_js("document.body.innerText.includes('TARGET INVESTIGATION')")
                scroll_w = eval_js("document.documentElement.scrollWidth")
                client_w = eval_js("document.documentElement.clientWidth")
                has_overflow = scroll_w > client_w

                if has_hero and ("See the connections" in headline_text or "Understand the threat" in headline_text or "Every threat" in headline_text) and has_visual and not has_overflow:
                    record_p("Landing Page Desktop 1440x900", f"Headline='{headline_text}', Interactive Visual=Present, HorizontalOverflow={has_overflow}")
                else:
                    record_f("Landing Page Desktop 1440x900", f"has_hero={has_hero}, visual={has_visual}, overflow={has_overflow}")

                # ── BROWSER TEST 2: Protected Route Redirection ───────────
                print("\n[Test 2: Protected Route Redirection (Unauthenticated)]")
                # Clear storage
                eval_js("localStorage.clear()")
                nav(f"{BASE_URL}/app", wait_sec=2.0)
                current_url = eval_js("window.location.pathname")
                has_signin_heading = eval_js("document.body.innerText.includes('Analyst Portal Access')")
                
                if current_url == "/signin" and has_signin_heading:
                    record_p("Protected Route Redirection", f"Navigating to /app redirected to {current_url} ('Analyst Portal Access')")
                else:
                    record_f("Protected Route Redirection", f"Current URL={current_url}, heading={has_signin_heading}")

                # ── BROWSER TEST 3: Split-Screen Authentication Form ───────
                print("\n[Test 3: Authentication Split-Screen & Controls]")
                nav(f"{BASE_URL}/signin")
                has_email_input = eval_js("Boolean(document.querySelector('input[type=\"email\"]'))")
                has_password_input = eval_js("Boolean(document.querySelector('input[type=\"password\"]'))")
                has_guest_btn = eval_js("document.body.innerText.includes('Guest Analyst')")
                
                if has_email_input and has_password_input and has_guest_btn:
                    record_p("Sign In Form Elements", "Email input, Password input, and Guest Analyst CTA verified")
                else:
                    record_f("Sign In Form Elements", f"email={has_email_input}, password={has_password_input}, guest={has_guest_btn}")

                # ── BROWSER TEST 4: Guest Sign-In & Dashboard Access ──────
                print("\n[Test 4: Guest Analyst Sign-In & Dashboard Load]")
                # Click guest analyst button
                eval_js("""
                    const buttons = Array.from(document.querySelectorAll('button'));
                    const guestBtn = buttons.find(b => b.innerText.includes('Guest Analyst'));
                    if (guestBtn) guestBtn.click();
                """)
                time.sleep(1.5)
                # Now navigate to /app
                nav(f"{BASE_URL}/app", wait_sec=2.0)
                app_url = eval_js("window.location.pathname")
                dashboard_heading = eval_js("document.querySelector('h1')?.innerText")
                has_alert_queue = eval_js("document.body.innerText.toLowerCase().includes('security alert queue')")
                has_telemetry = eval_js("document.body.innerText.includes('Graph Engine Active') || document.body.innerText.includes('FalkorDB')")

                if app_url == "/app" and has_alert_queue and has_telemetry:
                    record_p("Authenticated Dashboard Load", f"Path={app_url}, Heading='{dashboard_heading}', Live Telemetry=Active")
                else:
                    record_f("Authenticated Dashboard Load", f"app_url={app_url}, heading={dashboard_heading}, alert_q={has_alert_queue}, telem={has_telemetry}")

                # ── BROWSER TEST 5: Session Restoration across Refresh ────
                print("\n[Test 5: Session Restoration On Refresh]")
                nav(f"{BASE_URL}/app", wait_sec=1.5)
                restored_url = eval_js("window.location.pathname")
                is_authenticated = eval_js("localStorage.getItem('threatgraph_guest_session') === 'true'")

                if restored_url == "/app" and is_authenticated:
                    record_p("Session Restoration", "Guest analyst session successfully restored from localStorage upon page reload")
                else:
                    record_f("Session Restoration", f"URL={restored_url}, is_auth={is_authenticated}")

                # ── BROWSER TEST 6: Investigation Queue (/app/investigations) ─
                print("\n[Test 6: Investigations Pipeline Page]")
                nav(f"{BASE_URL}/app/investigations", wait_sec=1.5)
                inv_heading = eval_js("document.querySelector('h1')?.innerText")
                has_start_btn = eval_js("document.body.innerText.includes('Start New Investigation')")
                has_cards = eval_js("Boolean(document.querySelector('a[href*=\"/app/investigations/\"]'))")

                if "Security Investigations" in (inv_heading or "") and has_start_btn:
                    record_p("Investigations Pipeline Page", f"Heading='{inv_heading}', Start CTA=Present, DossiersListed={has_cards}")
                else:
                    record_f("Investigations Pipeline Page", f"Heading={inv_heading}, cards={has_cards}")

                # ── BROWSER TEST 7: Investigation Dossier (/app/investigations/:id) ─
                print("\n[Test 7: Investigation Detail Dossier]")
                nav(f"{BASE_URL}/app/investigations/inv-demo-001", wait_sec=2.5)
                has_cytoscape = eval_js("Boolean(document.querySelector('.relative.w-full.h-full canvas') || document.querySelector('canvas'))")
                has_findings_tab = eval_js("document.body.innerText.includes('Evidence & Findings')")
                has_reasoning_tab = eval_js("document.body.innerText.includes('Agent Reasoning Log')")
                has_trajectory = eval_js("document.body.innerText.includes('Reconstructed Attack Trajectory')")

                if has_findings_tab and has_reasoning_tab:
                    record_p("Investigation Dossier Detail", f"FindingsTab=True, ReasoningTab=True, AttackTrajectory={has_trajectory}, GraphCanvas={has_cytoscape}")
                else:
                    record_f("Investigation Dossier Detail", f"findings={has_findings_tab}, reasoning={has_reasoning_tab}")

                # ── BROWSER TEST 8: Graph Explorer (/app/graph) ────────────
                print("\n[Test 8: Graph Explorer & Cypher Console]")
                nav(f"{BASE_URL}/app/graph", wait_sec=2.0)
                has_cypher = eval_js("Boolean(document.querySelector('input[type=\"text\"]'))")
                has_depth_slider = eval_js("Boolean(document.querySelector('input[type=\"range\"]'))")
                has_cypher_presets = eval_js("document.body.innerText.includes('Full Topology Cluster')")

                if has_cypher and has_depth_slider and has_cypher_presets:
                    record_p("Graph Explorer & Cypher Console", "Cypher query bar, hop depth slider, and topology presets verified")
                else:
                    record_f("Graph Explorer & Cypher Console", f"cypher={has_cypher}, slider={has_depth_slider}, presets={has_cypher_presets}")

                # ── BROWSER TEST 9: Alert Triage Queue (/app/alerts) ──────
                print("\n[Test 9: Alert Triage Queue Page]")
                nav(f"{BASE_URL}/app/alerts", wait_sec=1.5)
                alerts_heading = eval_js("document.querySelector('h1')?.innerText")
                has_investigate_actions = eval_js("Array.from(document.querySelectorAll('button')).some(b => b.innerText.includes('Investigate'))")

                if "Security Alert Queue" in (alerts_heading or "") and has_investigate_actions:
                    record_p("Alert Triage Queue", f"Heading='{alerts_heading}', Direct Triage Actions={has_investigate_actions}")
                else:
                    record_f("Alert Triage Queue", f"Heading={alerts_heading}, actions={has_investigate_actions}")

                # ── BROWSER TEST 10: Reports Documentation (/app/reports) ──
                print("\n[Test 10: Investigation Reports Page]")
                nav(f"{BASE_URL}/app/reports", wait_sec=1.5)
                reports_heading = eval_js("document.querySelector('h1')?.innerText")
                has_export_btns = eval_js("document.body.innerText.includes('Markdown') && document.body.innerText.includes('JSON')")

                if "Investigation Reports" in (reports_heading or "") and has_export_btns:
                    record_p("Investigation Reports Page", f"Heading='{reports_heading}', Export Buttons (Markdown/JSON)=Active")
                else:
                    record_f("Investigation Reports Page", f"Heading={reports_heading}, export={has_export_btns}")

                # ── BROWSER TEST 11: Settings & Sign-Out (/app/settings) ───
                print("\n[Test 11: Settings Page & Sign-Out Flow]")
                nav(f"{BASE_URL}/app/settings", wait_sec=1.5)
                has_falkordb_status = eval_js("document.body.innerText.includes('FalkorDB Graph')")
                has_gemini_config = eval_js("document.body.innerText.includes('Google Gemini 2.0 Flash')")
                has_signout_btn = eval_js("document.body.innerText.includes('Sign Out')")

                if has_falkordb_status and has_gemini_config and has_signout_btn:
                    record_p("Settings & Telemetry Display", "Connected Graph engine, Gemini LLM agent, and Sign Out CTA verified")
                else:
                    record_f("Settings & Telemetry Display", f"falkor={has_falkordb_status}, gemini={has_gemini_config}, signout={has_signout_btn}")

                # Execute Sign Out
                eval_js("""
                    const buttons = Array.from(document.querySelectorAll('button'));
                    const signOutBtn = buttons.find(b => b.innerText.includes('Sign Out'));
                    if (signOutBtn) signOutBtn.click();
                """)
                time.sleep(1.0)
                post_signout_url = eval_js("window.location.pathname")
                storage_cleared = eval_js("localStorage.getItem('threatgraph_guest_session') === null")

                if post_signout_url == "/signin" and storage_cleared:
                    record_p("Sign Out Execution & Redirection", f"Signed out, session cleared, redirected to {post_signout_url}")
                else:
                    record_f("Sign Out Execution & Redirection", f"URL={post_signout_url}, cleared={storage_cleared}")

                # ── BROWSER TEST 12: Tablet Responsiveness (768x1024) ──────
                print("\n[Test 12: Tablet Viewport Responsiveness 768x1024]")
                set_viewport(768, 1024)
                nav(f"{BASE_URL}/", wait_sec=1.5)
                tablet_overflow = eval_js("document.documentElement.scrollWidth > document.documentElement.clientWidth")
                tablet_has_hero = eval_js("Boolean(document.querySelector('h1'))")

                if not tablet_overflow and tablet_has_hero:
                    record_p("Tablet Viewport 768x1024", f"Zero horizontal scroll, headline visible, overflow={tablet_overflow}")
                else:
                    record_f("Tablet Viewport 768x1024", f"overflow={tablet_overflow}")

                # ── BROWSER TEST 13: Mobile Responsiveness (390x844) ───────
                print("\n[Test 13: Mobile Viewport Responsiveness 390x844]")
                set_viewport(390, 844, is_mobile=True)
                nav(f"{BASE_URL}/", wait_sec=1.5)
                mobile_overflow = eval_js("document.documentElement.scrollWidth > document.documentElement.clientWidth")
                mobile_hero = eval_js("Boolean(document.querySelector('h1'))")

                if not mobile_overflow and mobile_hero:
                    record_p("Mobile Viewport 390x844", f"Zero horizontal scroll, responsive reflow verified, overflow={mobile_overflow}")
                else:
                    record_f("Mobile Viewport 390x844", f"overflow={mobile_overflow}")

    finally:
        chrome_proc.terminate()
        try:
            chrome_proc.wait(timeout=3)
        except Exception:
            chrome_proc.kill()

    print("\n" + "="*70)
    print(f"BROWSER AUDIT RESULTS: {len(audit_results['passed'])} PASSED, {len(audit_results['failed'])} FAILED")
    print("="*70)

    with open("browser_results.json", "w") as f:
        json.dump(audit_results, f, indent=2)
    print("Wrote detailed results to backend/browser_results.json\n")
    return audit_results

if __name__ == "__main__":
    run_browser_audit()
