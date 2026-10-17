'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import type { HeroNode, HeroEdge } from './heroTypes';
import { HERO_NODES, HERO_EDGES, HERO_INVESTIGATION_STAGES, HERO_PALETTE } from './heroData';
import {
  createInfrastructureMaterials,
  createClusterPlatform,
  createDatabaseClusterMatrix,
  createAnalystWorkstation,
  createExternalThreatCluster,
  createDualWorkstationFleet,
} from './models/infrastructureModels';
import { createHolographicIntelligenceCore } from './models/holographicCoreModel';
import { createNetworkPathways, type PhysicalConduit, type PhotonPacket } from './models/networkPathwaysModel';
import {
  Shield,
  Key,
  Network,
  Database,
  Monitor,
  Globe,
  Play,
  Pause,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';

interface CinematicCyberSceneProps {
  selectedNode: HeroNode | null;
  onSelectNode: (node: HeroNode | null) => void;
  hoveredNode: HeroNode | null;
  onHoverNode: (node: HeroNode | null) => void;
  activeStage: 1 | 2 | 3 | 4 | 5;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onResetViewRef?: (fn: () => void) => void;
  onZoomInRef?: (fn: () => void) => void;
  onZoomOutRef?: (fn: () => void) => void;
  className?: string;
}

interface ClusterBadgeDef {
  id: string;
  title: string;
  subtitle: string;
  icon: 'shield' | 'idp' | 'network' | 'database' | 'endpoint' | 'threat';
  worldPos: THREE.Vector3;
  nodeId: string;
  isThreat?: boolean;
}

const CLUSTER_BADGES: ClusterBadgeDef[] = [
  {
    id: 'badge-idp',
    title: 'Identity Provider',
    subtitle: 'Okta • IAM',
    icon: 'idp',
    worldPos: new THREE.Vector3(-5.6, 3.8, -4.2),
    nodeId: 'dev-srv-ad',
  },
  {
    id: 'badge-corp',
    title: 'Corporate Network',
    subtitle: 'Internal Resources',
    icon: 'network',
    worldPos: new THREE.Vector3(3.0, 4.2, -6.5),
    nodeId: 'dev-srv-admin',
  },
  {
    id: 'badge-core',
    title: 'ThreatGraph AI',
    subtitle: 'Graph Intelligence Core',
    icon: 'shield',
    worldPos: new THREE.Vector3(0.8, 4.8, 0.4),
    nodeId: 'evt-rdp-lateral',
  },
  {
    id: 'badge-db',
    title: 'Database Cluster',
    subtitle: 'PostgreSQL • Production',
    icon: 'database',
    worldPos: new THREE.Vector3(8.8, 3.8, -1.8),
    nodeId: 'res-db-customers',
  },
  {
    id: 'badge-endpoint',
    title: 'Endpoint Fleet',
    subtitle: 'Workstations • EDR',
    icon: 'endpoint',
    worldPos: new THREE.Vector3(-2.8, 2.8, 3.8),
    nodeId: 'usr-mchen',
  },
  {
    id: 'badge-threat',
    title: 'External Threat',
    subtitle: 'TOR Exit Node',
    icon: 'threat',
    worldPos: new THREE.Vector3(8.4, 3.4, 5.6),
    nodeId: 'ip-c2-tor',
    isThreat: true,
  },
];

export function CinematicCyberScene({
  selectedNode,
  onSelectNode,
  hoveredNode: _hoveredNode,
  onHoverNode,
  activeStage,
  isPlaying,
  onTogglePlay,
  onResetViewRef,
  onZoomInRef,
  onZoomOutRef,
  className = '',
}: CinematicCyberSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [webglSupported, setWebglSupported] = useState(true);

  // Badge DOM references for high-performance 60fps screen projection
  const badgeRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // References for live animation loop
  const isPlayingRef = useRef(isPlaying);
  const activeStageRef = useRef(activeStage);
  const selectedNodeRef = useRef(selectedNode);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    activeStageRef.current = activeStage;
  }, [activeStage]);

  useEffect(() => {
    selectedNodeRef.current = selectedNode;
  }, [selectedNode]);

  // Object references for interactive highlights
  const interactableMeshesRef = useRef<{
    mesh: THREE.Object3D;
    node: HeroNode;
    highlightGlow?: THREE.Mesh | THREE.LineSegments | THREE.Group;
    pointLight?: THREE.PointLight;
    focusPosition: THREE.Vector3;
  }[]>([]);

  const conduitsRef = useRef<PhysicalConduit[]>([]);

  // Camera animation target refs for smooth easing focus
  const cameraTargetLookAtRef = useRef<THREE.Vector3>(new THREE.Vector3(1.2, 1.4, 0.5));

  // Synchronize highlights with active stage and selected node
  useEffect(() => {
    const stage = activeStage;
    const selectedId = selectedNode?.id;

    interactableMeshesRef.current.forEach(({ node, highlightGlow, pointLight, focusPosition }) => {
      const isSelected = selectedId === node.id;
      const isStageActive = node.isAttackPath && (node.stageNumber ?? 99) <= stage;

      if (highlightGlow) {
        highlightGlow.visible = isSelected || isStageActive;
        if (isSelected) {
          highlightGlow.scale.setScalar(1.22);
        } else {
          highlightGlow.scale.setScalar(1.0);
        }
      }

      if (pointLight) {
        pointLight.intensity = isSelected ? 3.6 : isStageActive ? 2.2 : 0.65;
      }

      // Smoothly adjust camera focus toward selected entity
      if (isSelected) {
        cameraTargetLookAtRef.current.copy(focusPosition);
      }
    });

    conduitsRef.current.forEach((conduit) => {
      const isTraversed = stage >= 3;
      if ('material' in conduit.innerCore) {
        const mat = conduit.innerCore.material as THREE.Material;
        if ('opacity' in mat) {
          mat.opacity = isTraversed ? 1.0 : 0.65;
        }
      }
    });
  }, [selectedNode, activeStage]);

  // Fullscreen toggle handler
  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // ── Main Three.js Lifecycle ──────────────────────────────────────────
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ── 1. Scene & Deep Cyber Atmosphere Fog ───────────────────────────
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x060A0F, 0.014);

    const width = mount.clientWidth || 1200;
    const height = mount.clientHeight || 700;

    // Calibrated Isometric Perspective Camera (25° FOV)
    const camera = new THREE.PerspectiveCamera(25, width / height, 0.5, 350);
    const defaultCamPos = new THREE.Vector3(25, 21, 25);
    const defaultLookAt = new THREE.Vector3(1.2, 1.4, 0.5);

    camera.position.copy(defaultCamPos);
    camera.lookAt(defaultLookAt);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglSupported(false);
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x060A0F, 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    mount.appendChild(renderer.domElement);

    // ── 2. Cinematic Architectural Lighting ───────────────────────────
    const ambientLight = new THREE.AmbientLight(0x101C2B, 2.6);
    scene.add(ambientLight);

    // Cool key directional light casting soft shadows
    const keyLight = new THREE.DirectionalLight(0x83DCE8, 3.4);
    keyLight.position.set(-20, 32, 18);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    // Warm amber secondary fill from right side
    const amberFill = new THREE.DirectionalLight(0xD8AE69, 1.4);
    amberFill.position.set(24, 18, -14);
    scene.add(amberFill);

    // Low angle electric cyan rim light
    const cyanRim = new THREE.DirectionalLight(0x46D7F5, 1.8);
    cyanRim.position.set(14, 6, 20);
    scene.add(cyanRim);

    // Sinister red fill from bottom-right (External Threat bounce)
    const redThreatFill = new THREE.DirectionalLight(0xF05261, 1.6);
    redThreatFill.position.set(16, 8, 14);
    scene.add(redThreatFill);

    // ── 3. Subdued Dark Industrial Floor with Subtle Grid ──────────────
    const floorGroup = new THREE.Group();
    scene.add(floorGroup);

    const floorGeo = new THREE.PlaneGeometry(80, 80);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x070A10,
      roughness: 0.28,
      metalness: 0.82,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -0.05;
    floorMesh.receiveShadow = true;
    floorGroup.add(floorMesh);

    // Subdued, ultra-fine seam lines
    const gridHelper = new THREE.GridHelper(64, 32, 0x141F2B, 0x0B121A);
    gridHelper.position.y = 0.005;
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.35;
    floorGroup.add(gridHelper);

    // ── 4. Build Infrastructure Components from Modular Models ────────
    const infraMats = createInfrastructureMaterials();
    const interactableObjects: {
      mesh: THREE.Object3D;
      node: HeroNode;
      highlightGlow?: THREE.Mesh | THREE.LineSegments | THREE.Group;
      pointLight?: THREE.PointLight;
      focusPosition: THREE.Vector3;
    }[] = [];

    // Cluster 1: Identity Provider (Okta • IAM) [Top-Left]
    const idpCluster = createClusterPlatform(-5.6, -4.2, 3.4, 3.4, 2, 2, 'compute', infraMats, false);
    const idpNode = HERO_NODES.find((n) => n.id === 'dev-srv-ad') || HERO_NODES[1];
    (idpCluster as any).userData = { node: idpNode };
    scene.add(idpCluster);

    const idpLight = new THREE.PointLight(0x46D7F5, 2.5, 10, 1.4);
    idpLight.position.set(-5.6, 2.8, -4.2);
    scene.add(idpLight);

    interactableObjects.push({
      mesh: idpCluster,
      node: idpNode,
      pointLight: idpLight,
      focusPosition: new THREE.Vector3(-5.6, 1.4, -4.2),
    });

    // Cluster 2: Corporate Network (Internal Resources) [Top-Center]
    const corpCluster = createClusterPlatform(3.0, -6.5, 4.8, 3.4, 2, 3, 'compute', infraMats, false);
    const corpNode = HERO_NODES.find((n) => n.id === 'dev-srv-admin') || HERO_NODES[2];
    (corpCluster as any).userData = { node: corpNode };
    scene.add(corpCluster);

    const corpLight = new THREE.PointLight(0x46D7F5, 2.8, 12, 1.4);
    corpLight.position.set(3.0, 3.0, -6.5);
    scene.add(corpLight);

    interactableObjects.push({
      mesh: corpCluster,
      node: corpNode,
      pointLight: corpLight,
      focusPosition: new THREE.Vector3(3.0, 1.4, -6.5),
    });

    // Cluster 3: Database Cluster (PostgreSQL • Production) [Far-Right]
    const dbCluster = createDatabaseClusterMatrix(8.8, -1.8, infraMats);
    const dbNode = HERO_NODES.find((n) => n.id === 'res-db-customers') || HERO_NODES[6];
    (dbCluster as any).userData = { node: dbNode };
    scene.add(dbCluster);

    const dbLight = new THREE.PointLight(0xD8AE69, 3.0, 10, 1.4);
    dbLight.position.set(8.8, 2.8, -1.8);
    scene.add(dbLight);

    interactableObjects.push({
      mesh: dbCluster,
      node: dbNode,
      pointLight: dbLight,
      focusPosition: new THREE.Vector3(8.8, 1.4, -1.8),
    });

    // Cluster 4: Endpoint Fleet (Workstations • EDR) [Bottom-Left]
    const fleetCluster = createDualWorkstationFleet(-2.8, 3.8, infraMats);
    const fleetNode = HERO_NODES.find((n) => n.id === 'usr-mchen') || HERO_NODES[0];
    (fleetCluster as any).userData = { node: fleetNode };
    scene.add(fleetCluster);

    const fleetLight = new THREE.PointLight(0x46D7F5, 2.5, 9, 1.4);
    fleetLight.position.set(-2.8, 2.2, 3.8);
    scene.add(fleetLight);

    interactableObjects.push({
      mesh: fleetCluster,
      node: fleetNode,
      pointLight: fleetLight,
      focusPosition: new THREE.Vector3(-2.8, 1.2, 3.8),
    });

    // Cluster 5: External Threat (TOR Exit Node) [Bottom-Right] — CRIMSON RED
    const threatCluster = createExternalThreatCluster(8.4, 5.6, infraMats);
    const threatNode = HERO_NODES.find((n) => n.id === 'ip-c2-tor') || HERO_NODES[9];
    (threatCluster as any).userData = { node: threatNode };
    scene.add(threatCluster);

    const threatLight = new THREE.PointLight(0xF05261, 3.2, 12, 1.2);
    threatLight.position.set(8.4, 2.6, 5.6);
    scene.add(threatLight);

    interactableObjects.push({
      mesh: threatCluster,
      node: threatNode,
      pointLight: threatLight,
      focusPosition: new THREE.Vector3(8.4, 1.4, 5.6),
    });

    // ── 5. Central Holographic Intelligence Core (ThreatGraph AI) ──────
    const holoCore = createHolographicIntelligenceCore();
    holoCore.group.position.set(0.8, 0, 0.4);
    const centralNode = HERO_NODES.find((n) => n.id === 'evt-rdp-lateral') || HERO_NODES[4];
    (holoCore.group as any).userData = { node: centralNode };
    scene.add(holoCore.group);

    interactableObjects.push({
      mesh: holoCore.group,
      node: centralNode,
      highlightGlow: holoCore.reticle,
      pointLight: holoCore.centralLight,
      focusPosition: new THREE.Vector3(0.8, 2.0, 0.4),
    });

    // ── 6. Physical Conduits & Flowing Pathways ────────────────────────
    const networkSystem = createNetworkPathways();
    scene.add(networkSystem.pathwaysGroup);
    conduitsRef.current = networkSystem.physicalConduits;

    interactableMeshesRef.current = interactableObjects;

    // ── 7. Interactive Orbit Controls & Raycasting ─────────────────────
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-1000, -1000);

    let isDragging = false;
    let prevPointerX = 0;
    let prevPointerY = 0;
    let targetAzimuth = Math.PI / 4;
    let targetElevation = 0.65;
    let currentDistance = 35;
    let minDistance = 18;
    let maxDistance = 60;

    const currentLookAt = new THREE.Vector3().copy(defaultLookAt);

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      // Don't drag if clicking directly on an overlay button or badge
      if ((e.target as HTMLElement)?.closest('.hud-overlay')) return;
      isDragging = true;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      prevPointerX = clientX;
      prevPointerY = clientY;
    };

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      if (isDragging) {
        const dx = clientX - prevPointerX;
        const dy = clientY - prevPointerY;
        prevPointerX = clientX;
        prevPointerY = clientY;

        targetAzimuth -= dx * 0.005;
        targetElevation = Math.max(0.25, Math.min(1.15, targetElevation + dy * 0.004));
      } else {
        raycaster.setFromCamera(mouse, camera);
        const intersectable = interactableObjects.map((item) => item.mesh);
        const intersects = raycaster.intersectObjects(intersectable, true);

        if (intersects.length > 0) {
          let obj: THREE.Object3D | null = intersects[0].object;
          let foundNode: HeroNode | null = null;
          while (obj) {
            if ((obj as any).userData?.node) {
              foundNode = (obj as any).userData.node;
              break;
            }
            obj = obj.parent;
          }
          if (foundNode) {
            onHoverNode(foundNode);
            renderer.domElement.style.cursor = 'pointer';
          }
        } else {
          onHoverNode(null);
          renderer.domElement.style.cursor = isDragging ? 'grabbing' : 'default';
        }
      }
    };

    const onPointerUp = () => {
      isDragging = false;
      if (renderer.domElement) {
        renderer.domElement.style.cursor = 'default';
      }
    };

    const onCanvasClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement)?.closest('.hud-overlay')) return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersectable = interactableObjects.map((item) => item.mesh);
      const intersects = raycaster.intersectObjects(intersectable, true);

      if (intersects.length > 0) {
        let obj: THREE.Object3D | null = intersects[0].object;
        let foundNode: HeroNode | null = null;
        while (obj) {
          if ((obj as any).userData?.node) {
            foundNode = (obj as any).userData.node;
            break;
          }
          obj = obj.parent;
        }
        if (foundNode) {
          onSelectNode(foundNode);
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > 0) {
        currentDistance = Math.min(Math.max(currentDistance + e.deltaY * 0.03, minDistance), maxDistance);
      }
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    domEl.addEventListener('click', onCanvasClick);
    domEl.addEventListener('wheel', onWheel, { passive: true });

    domEl.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('touchend', onPointerUp, { passive: true });

    // Expose control callbacks
    if (onResetViewRef) {
      onResetViewRef(() => {
        targetAzimuth = Math.PI / 4;
        targetElevation = 0.65;
        currentDistance = 35;
        cameraTargetLookAtRef.current.copy(defaultLookAt);
      });
    }

    if (onZoomInRef) {
      onZoomInRef(() => {
        currentDistance = Math.max(currentDistance * 0.85, minDistance);
      });
    }

    if (onZoomOutRef) {
      onZoomOutRef(() => {
        currentDistance = Math.min(currentDistance * 1.15, maxDistance);
      });
    }

    // ── 8. ResizeObserver ─────────────────────────────────────────────
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        if (w > 0 && h > 0) {
          renderer.setSize(w, h);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        }
      }
    });
    resizeObserver.observe(mount);

    // ── 9. Render & Animation Loop ───────────────────────────────────
    let animId: number;
    const tempProjVec = new THREE.Vector3();

    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Smooth camera position and lookAt interpolation
      const targetX = currentDistance * Math.cos(targetElevation) * Math.sin(targetAzimuth);
      const targetY = currentDistance * Math.sin(targetElevation);
      const targetZ = currentDistance * Math.cos(targetElevation) * Math.cos(targetAzimuth);

      camera.position.x += (targetX - camera.position.x) * 0.05;
      camera.position.y += (targetY - camera.position.y) * 0.05;
      camera.position.z += (targetZ - camera.position.z) * 0.05;

      currentLookAt.lerp(cameraTargetLookAtRef.current, 0.04);
      camera.lookAt(currentLookAt);

      // Subtle slow internal processing rotation of inner floating core lattice only
      if (isPlayingRef.current) {
        holoCore.floatingLattice.rotation.y += 0.003;
        holoCore.floatingLattice.rotation.x += 0.0015;
      }

      // Animate flowing fiber optic photon pulses
      if (isPlayingRef.current && !prefersReducedMotion) {
        networkSystem.fiberPhotons.forEach((p) => {
          p.progress = (p.progress + p.speed) % 1;
          const pos = p.curve.getPointAt(p.progress);
          p.mesh.position.copy(pos);
        });

        // Pulsing core light
        const t = performance.now() * 0.0018;
        holoCore.centralLight.intensity = 4.2 + Math.sin(t) * 0.7;
      }

      renderer.render(scene, camera);

      // ── High-performance 60fps screen projection for HUD Badges ───
      const currentW = mount.clientWidth || 1200;
      const currentH = mount.clientHeight || 700;

      CLUSTER_BADGES.forEach((badge) => {
        const badgeEl = badgeRefs.current[badge.id];
        if (!badgeEl) return;

        tempProjVec.copy(badge.worldPos).project(camera);

        // Check if point is in front of camera
        if (tempProjVec.z < 1.0) {
          const sx = (tempProjVec.x * 0.5 + 0.5) * currentW;
          const sy = (-(tempProjVec.y * 0.5) + 0.5) * currentH;
          badgeEl.style.transform = `translate3d(${sx}px, ${sy}px, 0px) translate(-50%, -100%)`;
          badgeEl.style.opacity = '1';
        } else {
          badgeEl.style.opacity = '0';
        }
      });
    };

    animate();

    // ── 10. Resource Disposal ─────────────────────────────────────────
    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();

      domEl.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      domEl.removeEventListener('click', onCanvasClick);
      domEl.removeEventListener('wheel', onWheel);

      domEl.removeEventListener('touchstart', onPointerDown);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);

      interactableMeshesRef.current = [];
      conduitsRef.current = [];

      if (domEl.parentElement) {
        domEl.parentElement.removeChild(domEl);
      }
      renderer.dispose();
    };
  }, [onSelectNode, onHoverNode, onResetViewRef, onZoomInRef, onZoomOutRef]);

  // Badge click handler
  const handleBadgeClick = (nodeId: string) => {
    const node = HERO_NODES.find((n) => n.id === nodeId);
    if (node) {
      onSelectNode(node);
    }
  };

  // Render Icon helper for badges
  const renderBadgeIcon = (icon: ClusterBadgeDef['icon'], isThreat?: boolean) => {
    if (isThreat) {
      return <Globe className="w-4 h-4 text-[#F05261]" />;
    }
    switch (icon) {
      case 'shield':
        return <Shield className="w-4 h-4 text-[#46D7F5]" />;
      case 'idp':
        return <Key className="w-4 h-4 text-[#46D7F5]" />;
      case 'network':
        return <Network className="w-4 h-4 text-[#46D7F5]" />;
      case 'database':
        return <Database className="w-4 h-4 text-[#46D7F5]" />;
      case 'endpoint':
        return <Monitor className="w-4 h-4 text-[#46D7F5]" />;
      default:
        return <Shield className="w-4 h-4 text-[#46D7F5]" />;
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full h-full bg-[#060A0F] select-none overflow-hidden ${className}`}>
      {/* 3D Canvas Mount Point */}
      <div ref={mountRef} className="w-full h-full min-h-[500px] sm:min-h-[580px] lg:min-h-[640px]" />

      {/* ── 6 3D-Anchored Floating HUD Badges ────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
        {CLUSTER_BADGES.map((badge) => {
          const isSelected = selectedNode?.id === badge.nodeId;
          const isThreat = badge.isThreat;

          return (
            <div
              key={badge.id}
              ref={(el) => { badgeRefs.current[badge.id] = el; }}
              onClick={() => handleBadgeClick(badge.nodeId)}
              className={`absolute top-0 left-0 pointer-events-auto cursor-pointer transition-all duration-200 will-change-transform hud-overlay group ${
                isSelected ? 'scale-105 z-30' : 'hover:scale-105 z-20'
              }`}
              style={{
                transform: 'translate3d(-9999px, -9999px, 0px)',
                opacity: 0,
              }}
            >
              {/* Badge Glass Container */}
              <div
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg backdrop-blur-md transition-all shadow-2xl border ${
                  isThreat
                    ? isSelected
                      ? 'bg-[#1C0A10]/95 border-[#F05261] shadow-[0_0_24px_rgba(240,82,97,0.55)]'
                      : 'bg-[#14080D]/90 border-[#F05261]/60 hover:border-[#F05261] shadow-[0_4px_18px_rgba(240,82,97,0.25)]'
                    : badge.id === 'badge-core'
                    ? 'bg-[#0B1726]/95 border-[#46D7F5] shadow-[0_0_24px_rgba(70,215,245,0.45)]'
                    : isSelected
                    ? 'bg-[#0B1726]/95 border-[#46D7F5] shadow-[0_0_24px_rgba(70,215,245,0.45)]'
                    : 'bg-[#0B1522]/90 border-[#1E3042] hover:border-[#46D7F5]/70 shadow-[0_4px_20px_rgba(0,0,0,0.6)]'
                }`}
              >
                {/* Icon Squircle */}
                <div
                  className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 transition-colors ${
                    isThreat
                      ? 'bg-[#F05261]/15 border border-[#F05261]/40 group-hover:border-[#F05261]'
                      : 'bg-[#46D7F5]/10 border border-[#46D7F5]/30 group-hover:border-[#46D7F5]'
                  }`}
                >
                  {renderBadgeIcon(badge.icon, isThreat)}
                </div>

                {/* Typography */}
                <div className="flex flex-col text-left leading-tight pr-1">
                  <span className="text-[12px] font-semibold text-[#F3F5F7] tracking-tight group-hover:text-white transition-colors">
                    {badge.title}
                  </span>
                  <span
                    className={`text-[10px] font-mono tracking-tight ${
                      isThreat ? 'text-[#F05261]' : 'text-[#788B99] group-hover:text-[#46D7F5]'
                    }`}
                  >
                    {badge.subtitle}
                  </span>
                </div>
              </div>

              {/* Downward indicator anchor pointer */}
              <div className="w-full flex justify-center">
                <div
                  className={`w-1.5 h-1.5 rotate-45 -mt-0.5 border-r border-b ${
                    isThreat
                      ? 'bg-[#12080C] border-[#F05261]'
                      : 'bg-[#09121D] border-[#1E3042]'
                  }`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Top-Right HUD Controls matching Reference: [ || ] [ ↺ ] [ 🔍- ] [ 🔍+ ] [ ⛶ ] ── */}
      <div className="absolute top-4 right-4 z-30 hud-overlay">
        <div className="flex items-center gap-1.5 bg-[#09121D]/85 backdrop-blur-md border border-[#1A2732] rounded-lg p-1 shadow-2xl">
          <button
            onClick={onTogglePlay}
            className="p-1.5 rounded hover:bg-[#111B26] text-[#788B99] hover:text-[#46D7F5] transition-colors cursor-pointer"
            title={isPlaying ? 'Pause Simulation' : 'Play Simulation'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => onResetViewRef && onResetViewRef(() => {})}
            className="p-1.5 rounded hover:bg-[#111B26] text-[#788B99] hover:text-[#46D7F5] transition-colors cursor-pointer"
            title="Reset Camera View"
            aria-label="Reset View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-3.5 bg-[#1A2732] mx-0.5" />

          <button
            onClick={() => onZoomOutRef && onZoomOutRef(() => {})}
            className="p-1.5 rounded hover:bg-[#111B26] text-[#788B99] hover:text-[#46D7F5] transition-colors cursor-pointer"
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onZoomInRef && onZoomInRef(() => {})}
            className="p-1.5 rounded hover:bg-[#111B26] text-[#788B99] hover:text-[#46D7F5] transition-colors cursor-pointer"
            title="Zoom In"
            aria-label="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-3.5 bg-[#1A2732] mx-0.5" />

          <button
            onClick={handleToggleFullscreen}
            className="p-1.5 rounded hover:bg-[#111B26] text-[#788B99] hover:text-[#46D7F5] transition-colors cursor-pointer"
            title="Fullscreen"
            aria-label="Fullscreen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2D Fallback if WebGL unavailable */}
      {!webglSupported && (
        <div className="absolute inset-0 flex items-center justify-center p-6 bg-[#060A0F] text-[#46D7F5] font-mono text-xs text-center z-40">
          WebGL acceleration not detected. Please enable hardware acceleration in your browser to explore the 3D cyber infrastructure.
        </div>
      )}
    </div>
  );
}
