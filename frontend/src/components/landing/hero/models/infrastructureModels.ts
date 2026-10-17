import * as THREE from 'three';

// ── Shared Materials for Infrastructure ─────────────────────────────
export function createInfrastructureMaterials() {
  const cabinetMat = new THREE.MeshStandardMaterial({
    color: 0x0C121A,
    metalness: 0.88,
    roughness: 0.22,
  });

  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x1A2735,
    metalness: 0.92,
    roughness: 0.18,
  });

  const bladeFaceMat = new THREE.MeshStandardMaterial({
    color: 0x141E2A,
    metalness: 0.82,
    roughness: 0.28,
  });

  const driveCaddyMat = new THREE.MeshStandardMaterial({
    color: 0x101822,
    metalness: 0.85,
    roughness: 0.25,
  });

  const plinthMat = new THREE.MeshStandardMaterial({
    color: 0x1F2E3E,
    roughness: 0.28,
    metalness: 0.90,
  });

  const ledAmber = new THREE.MeshBasicMaterial({ color: 0xFFB84D });
  const ledCyan = new THREE.MeshBasicMaterial({ color: 0x83DCE8 });
  const ledGreen = new THREE.MeshBasicMaterial({ color: 0x4CAF50 });
  const ledRed = new THREE.MeshBasicMaterial({ color: 0xDC666B });

  const luminousCyanEdgeMat = new THREE.LineBasicMaterial({
    color: 0x83DCE8,
    linewidth: 1.5,
    transparent: true,
    opacity: 0.92,
  });

  const luminousRedEdgeMat = new THREE.LineBasicMaterial({
    color: 0xF05261,
    linewidth: 1.5,
    transparent: true,
    opacity: 0.95,
  });

  const threatPlinthMat = new THREE.MeshStandardMaterial({
    color: 0x150A0E,
    roughness: 0.35,
    metalness: 0.88,
  });

  const threatCabinetMat = new THREE.MeshStandardMaterial({
    color: 0x11080C,
    roughness: 0.22,
    metalness: 0.92,
  });

  const threatBladeMat = new THREE.MeshStandardMaterial({
    color: 0x1A0D13,
    roughness: 0.28,
    metalness: 0.85,
  });

  const holographicScreenMat = new THREE.MeshBasicMaterial({
    color: 0x46D7F5,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.95,
  });

  return {
    cabinetMat,
    frameMat,
    bladeFaceMat,
    driveCaddyMat,
    plinthMat,
    threatPlinthMat,
    threatCabinetMat,
    threatBladeMat,
    ledAmber,
    ledCyan,
    ledGreen,
    ledRed,
    luminousCyanEdgeMat,
    luminousRedEdgeMat,
    holographicScreenMat,
  };
}

// ── 1. Detailed Compute Server Rack (42U Blade Architecture) ─────────
export function createComputeServerRack(
  x: number,
  z: number,
  totalHeight: number,
  mats: ReturnType<typeof createInfrastructureMaterials>,
  isAmber = false
): THREE.Group {
  const rack = new THREE.Group();
  rack.position.set(x, 0, z);

  // 4 Vertical structural corner posts
  const pillarGeo = new THREE.BoxGeometry(0.08, totalHeight, 0.08);
  const postOffsets = [
    [-0.52, 0.52],
    [0.52, 0.52],
    [-0.52, -0.52],
    [0.52, -0.52],
  ];
  postOffsets.forEach(([px, pz]) => {
    const pillar = new THREE.Mesh(pillarGeo, mats.frameMat);
    pillar.position.set(px, totalHeight / 2, pz);
    rack.add(pillar);
  });

  // Top exhaust hood & bottom mounting plinth
  const capGeo = new THREE.BoxGeometry(1.18, 0.10, 1.18);
  const topCap = new THREE.Mesh(capGeo, mats.cabinetMat);
  topCap.position.y = totalHeight + 0.05;
  rack.add(topCap);

  const basePlinth = new THREE.Mesh(capGeo, mats.cabinetMat);
  basePlinth.position.y = 0.05;
  rack.add(basePlinth);

  // Side and rear metal enclosure panels
  const sidePanelGeo = new THREE.BoxGeometry(0.04, totalHeight * 0.92, 1.0);
  const leftSide = new THREE.Mesh(sidePanelGeo, mats.cabinetMat);
  leftSide.position.set(-0.52, totalHeight / 2, 0);
  rack.add(leftSide);

  const rightSide = new THREE.Mesh(sidePanelGeo, mats.cabinetMat);
  rightSide.position.set(0.52, totalHeight / 2, 0);
  rack.add(rightSide);

  const rearPanelGeo = new THREE.BoxGeometry(1.0, totalHeight * 0.92, 0.04);
  const rear = new THREE.Mesh(rearPanelGeo, mats.cabinetMat);
  rear.position.set(0, totalHeight / 2, -0.52);
  rack.add(rear);

  // 8 Stacked 1U/2U server blade drawers inside the front bay
  const numBlades = 8;
  const bladeHeight = (totalHeight * 0.86) / numBlades;
  const bladeGeo = new THREE.BoxGeometry(0.96, bladeHeight - 0.03, 0.96);
  const ledDotGeo = new THREE.SphereGeometry(0.022, 6, 6);
  const latchGeo = new THREE.BoxGeometry(0.16, 0.035, 0.02);

  for (let b = 0; b < numBlades; b++) {
    const by = 0.16 + b * bladeHeight + bladeHeight / 2;
    const blade = new THREE.Mesh(bladeGeo, mats.bladeFaceMat);
    blade.position.set(0, by, 0.02);
    rack.add(blade);

    // Recessed horizontal unit seam
    const seamGeo = new THREE.BoxGeometry(0.94, 0.012, 0.02);
    const seam = new THREE.Mesh(seamGeo, mats.frameMat);
    seam.position.set(0, by + bladeHeight * 0.38, 0.51);
    rack.add(seam);

    // Front-panel LED status indicators (amber, cyan, green)
    const numLeds = 4;
    for (let l = 0; l < numLeds; l++) {
      const isWarning = isAmber && (b + l) % 3 === 0;
      const ledMat = isWarning ? mats.ledAmber : (l === 0 ? mats.ledGreen : mats.ledCyan);
      const led = new THREE.Mesh(ledDotGeo, ledMat);
      led.position.set(-0.38 + l * 0.055, by, 0.51);
      rack.add(led);
    }

    // Horizontal illuminated LED line strip
    const stripGeo = new THREE.BoxGeometry(0.55, 0.02, 0.015);
    const stripMat = isAmber ? mats.ledAmber : mats.ledCyan;
    const strip = new THREE.Mesh(stripGeo, stripMat);
    strip.position.set(-0.10, by - bladeHeight * 0.22, 0.515);
    rack.add(strip);

    // Server drive caddy latch handle
    const latch = new THREE.Mesh(latchGeo, mats.frameMat);
    latch.position.set(0.34, by, 0.51);
    rack.add(latch);
  }

  // Outer luminous edge outline
  const outlineGeo = new THREE.BoxGeometry(1.20, totalHeight + 0.10, 1.20);
  const outline = new THREE.LineSegments(
    new THREE.EdgesGeometry(outlineGeo),
    isAmber
      ? new THREE.LineBasicMaterial({ color: 0xD8AE69, transparent: true, opacity: 0.60 })
      : mats.luminousCyanEdgeMat
  );
  outline.position.y = (totalHeight + 0.10) / 2;
  rack.add(outline);

  return rack;
}

// ── 2. Storage Array SAN/NAS Rack (High-Density Drive Trays) ─────────
export function createStorageArrayRack(
  x: number,
  z: number,
  totalHeight: number,
  mats: ReturnType<typeof createInfrastructureMaterials>
): THREE.Group {
  const rack = new THREE.Group();
  rack.position.set(x, 0, z);

  // Cabinet pillars
  const pillarGeo = new THREE.BoxGeometry(0.08, totalHeight, 0.08);
  [[-0.52, 0.52], [0.52, 0.52], [-0.52, -0.52], [0.52, -0.52]].forEach(([px, pz]) => {
    const pillar = new THREE.Mesh(pillarGeo, mats.frameMat);
    pillar.position.set(px, totalHeight / 2, pz);
    rack.add(pillar);
  });

  // Top/bottom caps
  const capGeo = new THREE.BoxGeometry(1.18, 0.10, 1.18);
  const topCap = new THREE.Mesh(capGeo, mats.cabinetMat);
  topCap.position.y = totalHeight + 0.05;
  rack.add(topCap);

  const basePlinth = new THREE.Mesh(capGeo, mats.cabinetMat);
  basePlinth.position.y = 0.05;
  rack.add(basePlinth);

  // 4 High-density disk storage drawers (4 rows of 4 drive caddies = 16 drives)
  const numDrawers = 4;
  const drawerHeight = (totalHeight * 0.86) / numDrawers;
  const caddyGeo = new THREE.BoxGeometry(0.20, drawerHeight * 0.75, 0.03);
  const ledDotGeo = new THREE.SphereGeometry(0.018, 6, 6);

  for (let d = 0; d < numDrawers; d++) {
    const dy = 0.18 + d * drawerHeight + drawerHeight / 2;

    // Drawer chassis
    const drawerGeo = new THREE.BoxGeometry(0.96, drawerHeight - 0.04, 0.96);
    const drawer = new THREE.Mesh(drawerGeo, mats.cabinetMat);
    drawer.position.set(0, dy, 0.02);
    rack.add(drawer);

    // 4 hot-swap drive caddies per drawer
    for (let c = 0; c < 4; c++) {
      const cx = -0.33 + c * 0.22;
      const caddy = new THREE.Mesh(caddyGeo, mats.driveCaddyMat);
      caddy.position.set(cx, dy, 0.51);
      rack.add(caddy);

      // Amber / blue drive activity LED
      const isGold = (d + c) % 2 === 0;
      const led = new THREE.Mesh(ledDotGeo, isGold ? mats.ledAmber : mats.ledCyan);
      led.position.set(cx, dy + drawerHeight * 0.25, 0.528);
      rack.add(led);
    }
  }

  return rack;
}

// ── 3. Infrastructure Cluster Platform (Combines Racks on Stepped Plinth) ──
export function createClusterPlatform(
  cx: number,
  cz: number,
  width: number,
  depth: number,
  rows: number,
  cols: number,
  rackType: 'compute' | 'storage',
  mats: ReturnType<typeof createInfrastructureMaterials>,
  isAmber = false
): THREE.Group {
  const clusterGroup = new THREE.Group();
  clusterGroup.position.set(cx, 0, cz);

  // Raised stepped plinth
  const baseGeo = new THREE.BoxGeometry(width + 0.8, 0.28, depth + 0.8);
  const base = new THREE.Mesh(baseGeo, mats.plinthMat);
  base.position.y = 0.14;
  base.receiveShadow = true;
  clusterGroup.add(base);

  const topPlinthGeo = new THREE.BoxGeometry(width + 0.2, 0.16, depth + 0.2);
  const topPlinth = new THREE.Mesh(topPlinthGeo, mats.cabinetMat);
  topPlinth.position.y = 0.34;
  clusterGroup.add(topPlinth);

  // Fine edge illumination trace
  const edgeLine = new THREE.LineSegments(new THREE.EdgesGeometry(topPlinthGeo), mats.luminousCyanEdgeMat);
  edgeLine.position.y = 0.34;
  clusterGroup.add(edgeLine);

  // Populate server racks
  const xSpacing = width / cols;
  const zSpacing = depth / rows;
  const startX = -width / 2 + xSpacing / 2;
  const startZ = -depth / 2 + zSpacing / 2;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tx = startX + c * xSpacing;
      const tz = startZ + r * zSpacing;
      const rackHeight = 2.5 + Math.random() * 0.25;

      const rack = rackType === 'storage'
        ? createStorageArrayRack(tx, tz, rackHeight, mats)
        : createComputeServerRack(tx, tz, rackHeight, mats, isAmber);

      rack.position.y = 0.42;
      clusterGroup.add(rack);
    }
  }

  return clusterGroup;
}

// ── 4. Stepped Database Cluster Matrix (`res-db-customers` / `dev-srv-db`) ─
export function createDatabaseClusterMatrix(
  cx: number,
  cz: number,
  mats: ReturnType<typeof createInfrastructureMaterials>
): THREE.Group {
  const dbGroup = new THREE.Group();
  dbGroup.position.set(cx, 0, cz);

  const pedGeo = new THREE.BoxGeometry(4.8, 0.45, 4.8);
  const ped = new THREE.Mesh(pedGeo, mats.plinthMat);
  ped.position.y = 0.225;
  dbGroup.add(ped);

  const pedEdge = new THREE.LineSegments(new THREE.EdgesGeometry(pedGeo), mats.luminousCyanEdgeMat);
  pedEdge.position.y = 0.225;
  dbGroup.add(pedEdge);

  // 4x4 matrix of glowing storage units with metallic frames
  const cubeSize = 0.70;
  const spacing = 0.92;
  const start = -1.5 * spacing;

  for (let x = 0; x < 4; x++) {
    for (let z = 0; z < 4; z++) {
      const isGold = (x + z) % 3 === 0;
      const h = 0.6 + ((x * 3 + z * 2) % 4) * 0.22;
      const boxGeo = new THREE.BoxGeometry(cubeSize, h, cubeSize);
      const boxMat = new THREE.MeshStandardMaterial({
        color: isGold ? 0xD8B16B : 0x2879D8,
        emissive: isGold ? 0xD8B16B : 0x2879D8,
        emissiveIntensity: 0.65,
        roughness: 0.22,
        metalness: 0.75,
      });
      const box = new THREE.Mesh(boxGeo, boxMat);
      box.position.set(start + x * spacing, 0.45 + h / 2, start + z * spacing);
      dbGroup.add(box);

      const edgeLine = new THREE.LineSegments(
        new THREE.EdgesGeometry(boxGeo),
        new THREE.LineBasicMaterial({ color: isGold ? 0xFFE082 : 0x83DCE8, transparent: true, opacity: 0.85 })
      );
      edgeLine.position.copy(box.position);
      dbGroup.add(edgeLine);
    }
  }

  return dbGroup;
}

// ── 5. Operator Workstation with Holographic Monitor & Silhouette ───
export function createAnalystWorkstation(
  x: number,
  z: number,
  rotationY: number,
  mats: ReturnType<typeof createInfrastructureMaterials>
): THREE.Group {
  const wsGroup = new THREE.Group();
  wsGroup.position.set(x, 0, z);
  wsGroup.rotation.y = rotationY;

  // Platform
  const deskPlinthGeo = new THREE.BoxGeometry(1.8, 0.22, 1.5);
  const deskPlinth = new THREE.Mesh(deskPlinthGeo, mats.plinthMat);
  deskPlinth.position.y = 0.11;
  wsGroup.add(deskPlinth);

  // Console desk
  const consoleGeo = new THREE.BoxGeometry(1.3, 0.65, 0.45);
  const consoleMesh = new THREE.Mesh(consoleGeo, mats.cabinetMat);
  consoleMesh.position.set(0, 0.54, -0.25);
  wsGroup.add(consoleMesh);

  // Dual Glowing Monitors
  const screenGeo = new THREE.PlaneGeometry(0.62, 0.42);
  const screenLeft = new THREE.Mesh(screenGeo, mats.holographicScreenMat);
  screenLeft.position.set(-0.34, 1.05, -0.18);
  screenLeft.rotation.y = 0.22;
  screenLeft.rotation.x = -0.12;
  wsGroup.add(screenLeft);

  const screenRight = new THREE.Mesh(screenGeo, mats.holographicScreenMat);
  screenRight.position.set(0.34, 1.05, -0.18);
  screenRight.rotation.y = -0.22;
  screenRight.rotation.x = -0.12;
  wsGroup.add(screenRight);

  // Tower PC Case
  const pcGeo = new THREE.BoxGeometry(0.22, 0.52, 0.44);
  const pc = new THREE.Mesh(pcGeo, mats.cabinetMat);
  pc.position.set(0.70, 0.58, -0.25);
  wsGroup.add(pc);

  // Vertical LED light on PC case
  const pcLedGeo = new THREE.BoxGeometry(0.02, 0.35, 0.02);
  const pcLed = new THREE.Mesh(pcLedGeo, mats.ledCyan);
  pcLed.position.set(0.70, 0.58, -0.02);
  wsGroup.add(pcLed);

  // Stylized operator silhouette
  const bodyGeo = new THREE.CylinderGeometry(0.20, 0.28, 0.75, 12);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1A2732, roughness: 0.85 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.set(0, 0.60, 0.32);
  wsGroup.add(body);

  const headGeo = new THREE.SphereGeometry(0.15, 12, 12);
  const head = new THREE.Mesh(headGeo, bodyMat);
  head.position.set(0, 1.10, 0.32);
  wsGroup.add(head);

  return wsGroup;
}

// ── 6. External Threat Cluster (Crimson Red Hostile Cluster / TOR Node) ───
export function createExternalThreatCluster(
  cx: number,
  cz: number,
  mats: ReturnType<typeof createInfrastructureMaterials>
): THREE.Group {
  const threatGroup = new THREE.Group();
  threatGroup.position.set(cx, 0, cz);

  // Stepped Plinth with ominous glowing crimson edges
  const basePlinthGeo = new THREE.BoxGeometry(4.6, 0.32, 4.6);
  const basePlinth = new THREE.Mesh(basePlinthGeo, mats.threatPlinthMat);
  basePlinth.position.y = 0.16;
  basePlinth.receiveShadow = true;
  threatGroup.add(basePlinth);

  const topPlinthGeo = new THREE.BoxGeometry(4.0, 0.18, 4.0);
  const topPlinth = new THREE.Mesh(topPlinthGeo, mats.threatCabinetMat);
  topPlinth.position.y = 0.38;
  threatGroup.add(topPlinth);

  // Glowing red perimeter edge traces
  const redEdge = new THREE.LineSegments(new THREE.EdgesGeometry(topPlinthGeo), mats.luminousRedEdgeMat);
  redEdge.position.y = 0.38;
  threatGroup.add(redEdge);

  const baseRedEdge = new THREE.LineSegments(new THREE.EdgesGeometry(basePlinthGeo), mats.luminousRedEdgeMat);
  baseRedEdge.position.y = 0.16;
  threatGroup.add(baseRedEdge);

  // 4 Red-Lit Hostile Compute Racks (2x2 grid)
  const rackPositions = [
    [-0.95, -0.95],
    [0.95, -0.95],
    [-0.95, 0.95],
    [0.95, 0.95],
  ];

  rackPositions.forEach(([rx, rz]) => {
    const rackHeight = 2.6;
    const rack = new THREE.Group();
    rack.position.set(rx, 0.47, rz);

    // Pillars
    const pillarGeo = new THREE.BoxGeometry(0.08, rackHeight, 0.08);
    [[-0.5, 0.5], [0.5, 0.5], [-0.5, -0.5], [0.5, -0.5]].forEach(([px, pz]) => {
      const pillar = new THREE.Mesh(pillarGeo, mats.threatCabinetMat);
      pillar.position.set(px, rackHeight / 2, pz);
      rack.add(pillar);
    });

    // Top cap & base
    const capGeo = new THREE.BoxGeometry(1.14, 0.08, 1.14);
    const topCap = new THREE.Mesh(capGeo, mats.threatCabinetMat);
    topCap.position.y = rackHeight + 0.04;
    rack.add(topCap);

    const botCap = new THREE.Mesh(capGeo, mats.threatCabinetMat);
    botCap.position.y = 0.04;
    rack.add(botCap);

    // 8 Stacked server blades with crimson LEDs
    const bladeH = (rackHeight * 0.86) / 8;
    const bladeGeo = new THREE.BoxGeometry(0.94, bladeH - 0.025, 0.94);
    const ledGeo = new THREE.SphereGeometry(0.025, 6, 6);

    for (let b = 0; b < 8; b++) {
      const by = 0.12 + b * bladeH + bladeH / 2;
      const blade = new THREE.Mesh(bladeGeo, mats.threatBladeMat);
      blade.position.set(0, by, 0);
      rack.add(blade);

      // 4 Red status LEDs per blade
      for (let l = 0; l < 4; l++) {
        const led = new THREE.Mesh(ledGeo, mats.ledRed);
        led.position.set(-0.35 + l * 0.07, by, 0.49);
        rack.add(led);
      }
    }

    // Red wireframe accent
    const rackBoxGeo = new THREE.BoxGeometry(1.14, rackHeight, 1.14);
    const rackLines = new THREE.LineSegments(new THREE.EdgesGeometry(rackBoxGeo), mats.luminousRedEdgeMat);
    rackLines.position.y = rackHeight / 2;
    rack.add(rackLines);

    threatGroup.add(rack);
  });

  // Central Crimson Point Light
  const threatLight = new THREE.PointLight(0xF05261, 2.8, 12, 1.2);
  threatLight.position.set(0, 2.6, 0);
  threatGroup.add(threatLight);

  return threatGroup;
}

// ── 7. Dual Operator Workstation Fleet (`Endpoint Fleet` / Workstations) ──
export function createDualWorkstationFleet(
  cx: number,
  cz: number,
  mats: ReturnType<typeof createInfrastructureMaterials>
): THREE.Group {
  const fleetGroup = new THREE.Group();
  fleetGroup.position.set(cx, 0, cz);

  // Stepped Plinth
  const plinthGeo = new THREE.BoxGeometry(4.8, 0.26, 3.8);
  const plinth = new THREE.Mesh(plinthGeo, mats.plinthMat);
  plinth.position.y = 0.13;
  fleetGroup.add(plinth);

  const edgeLine = new THREE.LineSegments(new THREE.EdgesGeometry(plinthGeo), mats.luminousCyanEdgeMat);
  edgeLine.position.y = 0.13;
  fleetGroup.add(edgeLine);

  // Desk 1 (Left workstation)
  const desk1 = createAnalystWorkstation(-1.25, 0.2, 0.15, mats);
  fleetGroup.add(desk1);

  // Desk 2 (Right workstation)
  const desk2 = createAnalystWorkstation(1.25, -0.2, -0.15, mats);
  fleetGroup.add(desk2);

  // Dual glowing blue point lights over desks
  const wsLight = new THREE.PointLight(0x46D7F5, 1.8, 8, 1.4);
  wsLight.position.set(0, 2.2, 0);
  fleetGroup.add(wsLight);

  return fleetGroup;
}

