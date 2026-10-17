import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  Play, Pause, RotateCcw, ZoomIn, ZoomOut, Shield,
  Crosshair, Info
} from 'lucide-react';

export interface SecurityNode {
  id: string;
  label: string;
  type: 'User' | 'Device' | 'IPAddress' | 'Event' | 'Resource';
  position: [number, number, number];
  color: string;
  isAttackPath?: boolean;
  meta: Record<string, string>;
}

// ── Left-to-Right Cyber Investigation Scenario ──────────────────
// Initial suspicious event → affected device/account → privilege escalation → target resource exfiltration
export const TOPOLOGY_NODES: SecurityNode[] = [
  // ── Stage 1: Initial Ingress & Trigger (Leftmost: X ≈ -8.5 to -6.5) ──
  {
    id: 'ip-c2-tor',
    label: '185.220.101.42 (TOR C2)',
    type: 'IPAddress',
    position: [-8.5, 2.0, 0.0],
    color: '#D85E61',
    isAttackPath: true,
    meta: { classification: 'Known Hostile Exit Relay', threatLevel: 'Critical', asn: 'AS208294' }
  },
  {
    id: 'evt-phish-ingress',
    label: 'Spear Phishing Ingress',
    type: 'Event',
    position: [-6.4, 1.2, 0.4],
    color: '#CC805E',
    isAttackPath: true,
    meta: { technique: 'MITRE T1566.001', payload: 'invoice_march.pdf.exe', status: 'Ingress Verified' }
  },

  // ── Stage 2: Affected Endpoint & Account (Mid-Left: X ≈ -4.2 to -2.2) ──
  {
    id: 'usr-mchen',
    label: 'Marcus Chen',
    type: 'User',
    position: [-4.2, 0.2, 0.6],
    color: '#83CFE0',
    isAttackPath: true,
    meta: { role: 'Lead DevOps Engineer', department: 'Cloud Infrastructure', clearedAccess: 'High' }
  },
  {
    id: 'dev-laptop-mchen',
    label: 'LAPTOP-MCHEN',
    type: 'Device',
    position: [-2.4, -0.6, 0.2],
    color: '#83CFE0',
    isAttackPath: true,
    meta: { os: 'Windows 11 Enterprise', internalIp: '10.0.1.45', endpointAgent: 'EDR-Active' }
  },
  {
    id: 'ip-internal-eng',
    label: '10.0.1.45 (Workstation)',
    type: 'IPAddress',
    position: [-5.0, -2.4, -1.0],
    color: '#6B7A85',
    isAttackPath: false,
    meta: { segment: 'Engineering Subnet VLAN 10', mac: '00:1A:2B:3C:4D:5E' }
  },
  {
    id: 'ip-gateway',
    label: '10.0.0.1 (Perimeter Gateway)',
    type: 'IPAddress',
    position: [-4.0, 3.4, -1.2],
    color: '#6B7A85',
    isAttackPath: false,
    meta: { model: 'Palo Alto PA-5250', firmware: 'PAN-OS 11.1' }
  },

  // ── Stage 3: Credential Dumping & Privilege Escalation (Center: X ≈ -0.5 to +1.4) ──
  {
    id: 'evt-lsass-dump',
    label: 'LSASS Memory Dump',
    type: 'Event',
    position: [-0.4, 1.6, 0.3],
    color: '#D85E61',
    isAttackPath: true,
    meta: { technique: 'MITRE T1003.001', tool: 'procdump.exe', targetProcess: 'lsass.exe' }
  },
  {
    id: 'usr-admin-svc',
    label: 'admin-service',
    type: 'User',
    position: [1.2, 2.4, -0.4],
    color: '#D8C99A',
    isAttackPath: true,
    meta: { role: 'Privileged Service Account', scope: 'Domain Admins', mfaStatus: 'Bypassed' }
  },
  {
    id: 'res-vault-prod',
    label: 'Production Key Vault',
    type: 'Resource',
    position: [0.6, 4.0, -1.8],
    color: '#6B7A85',
    isAttackPath: false,
    meta: { type: 'HashiCorp Vault', sensitivity: 'Crown Jewel', secretsStored: 'AWS IAM / DB Keys' }
  },
  {
    id: 'dev-srv-ad',
    label: 'DC-PRIMARY-01',
    type: 'Device',
    position: [0.2, -2.2, -1.8],
    color: '#6B7A85',
    isAttackPath: false,
    meta: { role: 'Active Directory Domain Controller', forest: 'CORP.INTERNAL' }
  },
  {
    id: 'ip-dc-internal',
    label: '10.0.0.10 (Domain Controller)',
    type: 'IPAddress',
    position: [-1.6, -3.2, -2.0],
    color: '#6B7A85',
    isAttackPath: false,
    meta: { segment: 'Core Services VLAN' }
  },

  // ── Stage 4: Lateral Movement to Admin Jump Host (Mid-Right: X ≈ +3.0 to +4.5) ──
  {
    id: 'evt-rdp-lateral',
    label: 'Lateral RDP to SRV-ADMIN',
    type: 'Event',
    position: [3.0, 1.0, 0.2],
    color: '#CC805E',
    isAttackPath: true,
    meta: { technique: 'MITRE T1021.001', srcPort: '49821', dstPort: '3389' }
  },
  {
    id: 'dev-srv-admin',
    label: 'SRV-ADMIN-01',
    type: 'Device',
    position: [4.6, 0.2, -0.4],
    color: '#83CFE0',
    isAttackPath: true,
    meta: { os: 'Ubuntu 22.04 LTS', zone: 'Admin DMZ Segment', role: 'Bastion Jump Host' }
  },
  {
    id: 'evt-log-wipe',
    label: 'Audit Log Tamper Attempt',
    type: 'Event',
    position: [3.6, -1.6, -1.8],
    color: '#6B7A85',
    isAttackPath: false,
    meta: { command: 'systemctl stop auditd', outcome: 'Blocked by SELinux' }
  },

  // ── Stage 5: Target Database & Exfiltration (Rightmost: X ≈ +6.2 to +9.6) ──
  {
    id: 'evt-db-query',
    label: 'Bulk Customer DB Extraction',
    type: 'Event',
    position: [6.2, -1.0, 0.2],
    color: '#CC805E',
    isAttackPath: true,
    meta: { query: 'SELECT * FROM customers_pii', rowsExtracted: '14,820 Records' }
  },
  {
    id: 'dev-srv-db',
    label: 'SRV-DB-PROD-01',
    type: 'Device',
    position: [6.8, -2.4, -0.6],
    color: '#83CFE0',
    isAttackPath: true,
    meta: { engine: 'PostgreSQL 16 Cluster', storage: 'NVMe SAN Array', encryptedAtRest: 'True' }
  },
  {
    id: 'res-db-customers',
    label: 'Customer PII Records',
    type: 'Resource',
    position: [8.4, -1.8, 0.0],
    color: '#CC805E',
    isAttackPath: true,
    meta: { classification: 'GDPR / HIPAA Restricted', dataSize: '4.2 GB' }
  },
  {
    id: 'evt-exfil-stream',
    label: '4.2GB Encrypted Egress',
    type: 'Event',
    position: [7.8, 1.8, -0.4],
    color: '#D85E61',
    isAttackPath: true,
    meta: { protocol: 'HTTPS / TLS 1.3', outboundBytes: '4,294,967,296', destination: '91.219.236.18' }
  },
  {
    id: 'ip-c2-vpn',
    label: '91.219.236.18 (Exfil Drop)',
    type: 'IPAddress',
    position: [9.6, 2.6, -1.0],
    color: '#D85E61',
    isAttackPath: true,
    meta: { classification: 'Hostile Bulletproof Drop', country: 'NL', reputation: 'Hostile Exfil Point' }
  },

  // ── Benign Context & Contradiction Control Points ──
  {
    id: 'usr-sokafor',
    label: 'Sarah Okafor',
    type: 'User',
    position: [-3.2, -3.8, -0.4],
    color: '#6B7A85',
    isAttackPath: false,
    meta: { role: 'Senior Financial Analyst', dept: 'Finance Operations' }
  },
  {
    id: 'dev-ws-sokafor',
    label: 'WS-SOKAFOR',
    type: 'Device',
    position: [-1.4, -4.2, -0.8],
    color: '#6B7A85',
    isAttackPath: false,
    meta: { os: 'Windows 11', segment: 'Finance VLAN' }
  },
  {
    id: 'res-finance-q3',
    label: 'Financial Q3 Audit Share',
    type: 'Resource',
    position: [0.8, -4.6, -1.2],
    color: '#6B7A85',
    isAttackPath: false,
    meta: { share: '//srv-nas-01/finance', accessLog: 'Routine Read Access' }
  },
  {
    id: 'evt-cron-backup',
    label: 'Scheduled Nightly Backup',
    type: 'Event',
    position: [5.0, -3.8, -1.6],
    color: '#6B7A85',
    isAttackPath: false,
    meta: { type: 'Contradiction Signal', status: 'Benign Automated Cron', duration: '12m' }
  },
  {
    id: 'res-backup-nas',
    label: 'NAS Backup Repository',
    type: 'Resource',
    position: [7.0, -4.4, -2.0],
    color: '#6B7A85',
    isAttackPath: false,
    meta: { retention: '30 Days Immutable' }
  }
];

// Ordered Left-to-Right Attack Path + Baseline Relationships
export const TOPOLOGY_EDGES: [string, string, boolean][] = [
  // ── High-Contrast Attack Trajectory ─────────────────────────
  ['ip-c2-tor', 'evt-phish-ingress', true],
  ['evt-phish-ingress', 'usr-mchen', true],
  ['usr-mchen', 'dev-laptop-mchen', true],
  ['dev-laptop-mchen', 'evt-lsass-dump', true],
  ['evt-lsass-dump', 'usr-admin-svc', true],
  ['usr-admin-svc', 'evt-rdp-lateral', true],
  ['evt-rdp-lateral', 'dev-srv-admin', true],
  ['dev-srv-admin', 'evt-db-query', true],
  ['evt-db-query', 'res-db-customers', true],
  ['dev-srv-admin', 'evt-exfil-stream', true],
  ['evt-exfil-stream', 'ip-c2-vpn', true],
  ['dev-srv-db', 'res-db-customers', true],

  // ── Baseline Infrastructure & Non-Malicious Relationships ───
  ['usr-mchen', 'ip-internal-eng', false],
  ['usr-mchen', 'ip-gateway', false],
  ['usr-admin-svc', 'res-vault-prod', false],
  ['usr-admin-svc', 'dev-srv-ad', false],
  ['dev-srv-admin', 'evt-log-wipe', false],
  ['usr-sokafor', 'dev-ws-sokafor', false],
  ['dev-ws-sokafor', 'res-finance-q3', false],
  ['dev-srv-db', 'evt-cron-backup', false],
  ['evt-cron-backup', 'res-backup-nas', false],
  ['dev-srv-ad', 'ip-dc-internal', false],
  ['dev-laptop-mchen', 'dev-srv-ad', false],
  ['dev-srv-admin', 'dev-srv-db', false],
];

interface HeroNetwork3DProps {
  mode?: 'hero' | 'sandbox';
  className?: string;
  onNodeSelect?: (node: SecurityNode | null) => void;
  showControls?: boolean;
}

export function HeroNetwork3D({
  mode = 'hero',
  className = '',
  onNodeSelect,
  showControls = true
}: HeroNetwork3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [selectedNode, setSelectedNode] = useState<SecurityNode | null>(TOPOLOGY_NODES[6]); // admin-service default
  const [hoveredNode, setHoveredNode] = useState<SecurityNode | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [webglAvailable, setWebglAvailable] = useState(true);

  const isPlayingRef = useRef(true);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const graphGroupRef = useRef<THREE.Group | null>(null);
  const resetCameraFnRef = useRef<(() => void) | null>(null);
  const zoomInFnRef = useRef<(() => void) | null>(null);
  const zoomOutFnRef = useRef<(() => void) | null>(null);

  const minZoomRef = useRef<number>(14);
  const maxZoomRef = useRef<number>(55);
  const nodeMeshesRef = useRef<{
    mesh: THREE.Mesh;
    data: SecurityNode;
    reticleMesh?: THREE.LineLoop;
  }[]>([]);
  const edgeMeshesRef = useRef<{
    line: THREE.Line;
    src: SecurityNode;
    dst: SecurityNode;
    isAttack: boolean;
  }[]>([]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const handleSelect = useCallback((node: SecurityNode | null) => {
    setSelectedNode(node);
    if (onNodeSelect) {
      onNodeSelect(node);
    }
  }, [onNodeSelect]);

  // Synchronize 3D node materials and scales with filterType and selectedNode
  useEffect(() => {
    nodeMeshesRef.current.forEach(({ mesh, data, reticleMesh }) => {
      const isTypeMatch = filterType === 'all' || data.type === filterType;
      const isSelected = selectedNode?.id === data.id;
      const mat = mesh.material as THREE.MeshStandardMaterial;

      if (!isTypeMatch) {
        mat.opacity = 0.18;
        mat.emissiveIntensity = 0.05;
        if (reticleMesh) reticleMesh.visible = false;
        mesh.scale.setScalar(0.85);
      } else if (isSelected) {
        mat.opacity = 1.0;
        mat.emissiveIntensity = 0.85;
        if (reticleMesh) reticleMesh.visible = true;
        mesh.scale.setScalar(1.22);
      } else {
        mat.opacity = 1.0;
        mat.emissiveIntensity = data.isAttackPath ? 0.42 : 0.12;
        if (reticleMesh) reticleMesh.visible = false;
        mesh.scale.setScalar(1.0);
      }
    });

    edgeMeshesRef.current.forEach(({ line, src, dst, isAttack }) => {
      const srcMatch = filterType === 'all' || src.type === filterType;
      const dstMatch = filterType === 'all' || dst.type === filterType;
      const isConnectedToSelected = selectedNode && (src.id === selectedNode.id || dst.id === selectedNode.id);
      const mat = line.material as THREE.LineBasicMaterial;

      if (!srcMatch && !dstMatch) {
        mat.opacity = 0.04;
      } else if (isConnectedToSelected) {
        mat.opacity = 1.0;
        mat.color.setHex(isAttack ? 0xDC666B : 0x83CFE0); // Red for attack path edge, Ice Blue for structural connection
      } else if (selectedNode) {
        // Dim unrelated edges when a specific node is focused
        mat.opacity = isAttack ? 0.40 : 0.08;
        mat.color.setHex(isAttack ? 0xC68A69 : 0x1A2732);
      } else if (filterType !== 'all' && (!srcMatch || !dstMatch)) {
        mat.opacity = 0.12;
      } else {
        mat.opacity = isAttack ? 0.95 : 0.22;
        mat.color.setHex(isAttack ? 0xC68A69 : 0x1E2D38);
      }
    });
  }, [filterType, selectedNode]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Detect reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setIsPlaying(false);
      isPlayingRef.current = false;
    }

    // ── 1. Three.js Scene & Camera Initialization ──────────────
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x070C13, 0.010);

    const w = mount.clientWidth || 800;
    const h = mount.clientHeight || 560;

    // Low FOV (30 deg) gives controlled, near-orthographic, precise technical perspective
    const camera = new THREE.PerspectiveCamera(30, w / h, 0.1, 500);
    cameraRef.current = camera;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance'
      });
    } catch {
      setWebglAvailable(false);
      return;
    }

    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x070C13, 1);
    mount.appendChild(renderer.domElement);

    // ── 2. Precise Architectural Lighting ───────────────────────
    // Matte ambient fill
    const ambientLight = new THREE.AmbientLight(0xF3F4F0, 0.65);
    scene.add(ambientLight);

    // Controlled key direction
    const keyLight = new THREE.DirectionalLight(0xF3F4F0, 0.85);
    keyLight.position.set(10, 15, 10);
    scene.add(keyLight);

    // Subtle edge rim light (Ice Cyan)
    const rimLight = new THREE.DirectionalLight(0x83CFE0, 0.5);
    rimLight.position.set(-10, -5, -8);
    scene.add(rimLight);

    // Subtle warm rim light (Oxidized Copper)
    const copperRim = new THREE.DirectionalLight(0xC68A69, 0.4);
    copperRim.position.set(12, -4, 6);
    scene.add(copperRim);

    // ── 3. Subtle Spatial Reference Grid ─────────────────────────
    // Clean, understated orientation grid (no oversized ground rings)
    const gridHelper = new THREE.GridHelper(32, 20, 0x1E2D38, 0x0A1018);
    gridHelper.position.y = -5.8;
    scene.add(gridHelper);

    // ── 4. Graph Construction & Auto-Fit Bounds ────────────────
    const graphGroup = new THREE.Group();
    graphGroupRef.current = graphGroup;
    scene.add(graphGroup);

    // Calculate dynamic bounding box of all nodes
    const bbox = new THREE.Box3();
    TOPOLOGY_NODES.forEach((n) => {
      const p = new THREE.Vector3(...n.position);
      bbox.expandByPoint(new THREE.Vector3(p.x - 0.6, p.y - 0.6, p.z - 0.6));
      bbox.expandByPoint(new THREE.Vector3(p.x + 0.6, p.y + 0.6, p.z + 0.6));
    });
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    const size = new THREE.Vector3();
    bbox.getSize(size);

    // Center graph geometry at origin
    graphGroup.position.set(-center.x, -center.y, -center.z);

    // Accurate auto-fit camera calculation: fits complete topology cleanly
    const fitCamera = (width: number, height: number) => {
      const aspect = width / height;
      camera.aspect = aspect;
      camera.updateProjectionMatrix();

      const fovRad = (camera.fov * Math.PI) / 180;
      const tanHalf = Math.tan(fovRad * 0.5);

      const marginY = 1.25;
      const marginX = 1.20;

      const dVert = (size.y * 0.5 * marginY) / tanHalf;
      const dHoriz = (size.x * 0.5 * marginX) / (tanHalf * aspect);

      const targetDist = Math.max(dVert, dHoriz, 18);
      camera.position.set(0, 0, targetDist);
      camera.lookAt(0, 0, 0);

      minZoomRef.current = targetDist * 0.5;
      maxZoomRef.current = targetDist * 1.8;
    };

    fitCamera(w, h);

    resetCameraFnRef.current = () => {
      fitCamera(mount.clientWidth || w, mount.clientHeight || h);
      targetRotationX = 0;
      targetRotationY = 0;
      graphGroup.rotation.x = 0;
      graphGroup.rotation.y = 0;
    };
    zoomInFnRef.current = () => {
      camera.position.z = Math.max(camera.position.z * 0.88, minZoomRef.current);
    };
    zoomOutFnRef.current = () => {
      camera.position.z = Math.min(camera.position.z * 1.12, maxZoomRef.current);
    };

    // ── 5. Restrained Geometric Node Meshes ───────────────────────
    // Small, precisely rendered geometries (no oversized wireframe halos)
    const userGeo = new THREE.SphereGeometry(0.26, 20, 20);
    const deviceGeo = new THREE.OctahedronGeometry(0.28, 0);
    const ipGeo = new THREE.OctahedronGeometry(0.24, 1);
    const eventGeo = new THREE.BoxGeometry(0.38, 0.38, 0.38);
    const resourceGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.42, 16);

    // Crisp reticle ring geometry for selection
    const reticlePoints: THREE.Vector3[] = [];
    const segments = 32;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      reticlePoints.push(new THREE.Vector3(Math.cos(theta) * 0.44, Math.sin(theta) * 0.44, 0));
    }
    const reticleGeo = new THREE.BufferGeometry().setFromPoints(reticlePoints);
    const reticleMat = new THREE.LineBasicMaterial({ color: 0x83CFE0, linewidth: 1.5 });

    const nodeMeshes: {
      mesh: THREE.Mesh;
      data: SecurityNode;
      reticleMesh?: THREE.LineLoop;
    }[] = [];

    TOPOLOGY_NODES.forEach((node) => {
      const col = new THREE.Color(node.color);

      let geo: THREE.BufferGeometry;
      switch (node.type) {
        case 'User':
          geo = userGeo;
          break;
        case 'Device':
          geo = deviceGeo;
          break;
        case 'IPAddress':
          geo = ipGeo;
          break;
        case 'Event':
          geo = eventGeo;
          break;
        case 'Resource':
          geo = resourceGeo;
          break;
        default:
          geo = userGeo;
      }

      // Matte-metallic material with controlled surface illumination
      const mat = new THREE.MeshStandardMaterial({
        color: col,
        emissive: col,
        emissiveIntensity: node.isAttackPath ? 0.42 : 0.12,
        roughness: 0.35,
        metalness: 0.25,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...node.position);
      (mesh as any).userData = { node };

      // Optional orientation tilt for geometric variety
      if (node.type === 'Device' || node.type === 'Event') {
        mesh.rotation.x = Math.PI / 6;
        mesh.rotation.y = Math.PI / 4;
      }

      graphGroup.add(mesh);

      // Selected reticle ring (hidden by default)
      const reticleMesh = new THREE.LineLoop(reticleGeo, reticleMat);
      reticleMesh.position.set(...node.position);
      reticleMesh.visible = false;
      graphGroup.add(reticleMesh);

      nodeMeshes.push({ mesh, data: node, reticleMesh });
    });
    nodeMeshesRef.current = nodeMeshes;

    // ── 6. Thin Crisp Relationships & Restrained Signal Pulses ────
    const edgeLinesGroup = new THREE.Group();
    graphGroup.add(edgeLinesGroup);

    const edgeMeshes: {
      line: THREE.Line;
      src: SecurityNode;
      dst: SecurityNode;
      isAttack: boolean;
    }[] = [];

    const nodeMap = new Map<string, SecurityNode>();
    TOPOLOGY_NODES.forEach((n) => nodeMap.set(n.id, n));

    const signalParticles: {
      p1: THREE.Vector3;
      p2: THREE.Vector3;
      progress: number;
      mesh: THREE.Mesh;
      speed: number;
    }[] = [];

    const signalGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const signalMat = new THREE.MeshBasicMaterial({ color: 0xD8C99A });

    TOPOLOGY_EDGES.forEach(([srcId, dstId, isAttack]) => {
      const src = nodeMap.get(srcId);
      const dst = nodeMap.get(dstId);
      if (!src || !dst) return;

      const p1 = new THREE.Vector3(...src.position);
      const p2 = new THREE.Vector3(...dst.position);

      const points = [p1, p2];
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);

      // Thin crisp relationship lines:
      // Attack path: high contrast oxidized copper (#CC805E) or critical red (#D85E61)
      // Normal connections: thin, quiet #2B3941 at lower opacity (0.22)
      const lineMat = new THREE.LineBasicMaterial({
        color: isAttack ? (src.isAttackPath && dst.isAttackPath ? 0xC68A69 : 0xDC666B) : 0x1E2D38,
        transparent: true,
        opacity: isAttack ? 0.95 : 0.22,
        linewidth: 1,
      });

      const line = new THREE.Line(lineGeo, lineMat);
      edgeLinesGroup.add(line);
      edgeMeshes.push({ line, src, dst, isAttack });

      // Restrained signal packet traveling along the attack trajectory
      if (isAttack) {
        const signalMesh = new THREE.Mesh(signalGeo, signalMat);
        graphGroup.add(signalMesh);
        signalParticles.push({
          p1,
          p2,
          progress: Math.random(),
          mesh: signalMesh,
          speed: 0.0018 + Math.random() * 0.0008,
        });
      }
    });
    edgeMeshesRef.current = edgeMeshes;

    // ── 7. Interactive Orbit, Pointer Hover & Raycasting ───────
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-1000, -1000);

    let isDragging = false;
    let previousPointerX = 0;
    let previousPointerY = 0;
    let targetRotationX = 0;
    let targetRotationY = 0;

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      isDragging = true;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      previousPointerX = clientX;
      previousPointerY = clientY;
    };

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      if (isDragging) {
        const deltaX = clientX - previousPointerX;
        const deltaY = clientY - previousPointerY;
        previousPointerX = clientX;
        previousPointerY = clientY;

        targetRotationY += deltaX * 0.005;
        targetRotationX += deltaY * 0.005;
      } else {
        // Very subtle camera parallax
        targetRotationY = mouse.x * 0.08;
        targetRotationX = -mouse.y * 0.05;

        // Check hover target
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(nodeMeshes.map((nm) => nm.mesh));
        if (intersects.length > 0) {
          const hovered = (intersects[0].object as any).userData?.node as SecurityNode;
          setHoveredNode(hovered || null);
          renderer.domElement.style.cursor = 'pointer';
        } else {
          setHoveredNode(null);
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
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodeMeshes.map((nm) => nm.mesh));

      if (intersects.length > 0) {
        const clickedMesh = intersects[0].object as THREE.Mesh;
        const node = (clickedMesh as any).userData?.node as SecurityNode;
        if (node) {
          handleSelect(node);
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > 0) {
        const zoomDelta = e.deltaY * 0.015;
        camera.position.z = Math.min(Math.max(camera.position.z + zoomDelta, minZoomRef.current), maxZoomRef.current);
      }
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    domEl.addEventListener('click', onCanvasClick);
    domEl.addEventListener('wheel', onWheel, { passive: true });

    // ── 8. Container Resize Observer ────────────────────────────
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        const height = entry.contentRect.height;
        if (width > 0 && height > 0) {
          renderer.setSize(width, height);
          fitCamera(width, height);
        }
      }
    });
    resizeObserver.observe(mount);

    // ── 9. Render & Animation Loop ─────────────────────────────
    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (isPlayingRef.current) {
        // Very slow, dignified instrumentation drift (no spinning planet)
        graphGroup.rotation.y += 0.0002;
      }

      // Smooth damped interpolation to pointer target
      graphGroup.rotation.y += (targetRotationY - graphGroup.rotation.y * 0.1) * 0.03;
      graphGroup.rotation.x += (targetRotationX - graphGroup.rotation.x * 0.1) * 0.03;

      // Update attack trajectory signal progression
      signalParticles.forEach((p) => {
        if (isPlayingRef.current) {
          p.progress = (p.progress + p.speed) % 1;
        }
        p.mesh.position.lerpVectors(p.p1, p.p2, p.progress);
      });

      // Face reticles toward camera
      nodeMeshes.forEach((nm) => {
        if (nm.reticleMesh && nm.reticleMesh.visible) {
          nm.reticleMesh.quaternion.copy(camera.quaternion);
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      domEl.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      domEl.removeEventListener('click', onCanvasClick);
      domEl.removeEventListener('wheel', onWheel);

      nodeMeshesRef.current = [];
      edgeMeshesRef.current = [];

      if (domEl.parentElement) {
        domEl.parentElement.removeChild(domEl);
      }
      renderer.dispose();
    };
  }, [mode, handleSelect]);

  return (
    <div className={`relative w-full h-full bg-[#070C13] ${mode === 'hero' ? '' : 'border border-[#1E2D38] rounded'} overflow-hidden flex flex-col ${className}`}>
      {/* ── 2D Topology Fallback if WebGL unavailable ─────────── */}
      {!webglAvailable && (
        <div className="w-full flex-1 min-h-[460px] flex items-center justify-center p-6 bg-[#0D141A]">
          <svg className="w-full h-full max-h-[500px]" viewBox="-12 -6 24 12">
            {TOPOLOGY_EDGES.map(([src, tgt, isAtk], idx) => {
              const sNode = TOPOLOGY_NODES.find((n) => n.id === src);
              const tNode = TOPOLOGY_NODES.find((n) => n.id === tgt);
              if (!sNode || !tNode) return null;
              return (
                <line
                  key={idx}
                  x1={sNode.position[0]}
                  y1={-sNode.position[1]}
                  x2={tNode.position[0]}
                  y2={-tNode.position[1]}
                  stroke={isAtk ? '#CC805E' : '#2B3941'}
                  strokeWidth={isAtk ? 0.12 : 0.05}
                  strokeOpacity={isAtk ? 0.95 : 0.3}
                />
              );
            })}
            {TOPOLOGY_NODES.map((node) => (
              <g
                key={node.id}
                transform={`translate(${node.position[0]}, ${-node.position[1]})`}
                onClick={() => handleSelect(node)}
                className="cursor-pointer"
              >
                <circle
                  r={selectedNode?.id === node.id ? 0.45 : 0.3}
                  fill={node.color}
                  stroke={selectedNode?.id === node.id ? '#D6E982' : '#2B3941'}
                  strokeWidth={0.08}
                />
              </g>
            ))}
          </svg>
        </div>
      )}

      {/* ── 3D Canvas Mount Point ─────────────────────────────── */}
      <div
        ref={mountRef}
        className={`w-full flex-1 min-h-[460px] ${!webglAvailable ? 'hidden' : ''}`}
      />

      {/* ── Top Floating Minimal Telemetry & Controls ─────────── */}
      {mode !== 'hero' && (
      <div className="absolute top-3.5 left-3.5 right-3.5 flex flex-wrap items-center justify-between gap-2 pointer-events-none z-10">
        <div className="bg-[#070C13]/90 backdrop-blur-md px-3 py-1.5 rounded border border-[#1E2D38] flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="telemetry-pulse telemetry-pulse-cyan" />
            <span className="text-[#F3F4F0] font-semibold tracking-wider text-[11px] uppercase">
              TOPOLOGY INSTRUMENT
            </span>
          </div>
          <span className="text-[#1E2D38]">|</span>
          <span className="text-[#6B7A85] text-[11px] hidden sm:inline">
            <span className="text-[#D8C99A] font-semibold">DEMO</span> • 24 NODES
          </span>
        </div>

        {/* Action Controls */}
        {showControls && (
          <div className="flex items-center gap-1 pointer-events-auto bg-[#070C13]/90 backdrop-blur-md p-1 rounded border border-[#1E2D38]">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              title={isPlaying ? 'Pause Motion' : 'Resume Motion'}
              className="p-1.5 text-[#6B7A85] hover:text-[#F3F4F0] hover:bg-[#1A2732] transition-colors"
              aria-label={isPlaying ? 'Pause motion' : 'Resume motion'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => zoomInFnRef.current?.()}
              title="Zoom In"
              className="p-1.5 text-[#A7B1B7] hover:text-[#EDF0ED] hover:bg-[#151D24] transition-colors"
              aria-label="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => zoomOutFnRef.current?.()}
              title="Zoom Out"
              className="p-1.5 text-[#A7B1B7] hover:text-[#EDF0ED] hover:bg-[#151D24] transition-colors"
              aria-label="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                resetCameraFnRef.current?.();
                handleSelect(TOPOLOGY_NODES[6]);
              }}
              title="Reset View"
              className="p-1.5 text-[#A7B1B7] hover:text-[#EDF0ED] hover:bg-[#151D24] transition-colors"
              aria-label="Reset camera"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
      )}

      {/* ── Hover Tooltip ─────────────────────────────────────── */}
      {hoveredNode && hoveredNode.id !== selectedNode?.id && mode !== 'hero' && (
        <div className="absolute top-14 left-4 bg-[#070C13]/95 backdrop-blur-md border border-[#1E2D38] px-3 py-1.5 rounded text-xs font-mono z-20 pointer-events-none shadow-lg flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: hoveredNode.color }}
          />
          <span className="text-[#F3F4F0] font-semibold">{hoveredNode.label}</span>
          <span className="text-[#6B7A85] text-[10px]">[{hoveredNode.type}]</span>
        </div>
      )}

      {/* ── Sandbox Category Filter (Sandbox Mode Only) ───────── */}
      {mode === 'sandbox' && (
        <div className="absolute bottom-14 left-4 right-4 flex flex-wrap items-center gap-1.5 pointer-events-auto z-10">
          {['all', 'User', 'Device', 'Event', 'IPAddress', 'Resource'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-2.5 py-1 text-[11px] font-mono transition-colors border rounded ${
                filterType === type
                  ? 'bg-[#83CFE0]/12 border-[#83CFE0] text-[#83CFE0] font-semibold'
                  : 'bg-[#070C13]/90 border-[#1E2D38] text-[#6B7A85] hover:text-[#F3F4F0] hover:bg-[#1A2732]'
              }`}
            >
              {type === 'all' ? 'All Entities (24)' : type}
            </button>
          ))}
        </div>
      )}

      {/* ── Bottom Details Inspector ──────────────────────────── */}
      {mode !== 'hero' && (
      <div className="border-t border-[#1E2D38] bg-[#070C13]/95 px-4 py-2.5 z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono text-xs">
        {selectedNode ? (
          <div className="flex flex-wrap items-center gap-2.5">
            <span
              className={`badge-tag ${
                selectedNode.type === 'Event'
                  ? 'badge-critical'
                  : selectedNode.type === 'User'
                  ? 'badge-medium'
                  : 'badge-low'
              }`}
            >
              {selectedNode.type}
            </span>
            <span className="text-[#F3F4F0] font-semibold text-xs">{selectedNode.label}</span>
            <span className="text-[#6B7A85] text-[11px] hidden md:inline">[{selectedNode.id}]</span>
            {selectedNode.isAttackPath && (
              <span className="text-[#C68A69] text-[11px] font-medium flex items-center gap-1 bg-[#C68A69]/10 px-2 py-0.5 rounded border border-[#C68A69]/20">
                <Shield className="w-3 h-3" /> ATTACK PATH
              </span>
            )}
            {selectedNode.meta && (
              <span className="text-[#D6E0E5] text-[11px] hidden lg:inline">
                • {Object.entries(selectedNode.meta)[0]?.[0]}:{' '}
                <strong className="text-[#83CFE0]">{Object.entries(selectedNode.meta)[0]?.[1]}</strong>
              </span>
            )}
          </div>
        ) : (
          <span className="text-[#6B7A85] text-xs flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-[#83CFE0]" /> Select any node to inspect
          </span>
        )}

        <div className="flex items-center gap-3 text-[11px] text-[#6B7A85] self-end sm:self-auto">
          <span className="flex items-center gap-1 text-[#83CFE0]">
            <Crosshair className="w-3.5 h-3.5" /> INTERACTIVE
          </span>
        </div>
      </div>
      )}
    </div>
  );
}
