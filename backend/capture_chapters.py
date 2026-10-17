import subprocess
import time
import json
import urllib.request
import tempfile
import os
from websockets.sync.client import connect

CHROME_BIN = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT = 9568
ARTIFACT_DIR = "/Users/krishnavarshithkamanaboina/.gemini/antigravity-ide/brain/744c00bc-4df0-4c9a-8318-d5a213f34690"

user_data_dir = tempfile.mkdtemp(prefix="tg_chapters_")
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
        print("Failed to get Chrome ws URL")
        exit(1)

    with connect(ws_url) as b_ws:
        b_msg_id = [0]
        def b_cmd(method, params=None):
            b_msg_id[0] += 1
            b_ws.send(json.dumps({"id": b_msg_id[0], "method": method, "params": params or {}}))
            while True:
                resp = json.loads(b_ws.recv())
                if resp.get("id") == b_msg_id[0]:
                    return resp.get("result", {})

        # Test Port 3000 (Next.js)
        target = b_cmd("Target.createTarget", {"url": "http://localhost:3000/"})
        page_ws_url = f"ws://127.0.0.1:{PORT}/devtools/page/{target['targetId']}"

        with connect(page_ws_url, max_size=25*1024*1024) as p_ws:
            p_msg_id = [0]
            def p_cmd(method, params=None):
                p_msg_id[0] += 1
                p_ws.send(json.dumps({"id": p_msg_id[0], "method": method, "params": params or {}}))
                while True:
                    resp = json.loads(p_ws.recv())
                    if resp.get("id") == p_msg_id[0]:
                        return resp.get("result", {})

            p_cmd("Page.enable")
            p_cmd("DOM.enable")
            p_cmd("Emulation.setDeviceMetricsOverride", {
                "width": 1440,
                "height": 900,
                "deviceScaleFactor": 1,
                "mobile": False
            })

            time.sleep(2.5)  # Let Next.js and Three.js load

            # 1. Capture Hero
            res = p_cmd("Page.captureScreenshot", {"format": "png"})
            import base64
            with open(os.path.join(ARTIFACT_DIR, "chapter_hero.png"), "wb") as f:
                f.write(base64.b64decode(res["data"]))
            print("✓ Captured chapter_hero.png")

            # 2. Scroll to and capture Chapter 01 (Correlation Void)
            p_cmd("Runtime.evaluate", {
                "expression": "document.getElementById('challenge')?.scrollIntoView({ behavior: 'instant', block: 'start' });"
            })
            time.sleep(1.2)
            res = p_cmd("Page.captureScreenshot", {"format": "png"})
            with open(os.path.join(ARTIFACT_DIR, "chapter_01_correlation_void.png"), "wb") as f:
                f.write(base64.b64decode(res["data"]))
            print("✓ Captured chapter_01_correlation_void.png")

            # 3. Scroll to and capture Chapter 02 (Methodology)
            p_cmd("Runtime.evaluate", {
                "expression": "document.getElementById('methodology')?.scrollIntoView({ behavior: 'instant', block: 'start' });"
            })
            time.sleep(1.2)
            res = p_cmd("Page.captureScreenshot", {"format": "png"})
            with open(os.path.join(ARTIFACT_DIR, "chapter_02_methodology.png"), "wb") as f:
                f.write(base64.b64decode(res["data"]))
            print("✓ Captured chapter_02_methodology.png")

            # 4. Scroll to and capture Chapter 03 (Topology)
            p_cmd("Runtime.evaluate", {
                "expression": "document.getElementById('topology')?.scrollIntoView({ behavior: 'instant', block: 'start' });"
            })
            time.sleep(2.0)  # Let canvas render
            res = p_cmd("Page.captureScreenshot", {"format": "png"})
            with open(os.path.join(ARTIFACT_DIR, "chapter_03_topology.png"), "wb") as f:
                f.write(base64.b64decode(res["data"]))
            print("✓ Captured chapter_03_topology.png")

            # 5. Scroll to and capture Chapter 04 (Forensic Dossier)
            p_cmd("Runtime.evaluate", {
                "expression": "document.getElementById('evidence')?.scrollIntoView({ behavior: 'instant', block: 'start' });"
            })
            time.sleep(1.2)
            res = p_cmd("Page.captureScreenshot", {"format": "png"})
            with open(os.path.join(ARTIFACT_DIR, "chapter_04_forensics.png"), "wb") as f:
                f.write(base64.b64decode(res["data"]))
            print("✓ Captured chapter_04_forensics.png")

            # 6. Scroll to and capture Chapter 05 (Technical Engine)
            p_cmd("Runtime.evaluate", {
                "expression": "document.getElementById('engine')?.scrollIntoView({ behavior: 'instant', block: 'start' });"
            })
            time.sleep(1.2)
            res = p_cmd("Page.captureScreenshot", {"format": "png"})
            with open(os.path.join(ARTIFACT_DIR, "chapter_05_technical_engine.png"), "wb") as f:
                f.write(base64.b64decode(res["data"]))
            print("✓ Captured chapter_05_technical_engine.png")

            # Also execute Cypher query in Chapter 05 to verify live execution
            p_cmd("Runtime.evaluate", {
                "expression": "document.querySelector('#engine button:has(svg)')?.click() || document.querySelectorAll('#engine button').forEach(b => { if(b.textContent.includes('Execute')) b.click(); });"
            })
            time.sleep(1.5)
            res = p_cmd("Page.captureScreenshot", {"format": "png"})
            with open(os.path.join(ARTIFACT_DIR, "chapter_05_engine_executed.png"), "wb") as f:
                f.write(base64.b64decode(res["data"]))
            print("✓ Captured chapter_05_engine_executed.png")

            # 7. Mobile Viewport Check (390x844)
            p_cmd("Emulation.setDeviceMetricsOverride", {
                "width": 390,
                "height": 844,
                "deviceScaleFactor": 2,
                "mobile": True
            })
            p_cmd("Runtime.evaluate", {
                "expression": "document.getElementById('engine')?.scrollIntoView({ behavior: 'instant', block: 'start' });"
            })
            time.sleep(1.2)
            res = p_cmd("Page.captureScreenshot", {"format": "png"})
            with open(os.path.join(ARTIFACT_DIR, "mobile_engine_390x844.png"), "wb") as f:
                f.write(base64.b64decode(res["data"]))
            print("✓ Captured mobile_engine_390x844.png")

finally:
    proc.terminate()
    proc.wait()
