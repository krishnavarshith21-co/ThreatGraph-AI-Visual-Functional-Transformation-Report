import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import cytoscape from 'cytoscape';
import type { GraphData, GraphNode } from '../../types';
import {
  ZoomIn, ZoomOut, Maximize2, RefreshCw, Layers,
  Play, Pause, RotateCcw, Box, Eye,
  ShieldAlert
} from 'lucide-react';

export interface CytoscapeGraphProps {
  data: GraphData;
  onNodeSelect?: (node: GraphNode | null) => void;
  attackPath?: { source: string; target: string; relationship: string }[];
  highlightAttackPath?: boolean;
  className?: string;
}

// ── Cinematic Intelligence Canonical Palette ────────────────────
const PALETTE = {
  background: '#080B10',
  deepSurface: '#101923',
  iceCyan: '#79D8D0',
  mutedCopper: '#CC805E',
  paleChampagne: '#D8C99A',
  criticalRed: '#D85E61',
  primaryText: '#EDF0ED',
  mutedText: '#8A99A8',
  dimmedEdge: '#1E2D38',
  steelBorder: '#2B3941',
};

// ── Node Color & Geometry Specifications ────────────────────────
const ENTITY_CONFIG: Record<string, {
  color: string;
  shape: 'cylinder' | 'box' | 'octahedron' | 'hexPrism' | 'capsule' | 'icosahedron';
  label: string;
}> = {
  User: { color: PALETTE.iceCyan, shape: 'cylinder', label: 'Identity' },
  Device: { color: PALETTE.paleChampagne, shape: 'box', label: 'Endpoint' },
  IPAddress: { color: '#6B7A85', shape: 'hexPrism', label: 'Network IP' },
  Event: { color: PALETTE.mutedCopper, shape: 'octahedron', label: 'Telemetry Event' },
  Resource: { color: PALETTE.mutedCopper, shape: 'capsule', label: 'Crown Jewel' },
  Alert: { color: PALETTE.criticalRed, shape: 'icosahedron', label: 'Threat Alert' },
  Incident: { color: PALETTE.criticalRed, shape: 'icosahedron', label: 'Incident Vector' },
};

interface SpatialNode3D {
  id: string;
  label: string;
  nodeType: string;
  position: [number, number, number];
  color: string;
  shape: 'cylinder' | 'box' | 'octahedron' | 'hexPrism' | 'capsule' | 'icosahedron';
  fullData: GraphNode;
  isAttackPath: boolean;
  attackOrder: number;
}

interface SpatialEdge3D {
  id: string;
  source: string;
  target: string;
  label: string;
  isAttack: boolean;
  attackOrder: number;
}

export function CytoscapeGraph({
  data,
  onNodeSelect,
  attackPath,
  highlightAttackPath = true,
  className = '',
}: CytoscapeGraphProps) {
  // Mount refs
  const mount3DRef = useRef<HTMLDivElement>(null);
  const cyContainerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  // View state
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<SpatialNode3D | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Investigation Path Animation State
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [pathProgress, setPathProgress] = useState<number>(0);
  const isPlayingRef = useRef<boolean>(true);
  const pathProgressRef = useRef<number>(0);

  // Three.js instance refs for manual camera controls
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const resetFitRef = useRef<(() => void) | null>(null);
  const zoomInRef = useRef<(() => void) | null>(null);
  const zoomOutRef = useRef<(() => void) | null>(null);

  // Keep ref sync
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    pathProgressRef.current = pathProgress;
  }, [pathProgress]);

  const updateSelection = useCallback((node: GraphNode | null) => {
    setSelectedNode(node);
    if (onNodeSelect) {
      onNodeSelect(node);
    }
  }, [onNodeSelect]);

  // ── Calculate 3D Spatial Topology Positions ─────────────────────
  const spatialGraph = useMemo(() => {
    const filteredNodes = filterType === 'all'
      ? data.nodes
      : data.nodes.filter((n) => n._label === filterType);

    const validNodeIds = new Set(filteredNodes.map((n) => n.id));
    const filteredEdges = data.edges.filter(
      (e) => validNodeIds.has(e.source) && validNodeIds.has(e.target)
    );

    // Map attack path sequence
    const attackNodeOrder = new Map<string, number>();
    const attackEdgeKeys = new Set<string>();

    if (highlightAttackPath && attackPath && attackPath.length > 0) {
      attackPath.forEach((ap, idx) => {
        if (!attackNodeOrder.has(ap.source)) attackNodeOrder.set(ap.source, idx);
        if (!attackNodeOrder.has(ap.target)) attackNodeOrder.set(ap.target, idx + 1);
        attackEdgeKeys.add(`${ap.source}->${ap.target}`);
        attackEdgeKeys.add(`${ap.target}->${ap.source}`);
      });
    }

    // Assign 3D positions with deliberate architectural depth
    const nodes3D: SpatialNode3D[] = [];
    const count = filteredNodes.length;

    // Check if this graph has an attack trajectory progression
    const hasAttackProgression = attackNodeOrder.size > 1;

    filteredNodes.forEach((node, index) => {
      const type = (node._label as string) || 'Node';
      const config = ENTITY_CONFIG[type] || {
        color: PALETTE.iceCyan,
        shape: 'cylinder',
        label: 'Node'
      };

      const isAttack = attackNodeOrder.has(node.id);
      const attackOrder = attackNodeOrder.get(node.id) ?? -1;

      let pos: [number, number, number];

      if (hasAttackProgression && isAttack) {
        // Staged Left-to-Right Investigation Progression (X: -7 to +7)
        const totalSteps = attackNodeOrder.size;
        const normStep = attackOrder / Math.max(1, totalSteps - 1);
        const x = -7.0 + normStep * 14.0;
        
        // Controlled natural depth (Z) and vertical elevation (Y)
        const y = Math.sin(normStep * Math.PI * 1.5) * 1.6 + ((attackOrder % 2 === 0) ? 0.4 : -0.4);
        
        // Foreground for alerts/users, midground for devices, back for resources
        let z = 0.5;
        if (type === 'Alert' || type === 'Incident') z = 1.0;
        else if (type === 'User') z = 0.6;
        else if (type === 'Device') z = 0.1;
        else if (type === 'Event') z = 0.3;
        else if (type === 'Resource') z = -0.4;
        else if (type === 'IPAddress') z = -1.0;

        pos = [x, y, z];
      } else {
        // 3D Concentric Radial & Layered Distribution for general exploration
        const angle = (index / Math.max(1, count)) * Math.PI * 2;
        const radius = 3.6 + (index % 3) * 1.6;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * (radius * 0.65);
        
        // Natural depth separation across layers
        const z = -1.2 + ((index % 4) * 0.7);
        pos = [x, y, z];
      }

      const displayName =
        (node.hostname as string) ||
        (node.name as string) ||
        (node.title as string) ||
        (node.address as string) ||
        node.id;

      nodes3D.push({
        id: node.id,
        label: displayName,
        nodeType: type,
        position: pos,
        color: isAttack ? (type === 'Alert' ? PALETTE.criticalRed : (type === 'Event' ? PALETTE.mutedCopper : config.color)) : config.color,
        shape: config.shape,
        fullData: node,
        isAttackPath: isAttack,
        attackOrder: attackOrder,
      });
    });

    const edges3D: SpatialEdge3D[] = filteredEdges.map((e, idx) => {
      const isAttack =
        highlightAttackPath &&
        (attackEdgeKeys.has(`${e.source}->${e.target}`) || attackEdgeKeys.has(`${e.target}->${e.source}`));

      const srcOrder = attackNodeOrder.get(e.source) ?? -1;
      const tgtOrder = attackNodeOrder.get(e.target) ?? -1;
      const attackOrder = Math.max(srcOrder, tgtOrder);

      return {
        id: e.key || `${e.source}-${e.type}-${e.target}-${idx}`,
        source: e.source,
        target: e.target,
        label: e.type,
        isAttack,
        attackOrder,
      };
    });

    return { nodes: nodes3D, edges: edges3D };
  }, [data, filterType, highlightAttackPath, attackPath]);

  // ── Three.js Signature 3D Visualization Effect ─────────────────
  useEffect(() => {
    if (viewMode !== '3d') return;
    const mount = mount3DRef.current;
    if (!mount) return;

    // Detect prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setIsPlaying(false);
      isPlayingRef.current = false;
    }

    // ── Scene Setup ──────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x080B10, 0.012);

    const width = mount.clientWidth || 800;
    const height = mount.clientHeight || 560;

    // Controlled perspective (low FOV: 32 deg for architectural precision)
    const camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 500);
    cameraRef.current = camera;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      });
    } catch {
      // Graceful fallback to 2D
      setViewMode('2d');
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x080B10, 1);
    rendererRef.current = renderer;
    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);

    // ── Architectural Lighting ───────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0xEDF0ED, 0.6);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xEDF0ED, 0.8);
    keyLight.position.set(12, 16, 12);
    scene.add(keyLight);

    const cyanRim = new THREE.DirectionalLight(0x79D8D0, 0.45);
    cyanRim.position.set(-12, -6, -8);
    scene.add(cyanRim);

    const copperFill = new THREE.DirectionalLight(0xCC805E, 0.35);
    copperFill.position.set(10, -5, 6);
    scene.add(copperFill);

    // ── Spatial Ground Reference Grid ───────────────────────────
    const gridHelper = new THREE.GridHelper(36, 24, 0x1E2D38, 0x0D141A);
    gridHelper.position.y = -5.2;
    scene.add(gridHelper);

    // ── Graph Scene Group & Bounding Box ────────────────────────
    const graphGroup = new THREE.Group();
    scene.add(graphGroup);

    // Dynamic Bounding Box calculation
    const bbox = new THREE.Box3();
    if (spatialGraph.nodes.length > 0) {
      spatialGraph.nodes.forEach((n) => {
        bbox.expandByPoint(new THREE.Vector3(...n.position));
      });
    } else {
      bbox.set(new THREE.Vector3(-4, -3, -2), new THREE.Vector3(4, 3, 2));
    }

    const center = new THREE.Vector3();
    bbox.getCenter(center);
    const size = new THREE.Vector3();
    bbox.getSize(size);

    // Center topology at group origin
    graphGroup.position.set(-center.x, -center.y, -center.z);

    // ── Auto-Fit Camera Function ─────────────────────────────────
    const fitCamera = (w: number, h: number) => {
      const aspect = w / h;
      camera.aspect = aspect;
      camera.updateProjectionMatrix();

      const fovRad = (camera.fov * Math.PI) / 180;
      const tanHalf = Math.tan(fovRad * 0.5);

      const marginY = 1.35;
      const marginX = 1.25;

      const dVert = (Math.max(size.y, 4.0) * 0.5 * marginY) / tanHalf;
      const dHoriz = (Math.max(size.x, 6.0) * 0.5 * marginX) / (tanHalf * aspect);
      const targetDist = Math.max(dVert, dHoriz, 14.0);

      camera.position.set(0, 0.8, targetDist);
      camera.lookAt(0, 0, 0);
    };

    fitCamera(width, height);
    resetFitRef.current = () => fitCamera(mount.clientWidth, mount.clientHeight);
    zoomInRef.current = () => {
      camera.position.multiplyScalar(0.85);
    };
    zoomOutRef.current = () => {
      camera.position.multiplyScalar(1.15);
    };

    // ── Build 3D Geometric Nodes ────────────────────────────────
    const nodeMeshMap = new Map<string, THREE.Mesh>();
    const nodeDataMap = new Map<string, SpatialNode3D>();
    const interactiveMeshes: THREE.Mesh[] = [];

    // Pre-allocated reusable geometries
    const cylinderGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.22, 8);
    const boxGeo = new THREE.BoxGeometry(0.64, 0.48, 0.42);
    const octaGeo = new THREE.OctahedronGeometry(0.40, 0);
    const hexPrismGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.26, 6);
    const capsuleGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.62, 16);
    const icosaGeo = new THREE.IcosahedronGeometry(0.44, 0);

    // Pre-allocated edge geometry line accents
    const cylinderEdges = new THREE.EdgesGeometry(cylinderGeo);
    const boxEdges = new THREE.EdgesGeometry(boxGeo);
    const octaEdges = new THREE.EdgesGeometry(octaGeo);
    const hexEdges = new THREE.EdgesGeometry(hexPrismGeo);
    const capsuleEdges = new THREE.EdgesGeometry(capsuleGeo);
    const icosaEdges = new THREE.EdgesGeometry(icosaGeo);

    spatialGraph.nodes.forEach((n) => {
      nodeDataMap.set(n.id, n);

      let geo: THREE.BufferGeometry = cylinderGeo;
      let edgesGeo: THREE.BufferGeometry = cylinderEdges;

      switch (n.shape) {
        case 'box':
          geo = boxGeo;
          edgesGeo = boxEdges;
          break;
        case 'octahedron':
          geo = octaGeo;
          edgesGeo = octaEdges;
          break;
        case 'hexPrism':
          geo = hexPrismGeo;
          edgesGeo = hexEdges;
          break;
        case 'capsule':
          geo = capsuleGeo;
          edgesGeo = capsuleEdges;
          break;
        case 'icosahedron':
          geo = icosaGeo;
          edgesGeo = icosaEdges;
          break;
        default:
          geo = cylinderGeo;
          edgesGeo = cylinderEdges;
      }

      // Restrained technical material
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(n.color),
        roughness: 0.32,
        metalness: 0.28,
        emissive: new THREE.Color(n.color),
        emissiveIntensity: n.isAttackPath ? 0.35 : 0.08,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...n.position);
      mesh.userData = { nodeId: n.id, data: n.fullData };

      // Add crisp wireframe edge outline for precision instrumentation look
      const wireframeMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(n.color),
        transparent: true,
        opacity: 0.85,
      });
      const wireframe = new THREE.LineSegments(edgesGeo, wireframeMat);
      mesh.add(wireframe);

      // Status beacon dot
      const beaconGeo = new THREE.SphereGeometry(0.08, 8, 8);
      const beaconMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(n.color) });
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.set(0, 0.35, 0);
      mesh.add(beacon);

      graphGroup.add(mesh);
      nodeMeshMap.set(n.id, mesh);
      interactiveMeshes.push(mesh);
    });

    // ── Build Crisp Relationship Conduits ───────────────────────
    const edgeLines: {
      line: THREE.Line;
      sourceMesh: THREE.Mesh;
      targetMesh: THREE.Mesh;
      isAttack: boolean;
      attackOrder: number;
      pulseMat?: THREE.LineBasicMaterial;
    }[] = [];

    // Particle pulses traveling along attack path conduits
    const pulseBeads: {
      mesh: THREE.Mesh;
      start: THREE.Vector3;
      end: THREE.Vector3;
      speed: number;
      progress: number;
      active: boolean;
      attackOrder: number;
    }[] = [];

    const beadGeo = new THREE.SphereGeometry(0.12, 8, 8);

    spatialGraph.edges.forEach((edge) => {
      const srcMesh = nodeMeshMap.get(edge.source);
      const tgtMesh = nodeMeshMap.get(edge.target);
      if (!srcMesh || !tgtMesh) return;

      const points = [srcMesh.position.clone(), tgtMesh.position.clone()];
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);

      const lineColor = edge.isAttack
        ? new THREE.Color(PALETTE.criticalRed)
        : new THREE.Color(PALETTE.dimmedEdge);

      const lineMat = new THREE.LineBasicMaterial({
        color: lineColor,
        transparent: true,
        opacity: edge.isAttack ? 0.95 : 0.45,
      });

      const line = new THREE.Line(lineGeo, lineMat);
      graphGroup.add(line);

      edgeLines.push({
        line,
        sourceMesh: srcMesh,
        targetMesh: tgtMesh,
        isAttack: edge.isAttack,
        attackOrder: edge.attackOrder,
        pulseMat: lineMat,
      });

      // If attack edge, add a traveling energy pulse
      if (edge.isAttack) {
        const beadMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(PALETTE.criticalRed),
        });
        const bead = new THREE.Mesh(beadGeo, beadMat);
        bead.position.copy(srcMesh.position);
        graphGroup.add(bead);

        pulseBeads.push({
          mesh: bead,
          start: srcMesh.position.clone(),
          end: tgtMesh.position.clone(),
          speed: 0.008 + (Math.random() * 0.004),
          progress: Math.random(),
          active: true,
          attackOrder: edge.attackOrder,
        });
      }
    });

    // ── Interactive Raycasting & Camera Orbit Control ────────────
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let isDragging = false;
    let isPanning = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const onPointerDown = (e: MouseEvent) => {
      if (e.button === 0) {
        isDragging = true;
      } else if (e.button === 2) {
        isPanning = true;
      }
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

        // Controlled, slow camera orbit
        graphGroup.rotation.y += dx * 0.0045;
        graphGroup.rotation.x += dy * 0.0035;
        graphGroup.rotation.x = Math.max(-0.65, Math.min(0.65, graphGroup.rotation.x));
      } else if (isPanning) {
        const dx = e.clientX - prevMouseX;
        const dy = e.clientY - prevMouseY;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;

        camera.position.x -= dx * 0.015;
        camera.position.y += dy * 0.015;
      } else {
        // Raycast for hover state
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(interactiveMeshes);

        if (intersects.length > 0) {
          const hit = intersects[0].object as THREE.Mesh;
          const hitId = hit.userData.nodeId;
          const nodeData = nodeDataMap.get(hitId);
          if (nodeData) {
            setHoveredNode(nodeData);
            setTooltipPos({ x: e.clientX, y: e.clientY });
            mount.style.cursor = 'pointer';
          }
        } else {
          setHoveredNode(null);
          setTooltipPos(null);
          mount.style.cursor = 'default';
        }
      }
    };

    const onPointerUp = () => {
      isDragging = false;
      isPanning = false;
    };

    const onClick = (e: MouseEvent) => {
      // Ignore click if it was a drag gesture
      if (Math.abs(e.clientX - prevMouseX) > 4 || Math.abs(e.clientY - prevMouseY) > 4) {
        return;
      }

      const rect = mount.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / mount.clientWidth) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / mount.clientHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(interactiveMeshes);

      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        const rawNode = hit.userData.data as GraphNode;
        updateSelection(rawNode);
      } else {
        // Deselect if clicked empty background
        updateSelection(null);
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 1.08 : 0.92;
      camera.position.multiplyScalar(zoomFactor);
      camera.position.clampLength(6.0, 60.0);
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    mount.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    mount.addEventListener('click', onClick);
    mount.addEventListener('wheel', onWheel, { passive: false });
    mount.addEventListener('contextmenu', onContextMenu);

    // ── Animation Loop ───────────────────────────────────────────
    let animationFrameId: number;
    let clock = new THREE.Clock();
    let stepTimer = 0;

    const maxAttackStep = Math.max(1, ...spatialGraph.nodes.map((n) => n.attackOrder));

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      // Progressive investigation animation ticker
      if (isPlayingRef.current) {
        stepTimer += delta;
        if (stepTimer > 1.8) {
          stepTimer = 0;
          setPathProgress((prev) => {
            const next = prev >= maxAttackStep ? 0 : prev + 1;
            pathProgressRef.current = next;
            return next;
          });
        }
      }

      const currentStep = pathProgressRef.current;

      // Animate node pulses & selection states
      nodeMeshMap.forEach((mesh, id) => {
        const nData = nodeDataMap.get(id);
        if (!nData) return;

        const isSelected = selectedNode?.id === id;
        const isHovered = hoveredNode?.id === id;
        const isAttackActive = nData.isAttackPath && (nData.attackOrder <= currentStep || !isPlayingRef.current);

        const mat = mesh.material as THREE.MeshStandardMaterial;

        if (isSelected) {
          mat.emissiveIntensity = 0.85;
          mesh.scale.set(1.22, 1.22, 1.22);
        } else if (isHovered) {
          mat.emissiveIntensity = 0.65;
          mesh.scale.set(1.15, 1.15, 1.15);
        } else if (isAttackActive) {
          mat.emissiveIntensity = 0.45;
          mesh.scale.set(1.05, 1.05, 1.05);
        } else {
          mat.emissiveIntensity = nData.isAttackPath ? 0.25 : 0.08;
          mesh.scale.set(1.0, 1.0, 1.0);
        }

        // Extremely slow, dignified idle rotation
        mesh.rotation.y += 0.003;
      });

      // Animate edge pulses
      pulseBeads.forEach((bead) => {
        if (isPlayingRef.current) {
          bead.progress += bead.speed;
          if (bead.progress > 1.0) bead.progress = 0.0;
        }

        // Interpolate along line segment
        bead.mesh.position.lerpVectors(bead.start, bead.end, bead.progress);

        // Highlight based on step
        const isVisibleStep = bead.attackOrder <= currentStep || !isPlayingRef.current;
        bead.mesh.visible = isVisibleStep;
      });

      // Render
      renderer.render(scene, camera);
    };

    animate();

    // ── Resize Observer ──────────────────────────────────────────
    const resizeObserver = new ResizeObserver(() => {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (w > 0 && h > 0) {
        fitCamera(w, h);
        renderer.setSize(w, h);
      }
    });
    resizeObserver.observe(mount);

    // ── Cleanup ──────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      mount.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      mount.removeEventListener('click', onClick);
      mount.removeEventListener('wheel', onWheel);
      mount.removeEventListener('contextmenu', onContextMenu);

      // Dispose Three.js resources
      interactiveMeshes.forEach((m) => {
        m.geometry.dispose();
        if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
        else m.material.dispose();
      });
      cylinderGeo.dispose();
      boxGeo.dispose();
      octaGeo.dispose();
      hexPrismGeo.dispose();
      capsuleGeo.dispose();
      icosaGeo.dispose();
      cylinderEdges.dispose();
      boxEdges.dispose();
      octaEdges.dispose();
      hexEdges.dispose();
      capsuleEdges.dispose();
      icosaEdges.dispose();
      beadGeo.dispose();
      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, [viewMode, spatialGraph, selectedNode, hoveredNode, updateSelection]);

  // ── Cytoscape 2D Fallback Effect ──────────────────────────────
  useEffect(() => {
    if (viewMode !== '2d') return;
    if (!cyContainerRef.current) return;

    const filteredNodes = filterType === 'all'
      ? data.nodes
      : data.nodes.filter((n) => n._label === filterType);

    const validNodeIds = new Set(filteredNodes.map((n) => n.id));
    const filteredEdges = data.edges.filter(
      (e) => validNodeIds.has(e.source) && validNodeIds.has(e.target)
    );

    const elements: cytoscape.ElementDefinition[] = [
      ...filteredNodes.map((node) => {
        const label = (node._label as string) || 'Node';
        const config = ENTITY_CONFIG[label] || { color: PALETTE.iceCyan };
        const displayName =
          (node.hostname as string) ||
          (node.name as string) ||
          (node.title as string) ||
          (node.address as string) ||
          node.id;

        return {
          data: {
            id: node.id,
            label: displayName,
            nodeType: label,
            fullData: node,
            bgColor: '#101923',
            borderColor: config.color,
            textColor: '#EDF0ED',
          },
        };
      }),
      ...filteredEdges.map((edge) => {
        const isAttackEdge = highlightAttackPath && attackPath?.some(
          (ap) => (ap.source === edge.source && ap.target === edge.target) || (ap.source === edge.target && ap.target === edge.source)
        );

        return {
          data: {
            id: edge.key || `${edge.source}-${edge.type}-${edge.target}`,
            source: edge.source,
            target: edge.target,
            label: edge.type,
            isAttack: isAttackEdge,
          },
        };
      }),
    ];

    const cy = cytoscape({
      container: cyContainerRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': 'data(bgColor)',
            'border-color': 'data(borderColor)',
            'border-width': 1.5,
            label: 'data(label)',
            color: 'data(textColor)',
            'font-size': '11px',
            'font-family': 'Space Grotesk, sans-serif',
            'text-valign': 'bottom',
            'text-margin-y': 7,
            width: 32,
            height: 32,
            'text-outline-color': '#080B10',
            'text-outline-width': 2.5,
          },
        },
        {
          selector: 'node:selected',
          style: {
            'border-color': PALETTE.iceCyan,
            'border-width': 3,
            width: 42,
            height: 42,
          },
        },
        {
          selector: 'edge',
          style: {
            width: 1.2,
            'line-color': '#1E2D38',
            'target-arrow-color': '#1E2D38',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            label: 'data(label)',
            'font-size': '9px',
            'font-family': 'IBM Plex Mono, monospace',
            color: '#8A99A8',
            'text-rotation': 'autorotate',
            'text-background-color': '#080B10',
            'text-background-opacity': 0.92,
            'text-background-padding': '3px',
          },
        },
        {
          selector: 'edge[?isAttack]',
          style: {
            width: 2.5,
            'line-color': PALETTE.criticalRed,
            'target-arrow-color': PALETTE.criticalRed,
            color: PALETTE.criticalRed,
          },
        },
      ],
      layout: {
        name: 'cose',
        animate: true,
        animationDuration: 350,
        padding: 40,
      },
    });

    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      const rawData = node.data('fullData') as GraphNode;
      updateSelection(rawData);
    });

    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        updateSelection(null);
      }
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
    };
  }, [viewMode, data, filterType, highlightAttackPath, attackPath, updateSelection]);

  const togglePlayback = () => {
    setIsPlaying((prev) => !prev);
  };

  const resetInvestigationPath = () => {
    setPathProgress(0);
    pathProgressRef.current = 0;
    setIsPlaying(true);
  };

  return (
    <div className={`relative w-full h-full bg-[#080B10] border border-[#1E2D38] rounded-sm overflow-hidden flex flex-col select-none ${className}`}>
      {/* ── Top HUD Toolbar ──────────────────────────────────────── */}
      <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left Toolbar: View Mode & Entity Filter */}
        <div className="flex items-center gap-2 pointer-events-auto bg-[#101923]/92 backdrop-blur-md px-3 py-1.5 rounded-sm border border-[#1E2D38] text-xs font-mono shadow-xl">
          {/* 3D / 2D View Switcher */}
          <div className="flex items-center gap-1 bg-[#080B10] p-0.5 rounded border border-[#1E2D38]">
            <button
              onClick={() => setViewMode('3d')}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 transition-all ${
                viewMode === '3d'
                  ? 'bg-[#79D8D0]/15 text-[#79D8D0] border border-[#79D8D0]/40 shadow-sm'
                  : 'text-[#8A99A8] hover:text-[#EDF0ED]'
              }`}
              title="3D Spatial Intelligence View"
            >
              <Box className="w-3 h-3" />
              <span>3D Spatial</span>
            </button>
            <button
              onClick={() => setViewMode('2d')}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 transition-all ${
                viewMode === '2d'
                  ? 'bg-[#79D8D0]/15 text-[#79D8D0] border border-[#79D8D0]/40 shadow-sm'
                  : 'text-[#8A99A8] hover:text-[#EDF0ED]'
              }`}
              title="2D Planar Diagram"
            >
              <Eye className="w-3 h-3" />
              <span>2D Planar</span>
            </button>
          </div>

          <span className="text-[#1E2D38] mx-0.5">|</span>

          {/* Filter Dropdown */}
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#79D8D0]" />
            <span className="text-[#8A99A8]">Filter:</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-[#1A2732] border border-[#1E2D38] rounded-sm px-2 py-0.5 text-xs text-[#EDF0ED] outline-none focus:border-[#79D8D0] cursor-pointer"
            >
              <option value="all">All Entities ({data.nodes.length})</option>
              <option value="User">Users</option>
              <option value="Device">Devices</option>
              <option value="IPAddress">IPs</option>
              <option value="Event">Events</option>
              <option value="Resource">Resources</option>
              <option value="Alert">Alerts</option>
            </select>
          </div>
        </div>

        {/* Center Toolbar: Investigation Trajectory Playback Controls */}
        {highlightAttackPath && attackPath && attackPath.length > 0 && (
          <div className="hidden md:flex items-center gap-2 pointer-events-auto bg-[#101923]/92 backdrop-blur-md px-3 py-1.5 rounded-sm border border-[#1E2D38] text-xs font-mono shadow-xl">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#D85E61] animate-pulse" />
              <span className="text-[#D85E61] font-semibold uppercase text-[10px] tracking-wider">
                Trajectory:
              </span>
            </div>

            <button
              onClick={togglePlayback}
              className="p-1 text-[#8A99A8] hover:text-[#EDF0ED] hover:bg-[#1A2732] rounded transition-colors"
              title={isPlaying ? 'Pause Investigation Path' : 'Resume Investigation Path'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 text-[#D8C99A]" /> : <Play className="w-3.5 h-3.5 text-[#79D8D0]" />}
            </button>

            <button
              onClick={resetInvestigationPath}
              className="p-1 text-[#8A99A8] hover:text-[#EDF0ED] hover:bg-[#1A2732] rounded transition-colors"
              title="Restart Path Progression"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <span className="text-[11px] text-[#8A99A8]">
              Step <strong className="text-[#EDF0ED]">{pathProgress + 1}</strong> of {attackPath.length}
            </span>
          </div>
        )}

        {/* Right Toolbar: Camera Controls & View Reset */}
        <div className="flex items-center gap-1 pointer-events-auto bg-[#101923]/92 backdrop-blur-md p-1 rounded-sm border border-[#1E2D38] shadow-xl">
          <button
            onClick={() => {
              if (viewMode === '3d') zoomInRef.current?.();
              else cyRef.current?.zoom(cyRef.current.zoom() * 1.25);
            }}
            className="p-1.5 text-[#8A99A8] hover:text-[#EDF0ED] hover:bg-[#1A2732] transition-colors rounded-sm"
            title="Zoom In"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              if (viewMode === '3d') zoomOutRef.current?.();
              else cyRef.current?.zoom(cyRef.current.zoom() * 0.8);
            }}
            className="p-1.5 text-[#8A99A8] hover:text-[#EDF0ED] hover:bg-[#1A2732] transition-colors rounded-sm"
            title="Zoom Out"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              if (viewMode === '3d') resetFitRef.current?.();
              else cyRef.current?.fit(undefined, 35);
            }}
            className="p-1.5 text-[#8A99A8] hover:text-[#EDF0ED] hover:bg-[#1A2732] transition-colors rounded-sm"
            title="Fit Entire Topology"
            aria-label="Fit graph"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              if (viewMode === '3d') resetFitRef.current?.();
              else cyRef.current?.layout({ name: 'cose', animate: true, animationDuration: 350 }).run();
            }}
            className="p-1.5 text-[#8A99A8] hover:text-[#EDF0ED] hover:bg-[#1A2732] transition-colors rounded-sm"
            title="Reset Graph Orientation"
            aria-label="Reset layout"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Main Mount Canvases ───────────────────────────────────── */}
      {viewMode === '3d' ? (
        <div ref={mount3DRef} className="w-full flex-1 relative z-0 overflow-hidden cursor-grab active:cursor-grabbing" />
      ) : (
        <div ref={cyContainerRef} className="w-full flex-1 relative z-0" />
      )}

      {/* ── Hover Tooltip Card ────────────────────────────────────── */}
      {hoveredNode && tooltipPos && (
        <div
          className="fixed z-50 pointer-events-none bg-[#101923]/95 backdrop-blur-md border border-[#2B3941] p-2.5 rounded-sm shadow-2xl text-xs font-mono max-w-xs transition-opacity duration-100"
          style={{
            left: Math.min(window.innerWidth - 260, tooltipPos.x + 16),
            top: Math.min(window.innerHeight - 140, tooltipPos.y + 16),
          }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: hoveredNode.color }}
            />
            <span className="text-[10px] uppercase font-bold text-[#8A99A8]">
              {hoveredNode.nodeType}
            </span>
          </div>
          <div className="text-[#EDF0ED] font-semibold text-xs truncate">
            {hoveredNode.label}
          </div>
          <div className="text-[10px] text-[#6B7A85] mt-0.5">
            ID: {hoveredNode.id}
          </div>
          {hoveredNode.isAttackPath && (
            <div className="mt-1 text-[10px] text-[#D85E61] font-semibold flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" />
              <span>Confirmed Threat Pivot</span>
            </div>
          )}
        </div>
      )}

      {/* ── Understated Minimal Legend Bar ────────────────────────── */}
      <div className="absolute bottom-3 left-3 z-10 hidden lg:flex items-center gap-3.5 pointer-events-auto bg-[#101923]/92 backdrop-blur-md px-3 py-1.5 rounded-sm border border-[#1E2D38] text-[11px] font-mono shadow-xl">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#79D8D0]" />
          <span className="text-[#8A99A8]">Identity</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm bg-[#D8C99A]" />
          <span className="text-[#8A99A8]">Device</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rotate-45 bg-[#CC805E]" />
          <span className="text-[#8A99A8]">Event / Asset</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#D85E61]" />
          <span className="text-[#8A99A8]">Threat / Alert</span>
        </div>
      </div>

      {/* ── Selected Entity Quick Inspector Strip ─────────────────── */}
      {selectedNode && (
        <div className="absolute bottom-3 left-3 right-3 lg:left-auto lg:right-3 z-10 pointer-events-auto bg-[#101923]/95 backdrop-blur-md border border-[#2B3941] p-3 rounded-sm flex items-center justify-between gap-4 text-xs font-mono shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="badge-tag border border-[#79D8D0]/30 bg-[#79D8D0]/10 text-[#79D8D0] text-[10px]">
              {selectedNode._label || 'ENTITY'}
            </span>
            <span className="text-[#EDF0ED] font-semibold truncate max-w-[200px]">
              {(selectedNode.hostname as string) || (selectedNode.name as string) || (selectedNode.title as string) || (selectedNode.address as string) || selectedNode.id}
            </span>
            <span className="text-[#6B7A85] text-[11px] hidden sm:inline">[{selectedNode.id}]</span>
          </div>
          <div className="text-[11px] text-[#8A99A8] flex-shrink-0">
            <span>Click canvas background to deselect</span>
          </div>
        </div>
      )}
    </div>
  );
}
