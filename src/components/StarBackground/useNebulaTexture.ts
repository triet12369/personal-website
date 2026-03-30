import { useEffect, useState } from 'react';

import { NEBULA_BAKED_COUNT } from './config';

interface NebulaState {
  nebula: ImageBitmap | null;
}

// Keyed on `window` so the cache survives client-side navigations (window is
// never torn down) but resets on a real browser refresh (window is recreated).
// This also works correctly in Next.js dev mode where module scope is
// re-evaluated on each navigation.
declare global {
  interface Window {
    __nebulaVariant?: number;
    __nebulaBitmap?:  ImageBitmap;
  }
}

function getCachedBitmap(): NebulaState {
  const bmp = typeof window !== 'undefined' ? window.__nebulaBitmap : undefined;
  return { nebula: bmp ?? null };
}

/**
 * Loads a randomly-selected pre-baked nebula variant from /nebula/.
 * Each variant is a single packed PNG: R=S II, G=H-α, B=O III (raw fBm values).
 * The shader & canvas renderer apply colour palettes at runtime.
 *
 * The chosen variant is cached on `window` for the lifetime of the browser
 * session so client-side navigations always show the same nebula.
 * When `enabled` is false the hook is a no-op.
 */
export function useNebulaTexture(enabled: boolean): NebulaState {
  const [state, setState] = useState<NebulaState>(getCachedBitmap);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    // Already loaded this session — reuse and bail.
    if (window.__nebulaBitmap) {
      setState({ nebula: window.__nebulaBitmap });
      return;
    }

    let cancelled = false;
    if (window.__nebulaVariant === undefined) {
      window.__nebulaVariant = Math.floor(Math.random() * NEBULA_BAKED_COUNT);
    }
    const v = window.__nebulaVariant;

    fetch(`/nebula/${v}.png`)
      .then(r => r.blob())
      .then(b => createImageBitmap(b))
      .then(bmp => {
        if (cancelled) return;
        window.__nebulaBitmap = bmp;
        setState({ nebula: bmp });
      })
      .catch(err => {
        console.error('[useNebulaTexture] Failed to load nebula asset:', err);
      });

    return () => { cancelled = true; };
  }, [enabled]);

  return state;
}

