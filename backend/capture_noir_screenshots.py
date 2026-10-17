import os
import json
import time
import tempfile
import subprocess
import urllib.request
from websockets.sync.client import connect

CHROME_BIN = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT = 9555
BASE_URL = "http://localhost:5173"
OUT_DIR = "/Users/krishnavarshithkamanaboina/.gemini/antigravity-ide/brain/8f08d4f9-bc29-41bf-8e41-458a467906a3"

def capture():
    user_data_dir = tempfile.mkdtemp(prefix="tg_noir_")
    chrome_proc = subprocess.Popen([
        CHROME_BIN,
        "--headless",
        "--disable-gpu",
        f"--remote-debugging-port={PORT}",
        f"--user-data-dir={user_data_dir}",
        "--no-first-run",
        "--no-default-browser-check",
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1.2)
    with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json/version") as resp:
        ws_url = json.loads(resp.read().decode())["webSocketDebuggerUrl"]

    with connect(ws_url) as ws:
        msg_id = 0
        def send_cmd(method, params=None):
            nonlocal msg_id
            msg_id += 1
            ws.send(json.dumps({"id": msg_id, "method": method, "params": params or {}}))
            while True:
                r = json.loads(ws.recv())
                if r.get("id") == msg_id:
                    return r.get("result", {})

        target = send_cmd("Target.createTarget", {"url": "about:blank"})
        page_ws_url = f"ws://127.0.0.1:{PORT}/devtools/page/{target['targetId']}"

        with connect(page_ws_url) as page_ws:
            p_id = 0
            def p_cmd(method, params=None):
                nonlocal p_id
                p_id += 1
                page_ws.send(json.dumps({"id": p_id, "method": method, "params": params or {}}))
                while True:
                    r = json.loads(page_ws.recv())
                    if r.get("id") == p_id:
                        return r.get("result", {})

            p_cmd("Page.enable")
            p_cmd("Emulation.setDeviceMetricsOverride", {
                "width": 1440,
                "height": 900,
                "deviceScaleFactor": 1,
                "mobile": False
            })

            # Navigate to landing page
            p_cmd("Page.navigate", {"url": f"{BASE_URL}/"})
            time.sleep(2.5)

            # Capture Hero
            res = p_cmd("Page.captureScreenshot", {"format": "png"})
            with open(os.path.join(OUT_DIR, "noir_hero_desktop.png"), "wb") as f:
                import base64
                f.write(base64.b64decode(res["data"]))
            print("Captured noir_hero_desktop.png")

            # Scroll to problem section
            p_cmd("Runtime.evaluate", {"expression": "document.getElementById('problem')?.scrollIntoView({behavior: 'instant'})"})
            time.sleep(1.0)
            res2 = p_cmd("Page.captureScreenshot", {"format": "png"})
            with open(os.path.join(OUT_DIR, "noir_problem_section.png"), "wb") as f:
                import base64
                f.write(base64.b64decode(res2["data"]))
            print("Captured noir_problem_section.png")

            # Scroll to methodology section
            p_cmd("Runtime.evaluate", {"expression": "document.getElementById('methodology')?.scrollIntoView({behavior: 'instant'})"})
            time.sleep(1.0)
            res3 = p_cmd("Page.captureScreenshot", {"format": "png"})
            with open(os.path.join(OUT_DIR, "noir_methodology_section.png"), "wb") as f:
                import base64
                f.write(base64.b64decode(res3["data"]))
            print("Captured noir_methodology_section.png")

            # Scroll to full-width CTA
            p_cmd("Runtime.evaluate", {"expression": "window.scrollTo(0, document.body.scrollHeight)"})
            time.sleep(1.0)
            res4 = p_cmd("Page.captureScreenshot", {"format": "png"})
            with open(os.path.join(OUT_DIR, "noir_final_cta.png"), "wb") as f:
                import base64
                f.write(base64.b64decode(res4["data"]))
            print("Captured noir_final_cta.png")

if __name__ == "__main__":
    capture()
