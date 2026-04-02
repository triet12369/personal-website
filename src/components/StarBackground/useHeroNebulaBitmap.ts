import { useEffect, useState } from 'react';

// Cache the hero bitmap on `window` so client-side navigations reuse the same
// decoded image (avoids a re-fetch on every page transition). If `src` changes
// the cache is invalidated and the new image is loaded.
declare global {
  interface Window {
    __heroNebulaBitmap?: ImageBitmap;
    __heroNebulaSrc?: string;
  }
}

/**
 * Loads the hero astrophoto at `src` as an `ImageBitmap` ready for canvas or
 * WebGL upload. Returns `null` while loading or when `src` is undefined.
 *
 * The decoded bitmap is cached on `window.__heroNebulaBitmap` so navigations
 * don't re-fetch. When `src` changes the cache is busted.
 */
export function useHeroNebulaBitmap(src: string | undefined): ImageBitmap | null {
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(() => {
    if (typeof window === 'undefined') return null;
    if (src && window.__heroNebulaSrc === src && window.__heroNebulaBitmap) {
      return window.__heroNebulaBitmap;
    }
    return null;
  });

  useEffect(() => {
    if (!src || typeof window === 'undefined') return;

    // Cache hit
    if (window.__heroNebulaSrc === src && window.__heroNebulaBitmap) {
      setBitmap(window.__heroNebulaBitmap);
      return;
    }

    let cancelled = false;

    fetch(src)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status} loading hero image: ${src}`);
        return r.blob();
      })
      .then((b) => createImageBitmap(b))
      .then((bmp) => {
        if (cancelled) return;
        window.__heroNebulaBitmap = bmp;
        window.__heroNebulaSrc = src;
        setBitmap(bmp);
      })
      .catch((err) => {
        console.error('[useHeroNebulaBitmap] Failed to load hero astrophoto:', err);
      });

    return () => {
      cancelled = true;
    };
  }, [src]);

  return bitmap;
}
