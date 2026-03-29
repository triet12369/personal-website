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

export const StarBackground: React.FC<{ nebulaDisabled?: boolean }> = ({ nebulaDisabled }) => {
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

  // Load nebula textures for both renderers (always, so they are preloaded
  // even on pages where nebula is disabled). Mask the output when disabled so
  // the renderer receives null and skips drawing.
  const { dark: nebulaDarkRaw, light: nebulaLightRaw } = useNebulaTexture(webgl !== null);
  const nebulaDark  = nebulaDisabled ? null : nebulaDarkRaw;
  const nebulaLight = nebulaDisabled ? null : nebulaLightRaw;

  if (webgl === null) return null;
  return webgl
    ? <StarBackgroundWebGL nebulaDark={nebulaDark} nebulaLight={nebulaLight} />
    : <StarBackgroundCanvas nebulaDark={nebulaDark} nebulaLight={nebulaLight} />;
};
