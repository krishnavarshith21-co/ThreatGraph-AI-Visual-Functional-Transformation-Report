'use client';

import { useEffect, useRef } from 'react';

interface ParticleNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  label: string;
  type: string;
  pulsePhase: number;
}

export function HeroGraph3D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 800);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 600);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.parentElement?.clientWidth || 800;
      height = canvas.height = canvas.parentElement?.clientHeight || 600;
    };
    window.addEventListener('resize', handleResize);

    const mouse = { x: width / 2, y: height / 2, active: false };
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
    };
    const handleMouseLeave = () => {
      mouse.active = false;
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    // Initial cyber entities
    const nodeDefs = [
      { type: 'User', label: 'Marcus Chen', color: '#B5A078' },
      { type: 'Device', label: 'LAPTOP-MCHEN', color: '#7A9A80' },
      { type: 'Event', label: 'LSASS Dump', color: '#B65E55' },
      { type: 'IP', label: '185.220.101.42 (TOR)', color: '#9B86BD' },
      { type: 'User', label: 'admin-service', color: '#B5A078' },
      { type: 'Device', label: 'SRV-ADMIN-01', color: '#7A9A80' },
      { type: 'Resource', label: 'Customer DB', color: '#C28A48' },
      { type: 'Event', label: '4.2GB Exfil', color: '#E05252' },
      { type: 'IP', label: '91.219.236.18', color: '#9B86BD' },
      { type: 'Alert', label: 'APT Lateral Move', color: '#E5A93B' },
      { type: 'Resource', label: 'API Keys Vault', color: '#C28A48' },
      { type: 'Event', label: 'RDP Session', color: '#B65E55' },
      { type: 'Device', label: 'SRV-DB-PROD-01', color: '#7A9A80' },
      { type: 'Event', label: 'Bulk Export', color: '#E05252' },
    ];

    const nodes: ParticleNode[] = nodeDefs.map((def, i) => {
      const angle = (i / nodeDefs.length) * Math.PI * 2;
      const dist = 120 + Math.random() * 140;
      return {
        x: width / 2 + Math.cos(angle) * dist,
        y: height / 2 + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        radius: Math.random() * 3 + 4,
        color: def.color,
        label: def.label,
        type: def.type,
        pulsePhase: Math.random() * Math.PI * 2,
      };
    });

    // Background floating dust particles
    const dustCount = 40;
    const dust = Array.from({ length: dustCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2,
      radius: Math.random() * 1.5 + 0.5,
      alpha: Math.random() * 0.4 + 0.1,
    }));

    let frame = 0;
    const render = () => {
      frame++;
      ctx.clearRect(0, 0, width, height);

      // Radial dark background glow
      const grad = ctx.createRadialGradient(
        width / 2, height / 2, 50,
        width / 2, height / 2, width * 0.6
      );
      grad.addColorStop(0, 'rgba(181, 160, 120, 0.05)');
      grad.addColorStop(0.5, 'rgba(17, 19, 16, 0.4)');
      grad.addColorStop(1, 'rgba(17, 19, 16, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Render ambient dust
      dust.forEach((d) => {
        d.x += d.vx;
        d.y += d.vy;
        if (d.x < 0) d.x = width;
        if (d.x > width) d.x = 0;
        if (d.y < 0) d.y = height;
        if (d.y > height) d.y = 0;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(181, 160, 120, ${d.alpha})`;
        ctx.fill();
      });

      // Update and connect nodes
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.pulsePhase += 0.03;

        // Soft center gravity
        const dx = width / 2 - n.x;
        const dy = height / 2 - n.y;
        n.vx += dx * 0.00008;
        n.vy += dy * 0.00008;

        // Mouse avoidance/attraction
        if (mouse.active) {
          const mdx = mouse.x - n.x;
          const mdy = mouse.y - n.y;
          const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
          if (mdist < 180) {
            n.vx += (mdx / mdist) * 0.2;
            n.vy += (mdy / mdist) * 0.2;
          }
        }

        // Apply friction
        n.vx *= 0.985;
        n.vy *= 0.985;
        n.x += n.vx;
        n.y += n.vy;

        // Draw connections
        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const dist = Math.hypot(n.x - n2.x, n.y - n2.y);
          if (dist < 170) {
            const alpha = (1 - dist / 170) * 0.45;
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.strokeStyle = `rgba(181, 160, 120, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.stroke();

            // Animated packet pulse on some edges
            if ((i + j) % 3 === 0) {
              const progress = ((frame * 0.015) + (i * 0.1)) % 1;
              const px = n.x + (n2.x - n.x) * progress;
              const py = n.y + (n2.y - n.y) * progress;
              ctx.beginPath();
              ctx.arc(px, py, 2, 0, Math.PI * 2);
              ctx.fillStyle = '#B5A078';
              ctx.shadowColor = '#B5A078';
              ctx.shadowBlur = 6;
              ctx.fill();
              ctx.shadowBlur = 0;
            }
          }
        }
      }

      // Draw nodes
      nodes.forEach((n) => {
        const pulse = Math.sin(n.pulsePhase) * 1.5;

        // Outer glow
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius + 6 + pulse, 0, Math.PI * 2);
        ctx.fillStyle = `${n.color}15`;
        ctx.fill();

        // Node circle
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.shadowColor = n.color;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Label
        ctx.font = '10px Space Grotesk, sans-serif';
        ctx.fillStyle = '#C9C5B8';
        ctx.fillText(n.label, n.x + n.radius + 6, n.y + 3);
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <div className="relative w-full h-[520px] rounded-xl overflow-hidden border border-border/60 bg-obsidian shadow-2xl">
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Floating HUD status overlay */}
      <div className="absolute top-4 left-4 bg-graphite/85 backdrop-blur-md px-3.5 py-2 rounded-lg border border-border text-xs font-mono space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-verdigris-bright animate-ping" />
          <span className="text-ivory font-semibold tracking-wide">FalkorDB Threat Engine Active</span>
        </div>
        <div className="text-[11px] text-limestone">
          Tracking: <span className="text-champagne">14 Correlated Entities</span> | Multi-Hop Depth: <span className="text-champagne">3</span>
        </div>
      </div>

      <div className="absolute bottom-4 right-4 bg-graphite/85 backdrop-blur-md px-3.5 py-2 rounded-lg border border-border text-[11px] font-mono text-limestone flex items-center gap-2">
        <span className="text-danger font-semibold">● ACTIVE ATTACK PATH IDENTIFIED</span>
        <span className="text-border">|</span>
        <span className="text-champagne">Lateral RDP &gt; SRV-ADMIN-01</span>
      </div>
    </div>
  );
}
