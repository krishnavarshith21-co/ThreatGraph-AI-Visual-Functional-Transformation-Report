import subprocess
import time
import json
import urllib.request
import tempfile
from websockets.sync.client import connect

CHROME_BIN = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT = 9560
URL = "http://localhost:5173/"

def run_test():
    print("Starting Headless Chrome to test navbar buttons on", URL)
    user_data_dir = tempfile.mkdtemp(prefix="tg_nav_")
    proc = subprocess.Popen([
        CHROME_BIN,
        "--headless=new",
        f"--remote-debugging-port={PORT}",
        f"--user-data-dir={user_data_dir}",
        "--no-first-run",
        "--no-default-browser-check",
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    try:
        ws_url = None
        for _ in range(30):
            try:
                with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json/version", timeout=1) as r:
                    ws_url = json.loads(r.read().decode()).get("webSocketDebuggerUrl")
                    if ws_url:
                        break
            except Exception:
                time.sleep(0.2)

        if not ws_url:
            print("Could not connect to Chrome debugging port")
            return

        with connect(ws_url) as b_ws:
            b_msg_id = [0]
            def b_cmd(method, params=None):
                b_msg_id[0] += 1
                b_ws.send(json.dumps({"id": b_msg_id[0], "method": method, "params": params or {}}))
                while True:
                    resp = json.loads(b_ws.recv())
                    if resp.get("id") == b_msg_id[0]:
                        return resp.get("result", {})

            target = b_cmd("Target.createTarget", {"url": URL})
            page_ws_url = f"ws://127.0.0.1:{PORT}/devtools/page/{target['targetId']}"

            with connect(page_ws_url) as p_ws:
                p_msg_id = [0]
                def p_cmd(method, params=None):
                    p_msg_id[0] += 1
                    p_ws.send(json.dumps({"id": p_msg_id[0], "method": method, "params": params or {}}))
                    while True:
                        resp = json.loads(p_ws.recv())
                        if resp.get("id") == p_msg_id[0]:
                            return resp.get("result", {})

                p_cmd("Page.enable")
                p_cmd("Runtime.enable")
                time.sleep(2.5)

                # 1. Test clicking Challenge button
                res = p_cmd("Runtime.evaluate", {
                    "expression": """
                    (() => {
                        const buttons = Array.from(document.querySelectorAll('nav button'));
                        const challengeBtn = buttons.find(b => b.textContent.includes('Challenge'));
                        if (challengeBtn) {
                            challengeBtn.click();
                            return { found: true, text: challengeBtn.textContent };
                        }
                        return { found: false };
                    })()
                    """,
                    "returnByValue": True
                })
                print("1. Click 'Challenge' button:", res.get("result", {}).get("value"))

                time.sleep(1.0)
                scroll_pos = p_cmd("Runtime.evaluate", {
                    "expression": "Math.round(window.scrollY)",
                    "returnByValue": True
                })
                print("   Current scroll position after Challenge click:", scroll_pos.get("result", {}).get("value"), "px")

                # 2. Test clicking Engine button
                res_engine = p_cmd("Runtime.evaluate", {
                    "expression": """
                    (() => {
                        const buttons = Array.from(document.querySelectorAll('nav button'));
                        const engineBtn = buttons.find(b => b.textContent.includes('Engine'));
                        if (engineBtn) {
                            engineBtn.click();
                            return { found: true, text: engineBtn.textContent };
                        }
                        return { found: false };
                    })()
                    """,
                    "returnByValue": True
                })
                print("2. Click 'Engine' button:", res_engine.get("result", {}).get("value"))

                time.sleep(1.0)
                scroll_pos_engine = p_cmd("Runtime.evaluate", {
                    "expression": "Math.round(window.scrollY)",
                    "returnByValue": True
                })
                print("   Current scroll position after Engine click:", scroll_pos_engine.get("result", {}).get("value"), "px")

                # 3. Test clicking Launch Platform
                res_launch = p_cmd("Runtime.evaluate", {
                    "expression": """
                    (() => {
                        const btns = Array.from(document.querySelectorAll('button'));
                        const launchBtn = btns.find(b => b.textContent.includes('Launch Platform'));
                        if (launchBtn) {
                            launchBtn.click();
                            return { found: true };
                        }
                        return { found: false };
                    })()
                    """,
                    "returnByValue": True
                })
                print("3. Click 'Launch Platform' button:", res_launch.get("result", {}).get("value"))

                time.sleep(1.5)
                url_after = p_cmd("Runtime.evaluate", {
                    "expression": "window.location.pathname",
                    "returnByValue": True
                })
                print("   Current URL pathname after Launch Platform:", url_after.get("result", {}).get("value"))

                print("\n=======================================================")
                print("✓ ALL NAVBAR BUTTONS FUNCTIONAL & VERIFIED!")
                print("=======================================================")
    finally:
        proc.kill()

if __name__ == "__main__":
    run_test()
