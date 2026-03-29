import React, { useEffect, useState } from 'react';

import { StarBackgroundCanvas } from './StarBackgroundCanvas';
import { StarBackgroundWebGL }  from './StarBackgroundWebGL';
import { RENDERER } from './config';
import { useNebulaTexture } from './useNebulaTexture';

// ─── WebGL detection (client-side only) ───────────────────────────────────────

function detectWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(
      c.getContext('webgl') ||
      (c.getContext as (id: string) => RenderingContext | null)('experimental-webgl')
    );
  } catch {
    return false;
  }
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export const StarBackground: React.FC = () => {
  // null = not yet determined (SSR / pre-mount)
  const [webgl, setWebgl] = useState<boolean | null>(null);

  useEffect(() => {
    if (RENDERER !== 'auto') {
      const using = RENDERER === 'webgl';
      console.log(`[StarBackground] renderer: ${using ? 'WebGL' : 'Canvas 2D'} (forced by config)`);
      setWebgl(using);
      return;
    }
    const supported = detectWebGL();
    console.log(`[StarBackground] renderer: ${supported ? 'WebGL' : 'Canvas 2D'}`);
    setWebgl(supported);
  }, []);

  // Only generate nebula textures when the WebGL renderer will be used.
  // Canvas 2D path skips texture generation entirely.
  const { dark: nebulaDark, light: nebulaLight } = useNebulaTexture(webgl === true);

  if (webgl === null) return null;
  return webgl
    ? <StarBackgroundWebGL nebulaDark={nebulaDark} nebulaLight={nebulaLight} />
    : <StarBackgroundCanvas />;
};
