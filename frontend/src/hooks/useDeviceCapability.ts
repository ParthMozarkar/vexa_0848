'use client';
import { useState, useEffect } from 'react';

export interface DeviceCapability {
  isMobile: boolean;
  isLowEndDevice: boolean;
  prefersReducedMotion: boolean;
  connectionType: 'slow' | 'fast' | 'unknown';
  supportsWebGL: boolean;
}

export function useDeviceCapability(): DeviceCapability {
  const [cap, setCap] = useState<DeviceCapability>({
    isMobile: false,
    isLowEndDevice: false,
    prefersReducedMotion: false,
    connectionType: 'unknown',
    supportsWebGL: true,
  });

  useEffect(() => {
    const isMobile =
      /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || window.innerWidth < 768;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Connection type detection
    const nav = navigator as Navigator & { connection?: { effectiveType?: string } };
    const effectiveType = nav.connection?.effectiveType ?? 'unknown';
    const connectionType: DeviceCapability['connectionType'] = ['slow-2g', '2g', '3g'].includes(
      effectiveType
    )
      ? 'slow'
      : effectiveType === 'unknown'
        ? 'unknown'
        : 'fast';

    // WebGL support
    let supportsWebGL = false;
    try {
      const canvas = document.createElement('canvas');
      supportsWebGL = !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch {
      supportsWebGL = false;
    }

    // Low-end heuristic: mobile + slow connection OR low memory
    const nav2 = navigator as Navigator & { deviceMemory?: number };
    const isLowEndDevice =
      isMobile && (connectionType === 'slow' || (nav2.deviceMemory ?? 8) < 2);

    setCap({ isMobile, isLowEndDevice, prefersReducedMotion, connectionType, supportsWebGL });
  }, []);

  return cap;
}
