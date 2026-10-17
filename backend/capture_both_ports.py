import subprocess
import time
import json
import urllib.request
import tempfile
import os
from websockets.sync.client import connect

CHROME_BIN = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT = 9562
ARTIFACT_DIR = "/Users/krishnavarshithkamanaboina/.gemini/antigravity-ide/brain/744c00bc-4df0-4c9a-8318-d5a213f34690"

user_data_dir = tempfile.mkdtemp(prefix="tg_compare_")
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

    with connect(ws_url) as b_ws:
        b_msg_id = [0]
        def b_cmd(method, params=None):
            b_msg_id[0] += 1
            b_ws.send(json.dumps({"id": b_msg_id[0], "method": method, "params": params or {}}))
            while True:
                resp = json.loads(b_ws.recv())
                if resp.get("id") == b_msg_id[0]:
                    return resp.get("result", {})

        for port, name in [(3000, "nextjs_port_3000"), (5173, "vite_port_5173")]:
            target = b_cmd("Target.createTarget", {"url": f"http://localhost:{port}/"})
            page_ws_url = f"ws://127.0.0.1:{PORT}/devtools/page/{target['targetId']}"

            with connect(page_ws_url, max_size=20*1024*1024) as p_ws:
                p_msg_id = [0]
                def p_cmd(method, params=None):
                    p_msg_id[0] += 1
                    p_ws.send(json.dumps({"id": p_msg_id[0], "method": method, "params": params or {}}))
                    while True:
                        resp = json.loads(p_ws.recv())
                        if resp.get("id") == p_msg_id[0]:
                            return resp.get("result", {})

                p_cmd("Page.enable")
                p_cmd("Emulation.setDeviceMetricsOverride", {
                    "width": 1440,
                    "height": 900,
                    "deviceScaleFactor": 1,
                    "mobile": False
                })
                time.sleep(2.0)
                ss = p_cmd("Page.captureScreenshot", {"format": "png"})
                import base64
                path = os.path.join(ARTIFACT_DIR, f"{name}.png")
                with open(path, "wb") as f:
                    f.write(base64.b64decode(ss.get("data", "")))
                print(f"Captured {path}")
finally:
    proc.kill()
