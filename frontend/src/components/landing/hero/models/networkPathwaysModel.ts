import * as THREE from 'three';

export interface PhysicalConduit {
  tubeMesh: THREE.Mesh;
  innerCore: THREE.Mesh;
  curve: THREE.CatmullRomCurve3;
  sourceId: string;
  targetId: string;
  isThreat?: boolean;
}

export interface PhotonPacket {
  mesh: THREE.Mesh;
  curve: THREE.CatmullRomCurve3;
  progress: number;
  speed: number;
  isAttackStage?: number;
}

export function createNetworkPathways() {
  const pathwaysGroup = new THREE.Group();

  // Materials
  const pipeGlassMat = new THREE.MeshStandardMaterial({
    color: 0x122436,
    transparent: true,
    opacity: 0.40,
    roughness: 0.10,
    metalness: 0.70,
  });

  const pipeJointMat = new THREE.MeshStandardMaterial({
    color: 0x1F2E3E,
    roughness: 0.25,
    metalness: 0.92,
  });

  const innerCoreCyanMat = new THREE.MeshBasicMaterial({
    color: 0x46D7F5,
    transparent: true,
    opacity: 0.95,
  });

  const innerCoreAmberMat = new THREE.MeshBasicMaterial({
    color: 0xD8AE69,
    transparent: true,
    opacity: 0.92,
  });

  const innerCoreRedMat = new THREE.MeshBasicMaterial({
    color: 0xF05261,
    transparent: true,
    opacity: 0.98,
  });

  const photonGeo = new THREE.OctahedronGeometry(0.09, 0);
  const photonCyanMat = new THREE.MeshBasicMaterial({ color: 0x46D7F5 });
  const photonAmberMat = new THREE.MeshBasicMaterial({ color: 0xD8AE69 });
  const photonRedMat = new THREE.MeshBasicMaterial({ color: 0xF05261 });

  const physicalConduits: PhysicalConduit[] = [];
  const fiberPhotons: PhotonPacket[] = [];

  // Helper to create flanged heavy industrial conduits
  const createConduit = (
    p1: THREE.Vector3,
    p2: THREE.Vector3,
    p3: THREE.Vector3,
    sourceId: string,
    targetId: string,
    mode: 'cyan' | 'amber' | 'red' = 'cyan'
  ) => {
    const curve = new THREE.CatmullRomCurve3([p1, p2, p3], false, 'catmullrom', 0.25);

    // Outer transparent protective casing
    const tubeGeo = new THREE.TubeGeometry(curve, 36, 0.32, 16, false);
    const tubeMesh = new THREE.Mesh(tubeGeo, pipeGlassMat);
    pathwaysGroup.add(tubeMesh);

    // Glowing luminous inner core
    const innerGeo = new THREE.TubeGeometry(curve, 36, 0.12, 8, false);
    const coreMat = mode === 'red' ? innerCoreRedMat : mode === 'amber' ? innerCoreAmberMat : innerCoreCyanMat;
    const innerCore = new THREE.Mesh(innerGeo, coreMat);
    pathwaysGroup.add(innerCore);

    // Flanged metallic joint collars at endpoints and mid-curve
    [p1, p2, p3].forEach((pt) => {
      const collarGeo = new THREE.CylinderGeometry(0.40, 0.40, 0.14, 16);
      const collar = new THREE.Mesh(collarGeo, pipeJointMat);
      collar.position.copy(pt);
      pathwaysGroup.add(collar);
    });

    const conduit: PhysicalConduit = {
      tubeMesh,
      innerCore,
      curve,
      sourceId,
      targetId,
      isThreat: mode === 'red',
    };
    physicalConduits.push(conduit);

    // Add 2 photons traveling through this conduit
    for (let i = 0; i < 2; i++) {
      const pMesh = new THREE.Mesh(photonGeo, mode === 'red' ? photonRedMat : mode === 'amber' ? photonAmberMat : photonCyanMat);
      pathwaysGroup.add(pMesh);
      fiberPhotons.push({
        mesh: pMesh,
        curve,
        progress: (i * 0.5) % 1,
        speed: 0.0035 + Math.random() * 0.001,
      });
    }

    return conduit;
  };

  // ── 1. Top-Left: Identity Provider -> ThreatGraph Core ────────────────
  createConduit(
    new THREE.Vector3(-5.6, 0.8, -4.2),
    new THREE.Vector3(-2.8, 0.8, -2.0),
    new THREE.Vector3(-0.6, 1.4, -0.6),
    'idp-cluster',
    'threatgraph-core',
    'cyan'
  );

  // ── 2. Top-Center: Corporate Network -> ThreatGraph Core ──────────────
  createConduit(
    new THREE.Vector3(3.0, 0.8, -6.5),
    new THREE.Vector3(2.0, 0.8, -3.2),
    new THREE.Vector3(1.2, 1.4, -0.9),
    'corp-network',
    'threatgraph-core',
    'cyan'
  );

  // ── 3. Far-Right: Database Cluster -> ThreatGraph Core ────────────────
  createConduit(
    new THREE.Vector3(8.8, 0.8, -1.8),
    new THREE.Vector3(5.2, 0.8, -0.6),
    new THREE.Vector3(2.2, 1.4, 0.2),
    'db-cluster',
    'threatgraph-core',
    'amber'
  );

  // ── 4. Bottom-Left: Endpoint Fleet -> ThreatGraph Core ────────────────
  createConduit(
    new THREE.Vector3(-2.8, 0.8, 3.8),
    new THREE.Vector3(-1.2, 0.8, 2.2),
    new THREE.Vector3(-0.2, 1.4, 1.4),
    'endpoint-fleet',
    'threatgraph-core',
    'cyan'
  );

  // ── 5. Bottom-Right: External Threat (TOR Exit Node) -> ThreatGraph Core (CRIMSON RED) ──
  createConduit(
    new THREE.Vector3(8.4, 0.8, 5.6),
    new THREE.Vector3(5.0, 0.8, 3.2),
    new THREE.Vector3(2.0, 1.4, 1.4),
    'external-threat',
    'threatgraph-core',
    'red'
  );

  // ── 6. Ominous Red Fiber Optic Bundle from External Threat into Core ───
  // A dense snaking bundle of glowing red data lines penetrating the core
  const numRedFibers = 14;
  for (let i = 0; i < numRedFibers; i++) {
    const norm = i / (numRedFibers - 1);
    const startX = 8.2 + (norm - 0.5) * 1.8;
    const startY = 0.65 + Math.sin(norm * Math.PI) * 0.4;
    const startZ = 5.4 + (norm - 0.5) * 1.4;

    const midX = 4.8 + Math.cos(norm * 3.0) * 0.8;
    const midY = 0.50 + Math.sin(norm * 2.0) * 0.35;
    const midZ = 3.2 + Math.sin(norm * 3.0) * 0.8;

    const endX = 1.8 + (norm - 0.5) * 0.8;
    const endY = 1.3 + (norm - 0.5) * 0.6;
    const endZ = 1.2 + (norm - 0.5) * 0.6;

    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(startX, startY, startZ),
      new THREE.Vector3(midX, midY, midZ),
      new THREE.Vector3(endX, endY, endZ),
    ], false, 'centripetal');

    const points = curve.getPoints(36);
    const curveGeo = new THREE.BufferGeometry().setFromPoints(points);

    const redLineMat = new THREE.LineBasicMaterial({
      color: 0xF05261,
      transparent: true,
      opacity: 0.75 + (i % 3) * 0.1,
      linewidth: 1.5,
    });

    const line = new THREE.Line(curveGeo, redLineMat);
    pathwaysGroup.add(line);

    // Animated red photon pulse
    if (i % 2 === 0) {
      const pMesh = new THREE.Mesh(photonGeo, photonRedMat);
      pathwaysGroup.add(pMesh);
      fiberPhotons.push({
        mesh: pMesh,
        curve,
        progress: (i * 0.12) % 1,
        speed: 0.0036 + (i % 3) * 0.0008,
      });
    }
  }

  // ── 7. Blue/Cyan Fiber Ribbon between Core and Corporate Network ───────
  const numCyanFibers = 10;
  for (let i = 0; i < numCyanFibers; i++) {
    const norm = i / (numCyanFibers - 1);
    const startX = 0.6 + (norm - 0.5) * 1.2;
    const startY = 1.3;
    const startZ = -0.8 + (norm - 0.5) * 0.6;

    const midX = 1.2 + Math.sin(norm * 2.0) * 0.5;
    const midY = 0.55;
    const midZ = -4.0 + (norm - 0.5) * 0.8;

    const endX = 1.5 + (norm - 0.5) * 1.6;
    const endY = 0.65;
    const endZ = -6.8 + (norm - 0.5) * 1.0;

    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(startX, startY, startZ),
      new THREE.Vector3(midX, midY, midZ),
      new THREE.Vector3(endX, endY, endZ),
    ], false, 'centripetal');

    const points = curve.getPoints(32);
    const curveGeo = new THREE.BufferGeometry().setFromPoints(points);

    const cyanLineMat = new THREE.LineBasicMaterial({
      color: 0x46D7F5,
      transparent: true,
      opacity: 0.65,
    });

    const line = new THREE.Line(curveGeo, cyanLineMat);
    pathwaysGroup.add(line);

    if (i % 2 === 0) {
      const pMesh = new THREE.Mesh(photonGeo, photonCyanMat);
      pathwaysGroup.add(pMesh);
      fiberPhotons.push({
        mesh: pMesh,
        curve,
        progress: (i * 0.15) % 1,
        speed: 0.0030 + (i % 2) * 0.0008,
      });
    }
  }

  return {
    pathwaysGroup,
    physicalConduits,
    fiberPhotons,
  };
}
