'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { HeroSection } from '@/components/landing/HeroSection';
import { BlindSpotSection } from '@/components/landing/BlindSpotSection';
import { MethodologySection } from '@/components/landing/MethodologySection';
import { TopologySandboxSection } from '@/components/landing/TopologySandboxSection';
import { ForensicDimensionsSection } from '@/components/landing/ForensicDimensionsSection';
import { TechnicalEngineSection } from '@/components/landing/TechnicalEngineSection';
import { LandingFooter } from '@/components/landing/LandingFooter';

export default function HomePage() {
  const [backendHealth, setBackendHealth] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    api.health()
      .then((data) => {
        if (mounted) setBackendHealth(data);
      })
      .catch(() => {
        if (mounted) setBackendHealth(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen w-full bg-[#070A10] text-[#F3F4F0] flex flex-col selection:bg-[#38BDF8] selection:text-[#070A10]">
      <LandingHeader />
      <main className="flex-1">
        <HeroSection backendHealth={backendHealth} />
        <BlindSpotSection />
        <MethodologySection />
        <TopologySandboxSection />
        <ForensicDimensionsSection />
        <TechnicalEngineSection backendHealth={backendHealth} />
        <LandingFooter />
      </main>
    </div>
  );
}
