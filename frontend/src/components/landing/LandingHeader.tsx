'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Shield, ArrowRight, Menu, X, Terminal, Search } from 'lucide-react';

const NAV_LINKS = [
  { href: '#correlation', label: 'Correlation', id: 'correlation' },
  { href: '#methodology', label: 'Methodology', id: 'methodology' },
  { href: '#topology', label: 'Topology', id: 'topology' },
  { href: '#evidence', label: 'Evidence', id: 'evidence' },
  { href: '#engine', label: 'Engine', id: 'engine' },
];

export function LandingHeader() {
  const { user, signInAsGuest } = useAuth();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [scrolled, setScrolled] = useState<boolean>(false);
  const [healthData, setHealthData] = useState<any>(null);
  const [healthStatus, setHealthStatus] = useState<'connecting' | 'connected' | 'demo' | 'degraded' | 'unavailable'>('connecting');

  useEffect(() => {
    let mounted = true;
    api.health()
      .then((data) => {
        if (!mounted) return;
        setHealthData(data);
        const falkor = data?.services?.falkordb;
        if (!falkor || falkor.status !== 'connected') {
          setHealthStatus('unavailable');
        } else if (falkor.mode === 'in_memory_fallback') {
          setHealthStatus('demo');
        } else {
          setHealthStatus('connected');
        }
      })
      .catch(() => {
        if (mounted) setHealthStatus('unavailable');
      });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);

      // Detect active section
      const sectionElements = NAV_LINKS.map((link) => ({
        id: link.id,
        el: document.getElementById(link.id),
      })).filter((item) => item.el !== null);

      const scrollPosition = window.scrollY + 200;
      for (let i = sectionElements.length - 1; i >= 0; i--) {
        const item = sectionElements[i];
        if (item.el && item.el.offsetTop <= scrollPosition) {
          setActiveSection(item.id);
          return;
        }
      }
      if (window.scrollY < 200) {
        setActiveSection('');
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      router.push('/#' + id);
    }
  };

  const handleLaunchApp = (destination = '/app') => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('threatgraph_guest_session', 'true');
    }
    if (!user) {
      signInAsGuest();
    }
    router.push(destination);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#070A10]/95 backdrop-blur-md border-b border-[#162332] shadow-[0_4px_30px_rgba(0,0,0,0.6)]'
          : 'bg-[#070A10]/85 backdrop-blur-sm border-b border-[#162332]/60'
      }`}
    >
      <div className="max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-8 h-[68px] flex items-center justify-between gap-4 sm:gap-6">
        {/* Brand identity */}
        <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0 focus-visible:ring-1 focus-visible:ring-[#38BDF8] rounded-md p-1">
          <div className="w-8 h-8 rounded-md bg-[#0A1320] border border-[#1678D2]/40 flex items-center justify-center group-hover:border-[#38BDF8] transition-colors duration-200 relative shadow-[0_0_12px_rgba(22,120,210,0.25)]">
            <Shield className="w-4 h-4 text-[#38BDF8]" />
            <span className="absolute inset-0 rounded-md bg-[#1678D2]/15 blur-xs pointer-events-none" />
          </div>
          <div className="flex items-baseline">
            <span className="font-heading font-bold text-[16px] tracking-tight text-[#F3F5F7] group-hover:text-white transition-colors">
              ThreatGraph<span className="text-[#38BDF8]">AI</span>
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links with active-state indicator */}
        <nav className="hidden lg:flex items-center gap-1 text-[13px] font-body font-medium text-[#7D8B96]">
          {NAV_LINKS.map((link) => {
            const isActive = activeSection === link.id;
            return (
              <a
                key={link.id}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.id)}
                className={`relative px-3.5 py-1.5 rounded-md transition-all duration-180 cursor-pointer ${
                  isActive
                    ? 'text-[#FFFFFF] font-semibold bg-[#0E1A29]'
                    : 'hover:text-[#D6E0E5] hover:bg-[#0E1724]'
                }`}
              >
                {link.label}
                {isActive && (
                  <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-[#38BDF8] rounded-full shadow-[0_0_8px_#38BDF8]" />
                )}
              </a>
            );
          })}
        </nav>

        {/* Right CTA Actions matching Reference Command Center */}
        <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
          {/* Live Graph Status Pill */}
          <Link
            href="/app/graph"
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-md bg-[#09121D] border border-[#1A2736] hover:border-[#38BDF8]/50 transition-colors cursor-pointer group"
            title="FalkorDB Knowledge Graph Status"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                healthStatus === 'connected'
                  ? 'bg-[#10B981] shadow-[0_0_8px_#10B981] animate-pulse'
                  : healthStatus === 'demo'
                  ? 'bg-[#38BDF8] shadow-[0_0_8px_#38BDF8]'
                  : healthStatus === 'connecting'
                  ? 'bg-[#EAB308]'
                  : 'bg-[#EF4444]'
              }`}
            />
            <div className="flex flex-col text-left leading-tight">
              <span className="text-[10px] font-mono font-semibold text-[#F3F5F7] group-hover:text-[#38BDF8]">
                {healthStatus === 'connected'
                  ? 'FalkorDB Cloud (Dev)'
                  : healthStatus === 'demo'
                  ? 'In-Memory Fallback'
                  : healthStatus === 'connecting'
                  ? 'Connecting...'
                  : 'Unavailable'}
              </span>
              <span className="text-[9px] font-mono text-[#788B99]">
                {healthStatus === 'connected' ? 'Dev / Plain TCP • ' : 'Demo • '}
                {healthData?.services?.falkordb?.nodes ?? 49}N &bull; {healthData?.services?.falkordb?.edges ?? 57}E
              </span>
            </div>
          </Link>

          {/* Search Button */}
          <button
            onClick={() => handleLaunchApp('/app/graph')}
            className="p-2 rounded-md bg-[#09121D] border border-[#1A2736] text-[#788B99] hover:text-[#F3F5F7] hover:border-[#38BDF8]/50 transition-colors cursor-pointer"
            aria-label="Search Knowledge Graph"
            title="Explore Connected Entities"
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          <Link
            href="/sign-in"
            className="text-[13px] font-body font-medium text-[#7D8B96] hover:text-[#F3F4F0] px-2.5 py-1.5 rounded-md hover:bg-[#0E1724] transition-colors"
          >
            Sign In
          </Link>
          <button
            onClick={() => handleLaunchApp('/app')}
            className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5"
          >
            <span className="font-semibold tracking-wide">Launch Platform</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex sm:hidden items-center gap-2">
          <button
            onClick={() => handleLaunchApp('/app')}
            className="btn-primary text-[11px] py-1.5 px-3 flex items-center gap-1"
          >
            <span>Launch</span>
            <ArrowRight className="w-3 h-3" />
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-md bg-[#0E1724] border border-[#1A2736] text-[#B4C0C8] hover:text-white"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 top-[68px] bg-black/60 backdrop-blur-sm z-40 sm:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div
            id="mobile-nav"
            className="relative z-50 sm:hidden bg-[#070A10] border-b border-[#1A2736] px-5 py-4 space-y-3 font-mono text-xs shadow-2xl"
          >
            <div className="flex flex-col space-y-1">
              {NAV_LINKS.map((link, idx) => (
                <a
                  key={link.id}
                  href={link.href}
                  onClick={(e) => {
                    setMobileMenuOpen(false);
                    handleNavClick(e, link.id);
                  }}
                  className="text-[#B4C0C8] hover:text-[#38BDF8] py-2 px-2 rounded hover:bg-[#0E1724] flex items-center justify-between cursor-pointer transition-colors"
                >
                  <span className="font-body text-sm">{link.label}</span>
                  <span className="text-[10px] text-[#7D8B96] font-mono">0{idx + 1}</span>
                </a>
              ))}
            </div>
            <div className="pt-3 border-t border-[#1A2736] flex items-center justify-between">
              <Link
                href="/sign-in"
                onClick={() => setMobileMenuOpen(false)}
                className="text-[#7D8B96] hover:text-white py-1 px-2 font-body text-sm"
              >
                Sign In
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLaunchApp('/app');
                }}
                className="btn-primary text-xs py-2 px-4"
              >
                Launch Platform
              </button>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
