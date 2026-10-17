'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { HERO_NODES, HERO_EDGES } from '../hero/heroData';
import type { HeroNode, HeroEdge } from '../hero/heroTypes';
import {
  ZoomIn, ZoomOut, RotateCcw, Target, Search,
  Activity, Shield, Maximize2, Layers, X
} from 'lucide-react';

interface InteractiveTopologyExplorerProps {
  selectedNode: HeroNode | null;
  onSelectNode: (node: HeroNode | null) => void;
  activeFilter: string;
  isolateAttackPath: boolean;
  viewMode: '3d' | '2d';
  onFilterChange?: (filter: string) => void;
  onViewModeChange?: (mode: '3d' | '2d') => void;
  searchQuery?: string;
  isolateSelection?: boolean;
  showNeighbors?: boolean;
  onResetView?: () => void;
  focusTrigger?: number;
  className?: string;
}

// Visual layout positions matching the reference design with high fidelity
const TOPOLOGY_LAYOUT_COORDS: Record<string, [number, number, number]> = {
  // Compromised / Attack Trajectory Centerpiece & Key Nodes
  'evt-lsass-dump': [1.3, 0.2, 0.0],          // LSASS Dump (Event - Centerpiece)
  'dev-srv-admin': [-0.5, 2.0, -0.2],         // Web-Server-01 (IIS Secret)
  'dev-laptop-mchen': [-1.8, 0.7, 0.0],       // DC-01-PC-01 (Windows 11)
  'ip-c2-tor': [3.4, 1.2, 0.0],               // 192.168.1.45 (Suspicious IP)
  'usr-mchen': [-4.0, -0.3, 0.2],             // Marcus Chen (Active User)
  'dev-srv-db': [2.2, -0.6, -0.2],            // Finance-DB (Database)
  'evt-phish-ingress': [-1.5, -1.2, 0.2],     // Malware.exe (Process)
  'evt-rdp-lateral': [3.6, -1.5, 0.2],        // RDP Connection (Method)
  
  // Surrounding Context Nodes (Cluster Balance & Depth)
  'usr-admin-svc': [2.0, 2.2, -0.4],
  'dev-srv-ad': [-0.2, -2.8, -0.8],
  'ip-internal-eng': [-3.4, 2.0, -0.5],
  'ip-gateway': [-5.2, 1.3, -0.6],
  'ip-dc-internal': [0.6, -3.5, -1.1],
  'res-vault-prod': [-0.2, 3.2, -1.0],
  'res-db-customers': [5.5, -0.2, -0.5],
  'evt-db-query': [1.8, -1.8, 0.0],
  'evt-exfil-stream': [5.0, 1.6, -0.4],
  'ip-c2-vpn': [5.8, 2.4, -0.8],
  'evt-log-wipe': [-2.8, -2.5, -0.8],
  'usr-sokafor': [-5.5, -1.8, -0.4],
  'dev-ws-sokafor': [-3.2, -2.4, -0.6],
  'res-finance-q3': [1.2, -3.4, -1.0],
  'evt-cron-backup': [2.2, -3.1, -0.8],
  'res-backup-nas': [4.8, -2.8, -1.2],
};

// Key nodes to display floating labels for (matching the reference design)
const LABELED_NODES: Record<string, { label: string; sub: string; type: string; color: string; align?: 'bottom' | 'right' | 'top' | 'left'; isCompromised?: boolean }> = {
  'evt-lsass-dump': { label: 'LSASS Dump', sub: 'Event', type: 'Event', color: '#EF4444', align: 'right', isCompromised: true },
  'dev-srv-admin': { label: 'Web-Server-01', sub: 'IIS Secret', type: 'Device', color: '#38BDF8', align: 'bottom' },
  'dev-laptop-mchen': { label: 'DC-01-PC-01', sub: 'Windows 11', type: 'Device', color: '#38BDF8', align: 'bottom' },
  'ip-c2-tor': { label: '192.168.1.45', sub: 'Suspicious IP', type: 'IPAddress', color: '#F97316', align: 'bottom' },
  'usr-mchen': { label: 'Marcus Chen', sub: 'Active User', type: 'User', color: '#10B981', align: 'bottom' },
  'dev-srv-db': { label: 'Finance-DB', sub: 'Database', type: 'Resource', color: '#38BDF8', align: 'bottom' },
  'evt-phish-ingress': { label: 'Malware.exe', sub: 'Process', type: 'Event', color: '#EF4444', align: 'bottom' },
  'evt-rdp-lateral': { label: 'RDP Connection', sub: 'Method', type: 'Event', color: '#EF4444', align: 'bottom' },
};

// Calculate the exact 3D bounding geometry of the active cluster
function computeClusterBounds(nodes: HeroNode[]): THREE.Box3 {
  const box = new THREE.Box3();
  if (nodes.length === 0) {
    box.set(new THREE.Vector3(-5, -3, -1), new THREE.Vector3(5, 3, 1));
    return box;
  }
  nodes.forEach((n) => {
    const coords = TOPOLOGY_LAYOUT_COORDS[n.id] || [n.position[0] * 0.7, n.position[1] * 0.7, n.position[2] * 0.7];
    box.expandByPoint(new THREE.Vector3(coords[0], coords[1], coords[2]));
  });
  // Add margin around the nodes (for 3D geometries, callouts, and floating labels)
  box.min.x -= 1.4;
  box.max.x += 2.0; // extra clearance for right-aligned LSASS Dump label
  box.min.y -= 1.2; // clearance for bottom labels and floor shockwaves
  box.max.y += 1.2;
  return box;
}

// Compute the optimal camera framing distance & target to fit usable canvas perfectly
function calculateCameraFit(
  box: THREE.Box3,
  cameraFov: number,
  aspect: number
): { position: THREE.Vector3; target: THREE.Vector3 } {
  const center = new THREE.Vector3();
  box.getCenter(center);
  const size = new THREE.Vector3();
  box.getSize(size);

  const fovV = (cameraFov * Math.PI) / 180;
  const fovH = 2 * Math.atan(Math.tan(fovV / 2) * aspect);

  // Distance required to fit both dimensions comfortably
  const distV = (size.y / 2) / Math.tan(fovV / 2);
  const distH = (size.x / 2) / Math.tan(fovH / 2);

  // Apply a 1.16 padding factor
  const requiredDist = Math.max(distV, distH) * 1.16;
  const clampedDist = Math.max(9.5, Math.min(24.0, requiredDist));

  return {
    position: new THREE.Vector3(center.x * 0.4, center.y * 0.2 + 0.35, clampedDist),
    target: new THREE.Vector3(center.x * 0.4, center.y * 0.2 - 0.1, 0),
  };
}

export function InteractiveTopologyExplorer({
  selectedNode,
  onSelectNode,
  activeFilter,
  isolateAttackPath,
  viewMode,
  onFilterChange,
  onViewModeChange,
  searchQuery = '',
  isolateSelection = false,
  showNeighbors = false,
  onResetView,
  focusTrigger,
  className = '',
}: InteractiveTopologyExplorerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const graphGroupRef = useRef<THREE.Group | null>(null);
  const labelsContainerRef = useRef<HTMLDivElement>(null);

  const [hoveredNode, setHoveredNode] = useState<HeroNode | null>(null);
  const [webglSupported, setWebglSupported] = useState<boolean>(true);
  const [showMinimap, setShowMinimap] = useState<boolean>(true);

  // Smooth camera animation state
  const cameraAnimRef = useRef<{
    active: boolean;
    startTime: number;
    duration: number;
    startPos: THREE.Vector3;
    endPos: THREE.Vector3;
    startTarget: THREE.Vector3;
    endTarget: THREE.Vector3;
  }>({
    active: false,
    startTime: 0,
    duration: 600,
    startPos: new THREE.Vector3(),
    endPos: new THREE.Vector3(),
    startTarget: new THREE.Vector3(),
    endTarget: new THREE.Vector3(),
  });

  const currentLookAtRef = useRef<THREE.Vector3>(new THREE.Vector3(0, -0.1, 0));
  const hasUserInteractedRef = useRef<boolean>(false);

  // Filtered nodes based on activeFilter, isolateAttackPath, searchQuery, isolateSelection
  const filteredNodes = useMemo(() => {
    return HERO_NODES.filter((n: HeroNode) => {
      if (isolateAttackPath && !n.isAttackPath) return false;
      if (activeFilter !== 'All' && n.type !== activeFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const displayInfo = LABELED_NODES[n.id];
        const matchLabel = n.label.toLowerCase().includes(q);
        const matchId = n.id.toLowerCase().includes(q);
        const matchType = n.type.toLowerCase().includes(q);
        const matchDisplay = displayInfo ? displayInfo.label.toLowerCase().includes(q) || displayInfo.sub.toLowerCase().includes(q) : false;
        if (!matchLabel && !matchId && !matchType && !matchDisplay) return false;
      }

      if (isolateSelection && selectedNode) {
        if (n.id === selectedNode.id) return true;
        const isNeighbor = HERO_EDGES.some(
          (e) => (e.source === selectedNode.id && e.target === n.id) || (e.target === selectedNode.id && e.source === n.id)
        );
        if (!isNeighbor) return false;
      }

      return true;
    });
  }, [activeFilter, isolateAttackPath, searchQuery, isolateSelection, selectedNode]);

  const validNodeIds = useMemo(() => new Set(filteredNodes.map((n: HeroNode) => n.id)), [filteredNodes]);

  const filteredEdges = useMemo(() => {
    return HERO_EDGES.filter((e: HeroEdge) => validNodeIds.has(e.source) && validNodeIds.has(e.target));
  }, [validNodeIds]);

  // Three.js Scene Lifecycle
  useEffect(() => {
    if (viewMode !== '3d') return;
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 900;
    const height = mount.clientHeight || 640;

    // ── Scene Setup ──────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x070B14, 0.012);

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 500);
    cameraRef.current = camera;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      });
      setWebglSupported(true);
    } catch {
      setWebglSupported(false);
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x070B14, 1);
    rendererRef.current = renderer;
    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);

    // ── Cyber Lighting ───────────────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0xE2E8F0, 0.7);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0x38BDF8, 1.5);
    keyLight.position.set(12, 18, 14);
    scene.add(keyLight);

    const amberFill = new THREE.DirectionalLight(0xD9C18A, 0.5);
    amberFill.position.set(-12, -8, 8);
    scene.add(amberFill);

    const redThreatLight = new THREE.DirectionalLight(0xEF4444, 1.4);
    redThreatLight.position.set(4, 6, 12);
    scene.add(redThreatLight);

    // ── Architectural Floor Grid ─────────────────────────────────
    const gridHelper = new THREE.GridHelper(52, 34, 0x1E2D38, 0x0D1722);
    gridHelper.position.y = -3.8;
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.55;
    scene.add(gridHelper);

    // ── Graph Scene Group ────────────────────────────────────────
    const graphGroup = new THREE.Group();
    graphGroupRef.current = graphGroup;
    scene.add(graphGroup);

    // Initial camera fit based on scene bounding geometry
    const clusterBounds = computeClusterBounds(filteredNodes);
    const initialFit = calculateCameraFit(clusterBounds, camera.fov, width / height);
    camera.position.copy(initialFit.position);
    currentLookAtRef.current.copy(initialFit.target);
    camera.lookAt(currentLookAtRef.current);

    // ── Cyber Topography Undulating Mesh (Depth aesthetic from reference) ──
    const terrainGeo = new THREE.PlaneGeometry(36, 18, 32, 16);
    const posAttr = terrainGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const u = posAttr.getX(i);
      const v = posAttr.getY(i);
      // Gentle undulating cyber landscape in the background
      const elevation = Math.sin(u * 0.45) * Math.cos(v * 0.45) * 0.55;
      posAttr.setZ(i, elevation);
    }
    terrainGeo.computeVertexNormals();
    const terrainMat = new THREE.MeshBasicMaterial({
      color: 0x0E263E,
      wireframe: true,
      transparent: true,
      opacity: 0.25,
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.rotation.x = -Math.PI / 2.3;
    terrainMesh.position.set(0, -3.2, -4);
    scene.add(terrainMesh);

    // ── Concentric Radar Shockwave Rings Under LSASS Dump ─────────
    const lsassTargetPos = TOPOLOGY_LAYOUT_COORDS['evt-lsass-dump'] || [1.3, 0.2, 0.0];
    const shockwaveGroup = new THREE.Group();
    // Position directly on top of the floor grid beneath LSASS Dump
    shockwaveGroup.position.set(lsassTargetPos[0], -3.78, lsassTargetPos[2]);
    shockwaveGroup.rotation.x = -Math.PI / 2;
    scene.add(shockwaveGroup);

    // Static concentric rings
    const staticRadii = [0.45, 0.9, 1.4, 2.0, 2.7, 3.5];
    staticRadii.forEach((rad) => {
      const ringGeo = new THREE.RingGeometry(rad - 0.025, rad + 0.025, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xEF4444,
        transparent: true,
        opacity: 0.38,
        side: THREE.DoubleSide,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      shockwaveGroup.add(ringMesh);
    });

    // Dynamic expanding pulse waves
    interface PulseRing {
      mesh: THREE.Mesh;
      mat: THREE.MeshBasicMaterial;
      progress: number;
      speed: number;
    }
    const pulseRings: PulseRing[] = [];
    for (let i = 0; i < 3; i++) {
      const expGeo = new THREE.RingGeometry(0.8, 0.88, 64);
      const expMat = new THREE.MeshBasicMaterial({
        color: 0xEF4444,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
      });
      const expMesh = new THREE.Mesh(expGeo, expMat);
      shockwaveGroup.add(expMesh);
      pulseRings.push({
        mesh: expMesh,
        mat: expMat,
        progress: i * 0.33,
        speed: 0.007,
      });
    }

    // Vertical Threat Beacon connecting node to floor radar center
    const beaconPoints = [
      new THREE.Vector3(lsassTargetPos[0], lsassTargetPos[1], lsassTargetPos[2]),
      new THREE.Vector3(lsassTargetPos[0], -3.78, lsassTargetPos[2]),
    ];
    const beaconGeo = new THREE.BufferGeometry().setFromPoints(beaconPoints);
    const beaconMat = new THREE.LineBasicMaterial({
      color: 0xEF4444,
      transparent: true,
      opacity: 0.5,
    });
    const beaconLine = new THREE.Line(beaconGeo, beaconMat);
    scene.add(beaconLine);

    // ── Build 3D Geometric Nodes ────────────────────────────────
    const nodeMeshMap = new Map<string, THREE.Mesh>();
    const interactiveMeshes: THREE.Mesh[] = [];

    // Distinct premium geometries matching reference proportions
    const hexGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.26, 6);
    const boxGeo = new THREE.BoxGeometry(0.58, 0.44, 0.40);
    const octaGeo = new THREE.OctahedronGeometry(0.38, 0);
    const cylinderGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.52, 16);
    const compromisedBoxGeo = new THREE.BoxGeometry(0.68, 0.68, 0.68);

    const hexEdges = new THREE.EdgesGeometry(hexGeo);
    const boxEdges = new THREE.EdgesGeometry(boxGeo);
    const octaEdges = new THREE.EdgesGeometry(octaGeo);
    const cylinderEdges = new THREE.EdgesGeometry(cylinderGeo);
    const compromisedBoxEdges = new THREE.EdgesGeometry(compromisedBoxGeo);

    filteredNodes.forEach((node: HeroNode) => {
      let geo: THREE.BufferGeometry = hexGeo;
      let edgesGeo: THREE.BufferGeometry = hexEdges;

      const isCompromisedCenter = node.id === 'evt-lsass-dump';

      if (isCompromisedCenter) {
        geo = compromisedBoxGeo;
        edgesGeo = compromisedBoxEdges;
      } else {
        switch (node.type) {
          case 'Device':
            geo = boxGeo;
            edgesGeo = boxEdges;
            break;
          case 'Event':
            geo = node.isAttackPath ? boxGeo : octaGeo;
            edgesGeo = node.isAttackPath ? boxEdges : octaEdges;
            break;
          case 'Resource':
            geo = cylinderGeo;
            edgesGeo = cylinderEdges;
            break;
          case 'IPAddress':
            geo = octaGeo;
            edgesGeo = octaEdges;
            break;
          case 'User':
            geo = octaGeo;
            edgesGeo = octaEdges;
            break;
          default:
            geo = hexGeo;
            edgesGeo = hexEdges;
        }
      }

      const displayMeta = LABELED_NODES[node.id];
      const nodeColor = displayMeta ? displayMeta.color : (node.color || (node.isAttackPath ? '#EF4444' : '#38BDF8'));

      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(nodeColor),
        roughness: 0.22,
        metalness: 0.38,
        emissive: new THREE.Color(nodeColor),
        emissiveIntensity: isCompromisedCenter ? 0.7 : (node.isAttackPath ? 0.42 : 0.16),
      });

      const mesh = new THREE.Mesh(geo, mat);
      const coords = TOPOLOGY_LAYOUT_COORDS[node.id] || [node.position[0] * 0.7, node.position[1] * 0.7, node.position[2] * 0.7];
      mesh.position.set(coords[0], coords[1], coords[2]);
      mesh.userData = { node };

      // Sharp glowing wireframe lines
      const wireMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(nodeColor),
        transparent: true,
        opacity: isCompromisedCenter ? 1.0 : 0.85,
        linewidth: 2,
      });
      const wireframe = new THREE.LineSegments(edgesGeo, wireMat);
      mesh.add(wireframe);

      // Glowing core dot
      const dotGeo = new THREE.SphereGeometry(isCompromisedCenter ? 0.11 : 0.07, 8, 8);
      const dotMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(nodeColor) });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.position.set(0, isCompromisedCenter ? 0.40 : 0.30, 0);
      mesh.add(dot);

      graphGroup.add(mesh);
      nodeMeshMap.set(node.id, mesh);
      interactiveMeshes.push(mesh);
    });

    // ── Build Relationship Conduits & Pulse Beads ────────────────
    const pulseBeads: {
      mesh: THREE.Mesh;
      start: THREE.Vector3;
      end: THREE.Vector3;
      speed: number;
      progress: number;
      isAttack: boolean;
    }[] = [];

    const beadGeo = new THREE.SphereGeometry(0.10, 8, 8);

    filteredEdges.forEach((edge: HeroEdge) => {
      const srcMesh = nodeMeshMap.get(edge.source);
      const tgtMesh = nodeMeshMap.get(edge.target);
      if (!srcMesh || !tgtMesh) return;

      const points = [srcMesh.position.clone(), tgtMesh.position.clone()];
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);

      const isAttack = edge.isAttackPath;
      const lineColor = isAttack ? 0xEF4444 : 0x1E2D38;

      const lineMat = new THREE.LineBasicMaterial({
        color: lineColor,
        transparent: true,
        opacity: isAttack ? 0.95 : 0.45,
      });

      const line = new THREE.Line(lineGeo, lineMat);
      graphGroup.add(line);

      if (isAttack) {
        const beadMat = new THREE.MeshBasicMaterial({ color: 0xEF4444 });
        const bead = new THREE.Mesh(beadGeo, beadMat);
        bead.position.copy(srcMesh.position);
        graphGroup.add(bead);

        pulseBeads.push({
          mesh: bead,
          start: srcMesh.position.clone(),
          end: tgtMesh.position.clone(),
          speed: 0.011 + Math.random() * 0.006,
          progress: Math.random(),
          isAttack: true,
        });
      }
    });

    // ── Primary Attack Trajectory Corridors (Matching reference visual) ──
    const primaryCorridors: [string, string][] = [
      ['evt-phish-ingress', 'evt-lsass-dump'],
      ['evt-lsass-dump', 'evt-rdp-lateral'],
      ['dev-laptop-mchen', 'evt-lsass-dump'],
    ];

    primaryCorridors.forEach(([srcId, tgtId]) => {
      const alreadyDrawn = filteredEdges.some(
        (e) => (e.source === srcId && e.target === tgtId) || (e.target === srcId && e.source === tgtId)
      );
      if (alreadyDrawn) return;

      const srcMesh = nodeMeshMap.get(srcId);
      const tgtMesh = nodeMeshMap.get(tgtId);
      if (!srcMesh || !tgtMesh) return;

      const points = [srcMesh.position.clone(), tgtMesh.position.clone()];
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({
        color: 0xEF4444,
        transparent: true,
        opacity: 0.95,
      });
      const line = new THREE.Line(lineGeo, lineMat);
      graphGroup.add(line);

      const beadMat = new THREE.MeshBasicMaterial({ color: 0xEF4444 });
      const bead = new THREE.Mesh(beadGeo, beadMat);
      bead.position.copy(srcMesh.position);
      graphGroup.add(bead);

      pulseBeads.push({
        mesh: bead,
        start: srcMesh.position.clone(),
        end: tgtMesh.position.clone(),
        speed: 0.012,
        progress: Math.random(),
        isAttack: true,
      });
    });

    // ── Raycasting & Mouse Navigation ────────────────────────────
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const onPointerDown = (e: MouseEvent) => {
      isDragging = true;
      hasUserInteractedRef.current = true;
      cameraAnimRef.current.active = false;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onPointerMove = (e: MouseEvent) => {
      const rect = mount.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / mount.clientWidth) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / mount.clientHeight) * 2 + 1;

      if (isDragging) {
        const dx = e.clientX - prevMouseX;
        const dy = e.clientY - prevMouseY;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;

        graphGroup.rotation.y += dx * 0.0035;
        graphGroup.rotation.x += dy * 0.0025;
        graphGroup.rotation.x = Math.max(-0.4, Math.min(0.5, graphGroup.rotation.x));
      } else {
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(interactiveMeshes);

        if (intersects.length > 0) {
          const hit = intersects[0].object as THREE.Mesh;
          const node = hit.userData.node as HeroNode;
          setHoveredNode(node);
          mount.style.cursor = 'pointer';
        } else {
          setHoveredNode(null);
          mount.style.cursor = 'default';
        }
      }
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const onClick = (e: MouseEvent) => {
      if (Math.abs(e.clientX - prevMouseX) > 5 || Math.abs(e.clientY - prevMouseY) > 5) {
        return;
      }
      const rect = mount.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / mount.clientWidth) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / mount.clientHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(interactiveMeshes);

      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        const node = hit.userData.node as HeroNode;
        onSelectNode(node);
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      hasUserInteractedRef.current = true;
      cameraAnimRef.current.active = false;
      const zoomFactor = e.deltaY > 0 ? 1.08 : 0.92;
      camera.position.z = Math.max(6.0, Math.min(30.0, camera.position.z * zoomFactor));
    };

    mount.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    mount.addEventListener('click', onClick);
    mount.addEventListener('wheel', onWheel, { passive: false });

    // ── Animation Loop ───────────────────────────────────────────
    let animId: number;
    const tempVec = new THREE.Vector3();

    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Smooth camera interpolation
      if (cameraAnimRef.current.active) {
        const elapsed = performance.now() - cameraAnimRef.current.startTime;
        const progress = Math.min(1.0, elapsed / cameraAnimRef.current.duration);
        const ease = 1 - Math.pow(1 - progress, 3); // cubic ease-out
        camera.position.lerpVectors(cameraAnimRef.current.startPos, cameraAnimRef.current.endPos, ease);
        currentLookAtRef.current.lerpVectors(cameraAnimRef.current.startTarget, cameraAnimRef.current.endTarget, ease);
        camera.lookAt(currentLookAtRef.current);
        if (progress >= 1.0) {
          cameraAnimRef.current.active = false;
        }
      } else {
        camera.lookAt(currentLookAtRef.current);
      }

      // Node emissive pulsing and slight rotation
      nodeMeshMap.forEach((mesh, id) => {
        const isSelected = selectedNode?.id === id;
        const isHovered = hoveredNode?.id === id;
        const isCompromised = id === 'evt-lsass-dump';
        const mat = mesh.material as THREE.MeshStandardMaterial;

        if (isSelected) {
          mat.emissiveIntensity = 0.9;
          mesh.scale.set(1.2, 1.2, 1.2);
        } else if (isHovered) {
          mat.emissiveIntensity = 0.65;
          mesh.scale.set(1.12, 1.12, 1.12);
        } else if (isCompromised) {
          mat.emissiveIntensity = 0.65 + Math.sin(Date.now() * 0.005) * 0.22;
          mesh.scale.set(1.0, 1.0, 1.0);
        } else {
          mat.emissiveIntensity = mesh.userData.node.isAttackPath ? 0.38 : 0.14;
          mesh.scale.set(1.0, 1.0, 1.0);
        }

        mesh.rotation.y += 0.003;
      });

      // Pulse beads along attack edges
      pulseBeads.forEach((bead) => {
        bead.progress += bead.speed;
        if (bead.progress > 1.0) bead.progress = 0.0;
        bead.mesh.position.lerpVectors(bead.start, bead.end, bead.progress);
      });

      // Expand and fade radar rings
      pulseRings.forEach((p) => {
        p.progress = (p.progress + p.speed) % 1.0;
        const scale = 0.2 + p.progress * 3.8;
        p.mesh.scale.set(scale, scale, 1);
        p.mat.opacity = Math.max(0, (1 - p.progress) * 0.7);
      });

      // Render 3D Scene
      renderer.render(scene, camera);

      // Project 3D node positions onto 2D screen coordinates for floating HUD labels
      if (labelsContainerRef.current) {
        const containerW = mount.clientWidth;
        const containerH = mount.clientHeight;

        nodeMeshMap.forEach((mesh, id) => {
          const domElem = document.getElementById(`topo-label-${id}`);
          if (domElem) {
            tempVec.copy(mesh.position);
            mesh.localToWorld(tempVec);
            tempVec.project(camera);

            // If behind camera, hide
            if (tempVec.z > 1.0) {
              domElem.style.display = 'none';
              return;
            }

            const x = (tempVec.x * 0.5 + 0.5) * containerW;
            const y = (-(tempVec.y * 0.5) + 0.5) * containerH;

            domElem.style.display = 'block';
            domElem.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
          }
        });

        // Also project callout badge for Credential Access T1003
        const calloutElem = document.getElementById('topo-callout-t1003');
        if (calloutElem) {
          const lsassMesh = nodeMeshMap.get('evt-lsass-dump');
          const malMesh = nodeMeshMap.get('evt-phish-ingress');
          if (lsassMesh && malMesh) {
            tempVec.copy(lsassMesh.position).add(malMesh.position).multiplyScalar(0.5);
            lsassMesh.parent?.localToWorld(tempVec);
            tempVec.project(camera);

            if (tempVec.z <= 1.0) {
              const x = (tempVec.x * 0.5 + 0.5) * containerW;
              const y = (-(tempVec.y * 0.5) + 0.5) * containerH;
              calloutElem.style.display = 'block';
              calloutElem.style.transform = `translate3d(${Math.round(x + 12)}px, ${Math.round(y - 12)}px, 0)`;
            } else {
              calloutElem.style.display = 'none';
            }
          }
        }
      }
    };

    animate();

    const resizeObserver = new ResizeObserver(() => {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (w > 0 && h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);

        if (!hasUserInteractedRef.current && !cameraAnimRef.current.active) {
          const bounds = computeClusterBounds(filteredNodes);
          const fit = calculateCameraFit(bounds, camera.fov, w / h);
          camera.position.copy(fit.position);
          currentLookAtRef.current.copy(fit.target);
          camera.lookAt(currentLookAtRef.current);
        }
      }
    });
    resizeObserver.observe(mount);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      mount.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      mount.removeEventListener('click', onClick);
      mount.removeEventListener('wheel', onWheel);

      interactiveMeshes.forEach((m) => {
        m.geometry.dispose();
        if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
        else m.material.dispose();
      });
      hexGeo.dispose();
      boxGeo.dispose();
      octaGeo.dispose();
      cylinderGeo.dispose();
      compromisedBoxGeo.dispose();
      beadGeo.dispose();
      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, [viewMode, filteredNodes, filteredEdges, selectedNode, hoveredNode, onSelectNode]);

  const isInitialMountRef = useRef<boolean>(true);

  // Focus node smoothly whenever selectedNode changes (after initial mount)
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }
    if (selectedNode && cameraRef.current) {
      const meshPos = TOPOLOGY_LAYOUT_COORDS[selectedNode.id] || selectedNode.position;
      const targetLook = new THREE.Vector3(meshPos[0], meshPos[1], meshPos[2]);
      const targetPos = new THREE.Vector3(meshPos[0], meshPos[1] + 0.35, 8.8);

      cameraAnimRef.current = {
        active: true,
        startTime: performance.now(),
        duration: 550,
        startPos: cameraRef.current.position.clone(),
        endPos: targetPos,
        startTarget: currentLookAtRef.current.clone(),
        endTarget: targetLook,
      };
    }
  }, [selectedNode, focusTrigger]);

  // Camera Actions
  const handleFitView = useCallback(() => {
    if (!cameraRef.current || !mountRef.current) return;
    const w = mountRef.current.clientWidth || 900;
    const h = mountRef.current.clientHeight || 640;
    const bounds = computeClusterBounds(filteredNodes);
    const fit = calculateCameraFit(bounds, cameraRef.current.fov, w / h);

    cameraAnimRef.current = {
      active: true,
      startTime: performance.now(),
      duration: 600,
      startPos: cameraRef.current.position.clone(),
      endPos: fit.position,
      startTarget: currentLookAtRef.current.clone(),
      endTarget: fit.target,
    };
  }, [filteredNodes]);

  const handleResetCamera = useCallback(() => {
    if (!cameraRef.current || !mountRef.current || !graphGroupRef.current) return;
    hasUserInteractedRef.current = false;
    graphGroupRef.current.rotation.set(0, 0, 0);

    const w = mountRef.current.clientWidth || 900;
    const h = mountRef.current.clientHeight || 640;
    const bounds = computeClusterBounds(filteredNodes);
    const fit = calculateCameraFit(bounds, cameraRef.current.fov, w / h);

    cameraAnimRef.current = {
      active: true,
      startTime: performance.now(),
      duration: 600,
      startPos: cameraRef.current.position.clone(),
      endPos: fit.position,
      startTarget: currentLookAtRef.current.clone(),
      endTarget: fit.target,
    };
    if (onResetView) onResetView();
  }, [filteredNodes, onResetView]);

  const handleZoom = (direction: 'in' | 'out') => {
    if (cameraRef.current) {
      hasUserInteractedRef.current = true;
      cameraAnimRef.current.active = false;
      const factor = direction === 'in' ? 0.82 : 1.18;
      cameraRef.current.position.z = Math.max(6.0, Math.min(30.0, cameraRef.current.position.z * factor));
    }
  };

  const handleFocusSelected = useCallback(() => {
    if (!selectedNode || !cameraRef.current) return;
    const meshPos = TOPOLOGY_LAYOUT_COORDS[selectedNode.id] || selectedNode.position;
    const targetLook = new THREE.Vector3(meshPos[0], meshPos[1], meshPos[2]);
    const targetPos = new THREE.Vector3(meshPos[0], meshPos[1] + 0.35, 8.8);

    cameraAnimRef.current = {
      active: true,
      startTime: performance.now(),
      duration: 550,
      startPos: cameraRef.current.position.clone(),
      endPos: targetPos,
      startTarget: currentLookAtRef.current.clone(),
      endTarget: targetLook,
    };
  }, [selectedNode]);

  return (
    <div className={`relative w-full h-full min-h-[580px] sm:min-h-[640px] bg-[#070B14] select-none overflow-hidden ${className}`}>
      
      {/* ── Top Floating Toolbar (Responsive & Overflow-Safe) ────────── */}
      <div className="absolute top-2.5 inset-x-2.5 sm:top-3.5 sm:inset-x-3.5 z-20 flex flex-wrap md:flex-nowrap items-center justify-between gap-2 pointer-events-none">
        
        {/* Left: 3D/2D switch + Filter Pills + Mobile Dropdown */}
        <div className="flex items-center gap-1.5 bg-[#09111A]/95 backdrop-blur-md p-1 rounded-lg border border-[#162332] pointer-events-auto font-mono text-xs shadow-xl max-w-full">
          <button
            onClick={() => onViewModeChange ? onViewModeChange('3d') : null}
            className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-md transition-all cursor-pointer text-xs font-semibold whitespace-nowrap ${
              viewMode === '3d'
                ? 'bg-[#0E1E30] text-[#38BDF8] border border-[#38BDF8]/40 shadow-xs'
                : 'text-[#64748B] hover:text-[#94A3B8]'
            }`}
          >
            3D Spatial
          </button>
          <button
            onClick={() => onViewModeChange ? onViewModeChange('2d') : null}
            className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-md transition-all cursor-pointer text-xs font-semibold whitespace-nowrap ${
              viewMode === '2d'
                ? 'bg-[#0E1E30] text-[#38BDF8] border border-[#38BDF8]/40 shadow-xs'
                : 'text-[#64748B] hover:text-[#94A3B8]'
            }`}
          >
            2D Planar
          </button>

          <div className="w-[1px] h-4 bg-[#162332] mx-1 flex-shrink-0" />

          {/* Desktop Pill Strip on XL (1280px+) */}
          <div className="hidden xl:flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
            {(['All', 'User', 'Device', 'Event', 'IPAddress', 'Resource'] as const).map((type) => {
              const count = type === 'All' ? HERO_NODES.length : HERO_NODES.filter((n) => n.type === type).length;
              const isSelected = activeFilter === type;
              return (
                <button
                  key={type}
                  id={`filter-pill-${type.toLowerCase()}`}
                  onClick={() => onFilterChange ? onFilterChange(type) : null}
                  className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded transition-all cursor-pointer text-[11px] font-mono whitespace-nowrap ${
                    isSelected
                      ? 'bg-[#162332] text-[#38BDF8] font-bold border border-[#38BDF8]/30 shadow-xs'
                      : 'text-[#64748B] hover:text-[#94A3B8]'
                  }`}
                >
                  <span>{type}</span>
                  <span className="text-[10px] opacity-70 ml-1">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Compact Filter Select on Tablet & Mobile (< xl) to guarantee zero clipping */}
          <div className="xl:hidden flex items-center">
            <select
              id="topology-filter-select"
              value={activeFilter}
              onChange={(e) => onFilterChange ? onFilterChange(e.target.value) : null}
              className="bg-[#0D1826] text-[#38BDF8] border border-[#162332] rounded px-2.5 py-1 text-xs font-mono font-medium outline-none cursor-pointer hover:border-[#38BDF8]/40 transition-colors"
            >
              <option value="All">Filter: All ({HERO_NODES.length})</option>
              <option value="User">Filter: User (3)</option>
              <option value="Device">Filter: Device (5)</option>
              <option value="Event">Filter: Event (7)</option>
              <option value="IPAddress">Filter: IPAddress (5)</option>
              <option value="Resource">Filter: Resource (4)</option>
            </select>
          </div>
        </div>

        {/* Right: Camera Action Buttons */}
        <div className="flex items-center gap-1 bg-[#09111A]/95 backdrop-blur-md p-1 rounded-lg border border-[#162332] pointer-events-auto font-mono text-xs shadow-xl flex-shrink-0">
          <button
            onClick={handleFocusSelected}
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              selectedNode
                ? 'text-[#38BDF8] hover:bg-[#122338]'
                : 'text-[#475569] opacity-50 cursor-not-allowed'
            }`}
            title="Focus On Selection"
            disabled={!selectedNode}
          >
            <Target className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setShowMinimap((prev) => !prev)}
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              showMinimap
                ? 'bg-[#122338] text-[#38BDF8] border border-[#38BDF8]/30'
                : 'text-[#94A3B8] hover:bg-[#122338] hover:text-[#38BDF8]'
            }`}
            title="Toggle Radar Minimap"
          >
            <Layers className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-3.5 bg-[#162332] mx-0.5" />

          <button
            onClick={() => handleZoom('in')}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#122338] text-[#94A3B8] hover:text-[#38BDF8] transition-colors cursor-pointer text-xs font-bold"
            title="Zoom In"
          >
            +
          </button>
          <button
            onClick={() => handleZoom('out')}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#122338] text-[#94A3B8] hover:text-[#38BDF8] transition-colors cursor-pointer text-xs font-bold"
            title="Zoom Out"
          >
            &minus;
          </button>

          <div className="w-[1px] h-3.5 bg-[#162332] mx-0.5" />

          <button
            onClick={handleFitView}
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-[#122338] text-[#94A3B8] hover:text-[#38BDF8] transition-colors cursor-pointer text-[11px] font-mono"
            title="Fit View"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Fit View</span>
          </button>

          <button
            onClick={handleResetCamera}
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-[#122338] text-[#94A3B8] hover:text-[#38BDF8] transition-colors cursor-pointer text-[11px] font-mono"
            title="Reset Camera"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* ── High-Tech Radar Minimap Widget ─────────────────────────── */}
      {viewMode === '3d' && showMinimap && (
        <div className="absolute top-16 right-3 sm:top-18 sm:right-4 z-20 pointer-events-auto bg-[#070D16]/95 border border-[#162332] rounded-lg p-2 backdrop-blur-md shadow-2xl transition-all">
          <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-[#162332]/60 text-[9px] font-mono">
            <span className="text-[#38BDF8] flex items-center gap-1 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] animate-pulse" />
              RADAR MINIMAP
            </span>
            <button
              onClick={() => setShowMinimap(false)}
              className="text-[#64748B] hover:text-white"
              title="Close Minimap"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
          <svg className="w-[120px] h-[75px]" viewBox="-7 -4.5 14 9">
            {/* Background grid */}
            <circle cx={0} cy={0} r={4} fill="none" stroke="#162332" strokeWidth={0.06} />
            <circle cx={0} cy={0} r={2} fill="none" stroke="#162332" strokeWidth={0.06} />
            <line x1={-6} y1={0} x2={6} y2={0} stroke="#162332" strokeWidth={0.05} />
            <line x1={0} y1={-4} x2={0} y2={4} stroke="#162332" strokeWidth={0.05} />

            {/* Edges */}
            {filteredEdges.map((e, idx) => {
              const src = TOPOLOGY_LAYOUT_COORDS[e.source];
              const tgt = TOPOLOGY_LAYOUT_COORDS[e.target];
              if (!src || !tgt) return null;
              return (
                <line
                  key={idx}
                  x1={src[0]}
                  y1={-src[1]}
                  x2={tgt[0]}
                  y2={-tgt[1]}
                  stroke={e.isAttackPath ? '#EF4444' : '#1E2D38'}
                  strokeWidth={e.isAttackPath ? 0.12 : 0.05}
                  opacity={e.isAttackPath ? 0.9 : 0.4}
                />
              );
            })}

            {/* Nodes */}
            {filteredNodes.map((n) => {
              const pos = TOPOLOGY_LAYOUT_COORDS[n.id] || [n.position[0] * 0.7, n.position[1] * 0.7, 0];
              const isSelected = selectedNode?.id === n.id;
              const color = n.id === 'evt-lsass-dump' ? '#EF4444' : n.isAttackPath ? '#EF4444' : '#38BDF8';
              return (
                <g key={n.id} onClick={() => onSelectNode(n)} className="cursor-pointer">
                  {isSelected && (
                    <circle cx={pos[0]} cy={-pos[1]} r={0.45} fill="none" stroke="#38BDF8" strokeWidth={0.08} className="animate-ping" />
                  )}
                  <circle
                    cx={pos[0]}
                    cy={-pos[1]}
                    r={isSelected ? 0.28 : n.isAttackPath ? 0.22 : 0.16}
                    fill={color}
                  />
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {/* ── Viewport Canvas or SVG 2D Planar ──────────────────────── */}
      {viewMode === '3d' && webglSupported ? (
        <div ref={mountRef} className="w-full h-full min-h-[580px] sm:min-h-[640px]" />
      ) : (
        <div className="w-full h-full min-h-[580px] sm:min-h-[640px] flex items-center justify-center p-6 bg-[#070B14]">
          <svg className="w-full h-full max-h-[580px]" viewBox="-8 -4.5 16 9">
            {/* Concentric radar circles in 2D mode */}
            <circle cx={TOPOLOGY_LAYOUT_COORDS['evt-lsass-dump'][0]} cy={-TOPOLOGY_LAYOUT_COORDS['evt-lsass-dump'][1]} r={0.6} fill="none" stroke="#EF4444" strokeWidth={0.03} opacity={0.35} />
            <circle cx={TOPOLOGY_LAYOUT_COORDS['evt-lsass-dump'][0]} cy={-TOPOLOGY_LAYOUT_COORDS['evt-lsass-dump'][1]} r={1.2} fill="none" stroke="#EF4444" strokeWidth={0.03} opacity={0.3} />
            <circle cx={TOPOLOGY_LAYOUT_COORDS['evt-lsass-dump'][0]} cy={-TOPOLOGY_LAYOUT_COORDS['evt-lsass-dump'][1]} r={1.8} fill="none" stroke="#EF4444" strokeWidth={0.03} opacity={0.25} />
            <circle cx={TOPOLOGY_LAYOUT_COORDS['evt-lsass-dump'][0]} cy={-TOPOLOGY_LAYOUT_COORDS['evt-lsass-dump'][1]} r={2.5} fill="none" stroke="#EF4444" strokeWidth={0.03} opacity={0.2} />

            {/* Edges */}
            {filteredEdges.map((edge: HeroEdge, idx: number) => {
              const srcPos = TOPOLOGY_LAYOUT_COORDS[edge.source] || [0, 0, 0];
              const tgtPos = TOPOLOGY_LAYOUT_COORDS[edge.target] || [0, 0, 0];
              return (
                <line
                  key={idx}
                  x1={srcPos[0]}
                  y1={-srcPos[1]}
                  x2={tgtPos[0]}
                  y2={-tgtPos[1]}
                  stroke={edge.isAttackPath ? '#EF4444' : '#1E2D38'}
                  strokeWidth={edge.isAttackPath ? 0.08 : 0.03}
                  strokeDasharray={edge.isAttackPath ? '0.2, 0.1' : undefined}
                />
              );
            })}

            {/* Nodes */}
            {filteredNodes.map((node: HeroNode) => {
              const pos = TOPOLOGY_LAYOUT_COORDS[node.id] || [node.position[0] * 0.7, node.position[1] * 0.7, 0];
              const isSelected = selectedNode?.id === node.id;
              const displayMeta = LABELED_NODES[node.id];
              return (
                <g
                  key={node.id}
                  transform={`translate(${pos[0]}, ${-pos[1]})`}
                  onClick={() => onSelectNode(node)}
                  className="cursor-pointer"
                >
                  <circle
                    r={isSelected ? 0.44 : 0.32}
                    fill="#0B1525"
                    stroke={displayMeta ? displayMeta.color : (node.color || (node.isAttackPath ? '#EF4444' : '#38BDF8'))}
                    strokeWidth={isSelected ? 0.08 : 0.04}
                  />
                  <text
                    y={0.52}
                    fontSize={0.22}
                    fill="#F3F4F0"
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    {displayMeta ? displayMeta.label.split(' ')[0] : node.label.split(' ')[0]}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {/* ── Projected 3D Floating Labels Overlay ─────────────────── */}
      {viewMode === '3d' && webglSupported && (
        <div
          ref={labelsContainerRef}
          className="absolute inset-0 pointer-events-none z-10 overflow-hidden"
        >
          {/* Key Floating Labels */}
          {Object.entries(LABELED_NODES).map(([nodeId, meta]) => {
            const isSelected = selectedNode?.id === nodeId;
            const isCompromised = meta.isCompromised;
            const isRightAligned = meta.align === 'right';

            return (
              <div
                key={nodeId}
                id={`topo-label-${nodeId}`}
                style={{ display: 'none', position: 'absolute', top: 0, left: 0 }}
                className={`pointer-events-auto cursor-pointer transition-transform duration-75 select-none ${
                  isRightAligned
                    ? 'translate-x-[24px] -translate-y-1/2'
                    : '-translate-x-1/2 translate-y-[14px]'
                } ${isSelected ? 'scale-110' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  const targetNode = HERO_NODES.find((n) => n.id === nodeId);
                  if (targetNode) onSelectNode(targetNode);
                }}
              >
                <div
                  className={`flex flex-col leading-tight ${
                    isRightAligned ? 'items-start text-left' : 'items-center text-center'
                  } px-1.5 py-0.5 rounded bg-[#070B14]/80 backdrop-blur-[2px]`}
                >
                  <span
                    className={`font-heading font-bold text-[11px] whitespace-nowrap drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] ${
                      isCompromised ? 'text-white' : 'text-[#F3F4F0]'
                    }`}
                  >
                    {meta.label}
                  </span>
                  <span
                    className={`font-mono text-[9px] mt-0.5 tracking-wider drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] ${
                      isCompromised ? 'text-[#94A3B8]' : 'text-[#64748B]'
                    }`}
                  >
                    {meta.sub}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Floating Threat Callout: Credential Access T1003 */}
          <div
            id="topo-callout-t1003"
            style={{ display: 'none', position: 'absolute', top: 0, left: 0 }}
            className="pointer-events-auto -translate-x-1/2 -translate-y-1/2 px-2.5 py-1 rounded border border-[#EF4444]/60 bg-[#14080B]/90 shadow-[0_0_14px_rgba(239,68,68,0.35)] select-none cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              const lsassNode = HERO_NODES.find((n) => n.id === 'evt-lsass-dump');
              if (lsassNode) onSelectNode(lsassNode);
            }}
          >
            <div className="font-mono text-[10px] text-[#EF4444] font-semibold flex items-center gap-1.5 leading-tight">
              <span>Credential Access</span>
              <span className="text-[9px] text-[#F87171]/80">T1003</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom HUD Bar (Matching Reference Design) ───────────── */}
      <div className="absolute bottom-3 inset-x-3 sm:bottom-4 sm:inset-x-4 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        
        {/* Left: Restrained Legend */}
        <div className="bg-[#09111A]/95 backdrop-blur-md px-3.5 py-1.5 rounded-lg border border-[#162332] pointer-events-auto flex flex-wrap items-center gap-3 font-mono text-[11px] shadow-xl">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#38BDF8]" />
            <span className="text-[#94A3B8]">User</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#38BDF8]" />
            <span className="text-[#94A3B8]">Device</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
            <span className="text-[#94A3B8]">Event</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#A855F7]" />
            <span className="text-[#94A3B8]">IPAddress</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
            <span className="text-[#94A3B8]">Resource</span>
          </div>
          <div className="w-[1px] h-3 bg-[#162332] mx-0.5 hidden sm:block" />
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-[2px] bg-[#EF4444] border-t border-dashed border-[#EF4444]" />
            <span className="text-[#EF4444] font-semibold">Attack Path</span>
          </div>
        </div>

        {/* Right: Interaction Guide */}
        <div className="bg-[#09111A]/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#162332] pointer-events-auto hidden md:flex items-center gap-2 font-mono text-[10px] text-[#64748B] shadow-xl">
          <Activity className="w-3 h-3 text-[#38BDF8]" />
          <span>Left-Drag: Orbit &bull; Scroll: Zoom &bull; Click Node: Inspect</span>
        </div>
      </div>
    </div>
  );
}
