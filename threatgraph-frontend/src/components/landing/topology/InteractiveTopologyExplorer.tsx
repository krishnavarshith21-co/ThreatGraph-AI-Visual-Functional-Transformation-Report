import { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { HERO_NODES, HERO_EDGES } from '../hero/heroData';
import type { HeroNode, HeroEdge } from '../hero/heroTypes';
import { ZoomIn, ZoomOut, RotateCcw, Activity } from 'lucide-react';

interface InteractiveTopologyExplorerProps {
  selectedNode: HeroNode | null;
  onSelectNode: (node: HeroNode | null) => void;
  activeFilter: string;
  isolateAttackPath: boolean;
  viewMode: '3d' | '2d';
  className?: string;
}

export function InteractiveTopologyExplorer({
  selectedNode,
  onSelectNode,
  activeFilter,
  isolateAttackPath,
  viewMode,
  className = '',
}: InteractiveTopologyExplorerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const graphGroupRef = useRef<THREE.Group | null>(null);

  const [hoveredNode, setHoveredNode] = useState<HeroNode | null>(null);

  // Filtered nodes
  const filteredNodes = useMemo(() => {
    return HERO_NODES.filter((n: HeroNode) => {
      if (isolateAttackPath && !n.isAttackPath) return false;
      if (activeFilter === 'All') return true;
      return n.type === activeFilter;
    });
  }, [activeFilter, isolateAttackPath]);

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
    const height = mount.clientHeight || 580;

    // ── Scene Setup ──────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x070B14, 0.012);

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 500);
    cameraRef.current = camera;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x070B14, 1);
    rendererRef.current = renderer;
    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);

    // ── Lighting ─────────────────────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0xE2E8F0, 0.75);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0x38BDF8, 1.2);
    keyLight.position.set(10, 16, 12);
    scene.add(keyLight);

    const amberFill = new THREE.DirectionalLight(0xD9C18A, 0.6);
    amberFill.position.set(-10, -8, 6);
    scene.add(amberFill);

    const redThreatLight = new THREE.DirectionalLight(0xDC666B, 0.8);
    redThreatLight.position.set(14, 4, 10);
    scene.add(redThreatLight);

    // ── Architectural Floor Grid ─────────────────────────────────
    const gridHelper = new THREE.GridHelper(36, 24, 0x1E2D38, 0x0D1722);
    gridHelper.position.y = -4.2;
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.45;
    scene.add(gridHelper);

    // ── Graph Scene Group ────────────────────────────────────────
    const graphGroup = new THREE.Group();
    graphGroupRef.current = graphGroup;
    scene.add(graphGroup);

    // ── Calculate Visible Bounds & Responsive Auto-Framing ──────
    const bbox = new THREE.Box3();
    if (filteredNodes.length > 0) {
      filteredNodes.forEach((n: HeroNode) => {
        bbox.expandByPoint(new THREE.Vector3(n.position[0], n.position[1], n.position[2]));
      });
    } else {
      bbox.set(new THREE.Vector3(-6, -2, 0), new THREE.Vector3(6, 2, 0));
    }

    const center = new THREE.Vector3();
    bbox.getCenter(center);
    const size = new THREE.Vector3();
    bbox.getSize(size);

    graphGroup.position.set(-center.x, -center.y, 0);

    const fitCamera = (w: number, h: number) => {
      const aspect = w / h;
      camera.aspect = aspect;
      camera.updateProjectionMatrix();

      const fovRad = (camera.fov * Math.PI) / 180;
      const tanHalf = Math.tan(fovRad * 0.5);

      const margin = 1.18;
      const distY = (Math.max(size.y, 3.5) * 0.5 * margin) / tanHalf;
      const distX = (Math.max(size.x, 7.0) * 0.5 * margin) / (tanHalf * aspect);
      const targetDist = Math.max(distY, distX, 7.5);

      camera.position.set(0, 0.4, targetDist);
      camera.lookAt(0, 0, 0);
    };

    fitCamera(width, height);

    // ── Build 3D Geometric Nodes ────────────────────────────────
    const nodeMeshMap = new Map<string, THREE.Mesh>();
    const interactiveMeshes: THREE.Mesh[] = [];

    const hexGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 6);
    const boxGeo = new THREE.BoxGeometry(0.68, 0.48, 0.42);
    const octaGeo = new THREE.OctahedronGeometry(0.42, 0);
    const sphereGeo = new THREE.SphereGeometry(0.38, 16, 16);
    const capsuleGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.58, 12);

    const hexEdges = new THREE.EdgesGeometry(hexGeo);
    const boxEdges = new THREE.EdgesGeometry(boxGeo);
    const octaEdges = new THREE.EdgesGeometry(octaGeo);
    const capsuleEdges = new THREE.EdgesGeometry(capsuleGeo);

    filteredNodes.forEach((node: HeroNode) => {
      let geo: THREE.BufferGeometry = hexGeo;
      let edgesGeo: THREE.BufferGeometry = hexEdges;

      switch (node.type) {
        case 'Device':
          geo = boxGeo;
          edgesGeo = boxEdges;
          break;
        case 'Event':
          geo = octaGeo;
          edgesGeo = octaEdges;
          break;
        case 'Resource':
          geo = capsuleGeo;
          edgesGeo = capsuleEdges;
          break;
        case 'IPAddress':
          geo = octaGeo;
          edgesGeo = octaEdges;
          break;
        default:
          geo = hexGeo;
          edgesGeo = hexEdges;
      }

      const nodeColor = node.color || (node.isAttackPath ? '#DC666B' : '#38BDF8');

      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(nodeColor),
        roughness: 0.25,
        metalness: 0.35,
        emissive: new THREE.Color(nodeColor),
        emissiveIntensity: node.isAttackPath ? 0.4 : 0.12,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(node.position[0], node.position[1], node.position[2]);
      mesh.userData = { node };

      const wireMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(nodeColor),
        transparent: true,
        opacity: 0.85,
      });
      const wireframe = new THREE.LineSegments(edgesGeo, wireMat);
      mesh.add(wireframe);

      const dotGeo = new THREE.SphereGeometry(0.08, 8, 8);
      const dotMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(nodeColor) });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.position.set(0, 0.36, 0);
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

    const beadGeo = new THREE.SphereGeometry(0.12, 8, 8);

    filteredEdges.forEach((edge: HeroEdge) => {
      const srcMesh = nodeMeshMap.get(edge.source);
      const tgtMesh = nodeMeshMap.get(edge.target);
      if (!srcMesh || !tgtMesh) return;

      const points = [srcMesh.position.clone(), tgtMesh.position.clone()];
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);

      const isAttack = edge.isAttackPath;
      const lineColor = isAttack ? 0xDC666B : 0x1E2D38;

      const lineMat = new THREE.LineBasicMaterial({
        color: lineColor,
        transparent: true,
        opacity: isAttack ? 0.95 : 0.45,
      });

      const line = new THREE.Line(lineGeo, lineMat);
      graphGroup.add(line);

      if (isAttack) {
        const beadMat = new THREE.MeshBasicMaterial({ color: 0xDC666B });
        const bead = new THREE.Mesh(beadGeo, beadMat);
        bead.position.copy(srcMesh.position);
        graphGroup.add(bead);

        pulseBeads.push({
          mesh: bead,
          start: srcMesh.position.clone(),
          end: tgtMesh.position.clone(),
          speed: 0.012 + Math.random() * 0.006,
          progress: Math.random(),
          isAttack: true,
        });
      }
    });

    // ── Raycasting & Mouse Navigation ────────────────────────────
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const onPointerDown = (e: MouseEvent) => {
      isDragging = true;
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
        graphGroup.rotation.x = Math.max(-0.5, Math.min(0.5, graphGroup.rotation.x));
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
        const node = hit.userData.node as HeroNode;
        onSelectNode(node);
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 1.08 : 0.92;
      camera.position.z = Math.max(5.0, Math.min(30.0, camera.position.z * zoomFactor));
    };

    mount.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    mount.addEventListener('click', onClick);
    mount.addEventListener('wheel', onWheel, { passive: false });

    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (selectedNode) {
        const selMesh = nodeMeshMap.get(selectedNode.id);
        if (selMesh) {
          const targetWorld = selMesh.position.clone().add(graphGroup.position);
          camera.lookAt(targetWorld.x * 0.4, targetWorld.y * 0.4, 0);
        }
      } else {
        camera.lookAt(0, 0, 0);
      }

      nodeMeshMap.forEach((mesh, id) => {
        const isSelected = selectedNode?.id === id;
        const isHovered = hoveredNode?.id === id;
        const mat = mesh.material as THREE.MeshStandardMaterial;

        if (isSelected) {
          mat.emissiveIntensity = 0.85;
          mesh.scale.set(1.25, 1.25, 1.25);
        } else if (isHovered) {
          mat.emissiveIntensity = 0.55;
          mesh.scale.set(1.15, 1.15, 1.15);
        } else {
          mat.emissiveIntensity = mesh.userData.node.isAttackPath ? 0.35 : 0.12;
          mesh.scale.set(1.0, 1.0, 1.0);
        }

        mesh.rotation.y += 0.003;
      });

      pulseBeads.forEach((bead) => {
        bead.progress += bead.speed;
        if (bead.progress > 1.0) bead.progress = 0.0;
        bead.mesh.position.lerpVectors(bead.start, bead.end, bead.progress);
      });

      renderer.render(scene, camera);
    };

    animate();

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
      sphereGeo.dispose();
      capsuleGeo.dispose();
      beadGeo.dispose();
      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, [viewMode, filteredNodes, filteredEdges, selectedNode, hoveredNode, onSelectNode]);

  const handleResetCamera = () => {
    if (cameraRef.current && graphGroupRef.current) {
      graphGroupRef.current.rotation.set(0, 0, 0);
      cameraRef.current.position.set(0, 0.4, 11.5);
      cameraRef.current.lookAt(0, 0, 0);
    }
  };

  const handleZoom = (direction: 'in' | 'out') => {
    if (cameraRef.current) {
      const factor = direction === 'in' ? 0.82 : 1.18;
      cameraRef.current.position.z = Math.max(5.0, Math.min(30.0, cameraRef.current.position.z * factor));
    }
  };

  return (
    <div className={`relative w-full h-full min-h-[520px] sm:min-h-[600px] bg-[#070B14] select-none ${className}`}>
      {viewMode === '3d' ? (
        <div ref={mountRef} className="w-full h-full min-h-[520px] sm:min-h-[600px]" />
      ) : (
        <div className="w-full h-full min-h-[520px] sm:min-h-[600px] flex items-center justify-center p-6 bg-[#070B14]">
          <svg className="w-full h-full max-h-[520px]" viewBox="-10 -4 20 8">
            {filteredEdges.map((edge: HeroEdge, idx: number) => {
              const src = filteredNodes.find((n: HeroNode) => n.id === edge.source);
              const tgt = filteredNodes.find((n: HeroNode) => n.id === edge.target);
              if (!src || !tgt) return null;
              return (
                <line
                  key={idx}
                  x1={src.position[0]}
                  y1={-src.position[1]}
                  x2={tgt.position[0]}
                  y2={-tgt.position[1]}
                  stroke={edge.isAttackPath ? '#DC666B' : '#1E2D38'}
                  strokeWidth={edge.isAttackPath ? 0.08 : 0.03}
                  strokeDasharray={edge.isAttackPath ? '0.2, 0.1' : undefined}
                />
              );
            })}
            {filteredNodes.map((node: HeroNode) => {
              const isSelected = selectedNode?.id === node.id;
              return (
                <g
                  key={node.id}
                  transform={`translate(${node.position[0]}, ${-node.position[1]})`}
                  onClick={() => onSelectNode(node)}
                  className="cursor-pointer"
                >
                  <circle
                    r={isSelected ? 0.45 : 0.32}
                    fill="#0B1525"
                    stroke={node.color || (node.isAttackPath ? '#DC666B' : '#38BDF8')}
                    strokeWidth={isSelected ? 0.08 : 0.04}
                  />
                  <text
                    y={0.55}
                    fontSize={0.22}
                    fill="#F3F4F0"
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    {node.label.split(' ')[0]}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {/* Floating Viewport Camera Action Controls */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1 bg-[#09111A]/90 backdrop-blur-md p-1 rounded-lg border border-[#1E2D38] shadow-2xl">
        <button
          onClick={() => handleZoom('in')}
          className="p-1.5 rounded hover:bg-[#122338] text-[#94A3B8] hover:text-[#38BDF8] transition-colors cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => handleZoom('out')}
          className="p-1.5 rounded hover:bg-[#122338] text-[#94A3B8] hover:text-[#38BDF8] transition-colors cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleResetCamera}
          className="p-1.5 rounded hover:bg-[#122338] text-[#94A3B8] hover:text-[#38BDF8] transition-colors cursor-pointer"
          title="Reset Camera Framing"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Bottom Telemetry Pill */}
      <div className="absolute bottom-4 inset-x-4 z-20 flex items-center justify-between gap-3 pointer-events-none">
        <div className="bg-[#09111A]/90 backdrop-blur-md px-3.5 py-1.5 rounded-lg border border-[#1E2D38] pointer-events-auto flex items-center gap-2 font-mono text-[11px] shadow-lg">
          <span className="w-2 h-2 rounded-full bg-[#38BDF8] animate-pulse" />
          <span className="text-[#F3F4F0] font-medium">{selectedNode?.label || 'Select an entity node'}</span>
          {selectedNode?.id && (
            <span className="text-[10px] text-[#64748B]">[{selectedNode.id}]</span>
          )}
          {selectedNode?.isAttackPath && (
            <span className="text-[9px] font-bold text-[#DC666B] bg-[#DC666B]/15 px-2 py-0.5 rounded border border-[#DC666B]/30 uppercase ml-1">
              Attack Path Pivot
            </span>
          )}
        </div>

        <div className="bg-[#09111A]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#1E2D38] hidden sm:flex items-center gap-2 font-mono text-[10px] text-[#64748B] shadow-lg">
          <Activity className="w-3 h-3 text-[#38BDF8]" />
          <span>Left-Drag: Orbit &bull; Scroll: Zoom &bull; Click Node: Inspect</span>
        </div>
      </div>
    </div>
  );
}
