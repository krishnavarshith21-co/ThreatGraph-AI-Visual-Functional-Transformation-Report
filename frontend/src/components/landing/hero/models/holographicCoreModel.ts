import * as THREE from 'three';

export interface HolographicCoreInstance {
  group: THREE.Group;
  centralLight: THREE.PointLight;
  innerConstellation: THREE.Points;
  floatingLattice: THREE.Group;
  reticle: THREE.Mesh;
}

export function createHolographicIntelligenceCore(): HolographicCoreInstance {
  const group = new THREE.Group();
  group.position.set(0, 0, 0);

  // ── 1. Vibrant Luminous Cyber Glass Materials ────────────────────────
  const primaryGlassMat = new THREE.MeshStandardMaterial({
    color: 0x2288EE,
    emissive: 0x1678D2,
    emissiveIntensity: 0.95,
    transparent: true,
    opacity: 0.68,
    roughness: 0.08,
    metalness: 0.25,
    depthWrite: false,
  });

  const secondaryGlassMat = new THREE.MeshStandardMaterial({
    color: 0x1266C8,
    emissive: 0x0D47A1,
    emissiveIntensity: 0.75,
    transparent: true,
    opacity: 0.55,
    roughness: 0.12,
    metalness: 0.35,
    depthWrite: false,
  });

  const luminousCyanEdgeMat = new THREE.LineBasicMaterial({
    color: 0x46D7F5,
    linewidth: 2.0,
    transparent: true,
    opacity: 1.0,
  });

  const innerLatticeWireMat = new THREE.LineBasicMaterial({
    color: 0x83DCE8,
    transparent: true,
    opacity: 0.65,
  });

  // ── 2. Layered Interlocking Cubic Volumes ───────────────────────────
  const coreCubes = [
    { pos: [0, 2.8, 0], size: [3.8, 3.8, 3.8], isPrimary: true },
    { pos: [-1.6, 1.8, 1.5], size: [2.5, 2.9, 2.5], isPrimary: false },
    { pos: [1.8, 2.2, -1.4], size: [2.6, 3.1, 2.6], isPrimary: false },
    { pos: [2.0, 1.4, 1.6], size: [2.2, 2.4, 2.2], isPrimary: false },
    { pos: [-1.4, 3.6, -1.4], size: [2.3, 2.5, 2.3], isPrimary: false },
    { pos: [0, 4.8, 0.5], size: [1.9, 1.9, 1.9], isPrimary: true },
    { pos: [0, 0.7, 0], size: [3.0, 1.2, 3.0], isPrimary: false },
  ];

  coreCubes.forEach(({ pos, size, isPrimary }) => {
    const geo = new THREE.BoxGeometry(size[0], size[1], size[2]);
    const mesh = new THREE.Mesh(geo, isPrimary ? primaryGlassMat : secondaryGlassMat);
    mesh.position.set(pos[0], pos[1], pos[2]);
    group.add(mesh);

    // Luminous cyan outer edges
    const edges = new THREE.EdgesGeometry(geo);
    const edgeLines = new THREE.LineSegments(edges, luminousCyanEdgeMat);
    edgeLines.position.copy(mesh.position);
    group.add(edgeLines);

    // Inner structural frame
    const innerGeo = new THREE.BoxGeometry(size[0] * 0.78, size[1] * 0.78, size[2] * 0.78);
    const innerEdges = new THREE.EdgesGeometry(innerGeo);
    const innerLines = new THREE.LineSegments(innerEdges, innerLatticeWireMat);
    innerLines.position.copy(mesh.position);
    group.add(innerLines);
  });

  // ── 3. Central Floating Geometric Lattice (Inner Core Heart) ────────
  const floatingLattice = new THREE.Group();
  floatingLattice.position.set(0, 2.8, 0);

  // Glowing center energy sphere
  const heartGeo = new THREE.SphereGeometry(0.75, 16, 16);
  const heartMat = new THREE.MeshBasicMaterial({
    color: 0x83DCE8,
    transparent: true,
    opacity: 0.90,
  });
  const heartMesh = new THREE.Mesh(heartGeo, heartMat);
  floatingLattice.add(heartMesh);

  // Outer wireframe icosahedron
  const innerIcosaGeo = new THREE.IcosahedronGeometry(1.4, 0);
  const innerIcosaMat = new THREE.LineBasicMaterial({
    color: 0x46D7F5,
    transparent: true,
    opacity: 0.95,
  });
  const innerIcosaWire = new THREE.LineSegments(new THREE.WireframeGeometry(innerIcosaGeo), innerIcosaMat);
  floatingLattice.add(innerIcosaWire);

  // Concentric inner octahedron
  const innerOctaGeo = new THREE.OctahedronGeometry(0.9, 0);
  const innerOctaMat = new THREE.LineBasicMaterial({
    color: 0xD8AE69, // warm gold accent
    transparent: true,
    opacity: 0.85,
  });
  const innerOctaWire = new THREE.LineSegments(new THREE.WireframeGeometry(innerOctaGeo), innerOctaMat);
  floatingLattice.add(innerOctaWire);

  group.add(floatingLattice);

  // ── 4. Internal Cyber Constellation Graph Nodes ─────────────────────
  const pCount = 350;
  const pGeo = new THREE.BufferGeometry();
  const pPositions = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount; i++) {
    pPositions[i * 3] = (Math.random() - 0.5) * 3.6;
    pPositions[i * 3 + 1] = 1.0 + Math.random() * 3.8;
    pPositions[i * 3 + 2] = (Math.random() - 0.5) * 3.6;
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
  const pMat = new THREE.PointsMaterial({
    color: 0x83DCE8,
    size: 0.18,
    transparent: true,
    opacity: 0.95,
  });
  const innerConstellation = new THREE.Points(pGeo, pMat);
  group.add(innerConstellation);

  // Interconnecting constellation lines
  const lineGeo = new THREE.BufferGeometry();
  const linePositions: number[] = [];
  for (let i = 0; i < 40; i++) {
    const idxA = Math.floor(Math.random() * pCount);
    const idxB = Math.floor(Math.random() * pCount);
    linePositions.push(
      pPositions[idxA * 3], pPositions[idxA * 3 + 1], pPositions[idxA * 3 + 2],
      pPositions[idxB * 3], pPositions[idxB * 3 + 1], pPositions[idxB * 3 + 2]
    );
  }
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
  const constLineMat = new THREE.LineBasicMaterial({ color: 0x46D7F5, transparent: true, opacity: 0.55 });
  const constLines = new THREE.LineSegments(lineGeo, constLineMat);
  group.add(constLines);

  // ── 5. Radiant Central Core Point Light ──────────────────────────────
  const centralLight = new THREE.PointLight(0x46D7F5, 6.5, 26, 1.2);
  centralLight.position.set(0, 2.8, 0);
  group.add(centralLight);

  // ── 6. Selection Reticle Ring ────────────────────────────────────────
  const reticleGeo = new THREE.RingGeometry(3.8, 4.1, 32);
  const reticleMat = new THREE.MeshBasicMaterial({ color: 0x46D7F5, side: THREE.DoubleSide });
  const reticle = new THREE.Mesh(reticleGeo, reticleMat);
  reticle.rotation.x = -Math.PI / 2;
  reticle.position.y = 0.1;
  reticle.visible = false;
  group.add(reticle);

  return {
    group,
    centralLight,
    innerConstellation,
    floatingLattice,
    reticle,
  };
}
