import os
import json
import time
import tempfile
import subprocess
import urllib.request
import base64
from websockets.sync.client import connect

CHROME_BIN = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT = 9556
BASE_URL = "http://localhost:5173"
OUT_DIR = "/Users/krishnavarshithkamanaboina/.gemini/antigravity-ide/brain/8f08d4f9-bc29-41bf-8e41-458a467906a3"

def capture_responsive():
    user_data_dir = tempfile.mkdtemp(prefix="tg_resp_")
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

            # 1. Tablet Viewport (768 x 1024)
            p_cmd("Emulation.setDeviceMetricsOverride", {
                "width": 768,
                "height": 1024,
                "deviceScaleFactor": 1,
                "mobile": False
            })
            p_cmd("Page.navigate", {"url": f"{BASE_URL}/"})
            time.sleep(2.5)
            res_tab = p_cmd("Page.captureScreenshot", {"format": "png"})
            with open(os.path.join(OUT_DIR, "noir_hero_tablet.png"), "wb") as f:
                f.write(base64.b64decode(res_tab["data"]))
            print("Captured noir_hero_tablet.png")

            # 2. Mobile Viewport (390 x 844)
            p_cmd("Emulation.setDeviceMetricsOverride", {
                "width": 390,
                "height": 844,
                "deviceScaleFactor": 2,
                "mobile": True
            })
            p_cmd("Page.navigate", {"url": f"{BASE_URL}/"})
            time.sleep(2.5)
            res_mob = p_cmd("Page.captureScreenshot", {"format": "png"})
            with open(os.path.join(OUT_DIR, "noir_hero_mobile.png"), "wb") as f:
                f.write(base64.b64decode(res_mob["data"]))
            print("Captured noir_hero_mobile.png")

if __name__ == "__main__":
    capture_responsive()
