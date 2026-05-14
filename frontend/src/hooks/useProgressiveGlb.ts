'use client';
import { useState, useEffect } from 'react';

export type GlbLoadState = 'idle' | 'loading' | 'ready' | 'error';

export interface UseProgressiveGlbResult {
  state: GlbLoadState;
  resolvedUrl: string | null;
  progress: number; // 0-100
}

export function useProgressiveGlb(url: string | null | undefined): UseProgressiveGlbResult {
  const [state, setState] = useState<GlbLoadState>('idle');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!url) { setState('idle'); setProgress(0); return; }

    setState('loading');
    setProgress(10);

    // Preload the GLB via XHR to get progress events
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'blob';

    xhr.onprogress = (e) => {
      if (e.lengthComputable) {
        setProgress(Math.round((e.loaded / e.total) * 90) + 10);
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        setState('ready');
        setProgress(100);
      } else {
        setState('error');
      }
    };

    xhr.onerror = () => setState('error');
    xhr.send();

    return () => xhr.abort();
  }, [url]);

  return { state, resolvedUrl: state === 'ready' ? url ?? null : null, progress };
}
