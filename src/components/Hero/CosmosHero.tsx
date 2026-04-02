import type React from 'react';

import { HERO_NEBULA_CONFIG } from './heroNebulaConfig';
import styles from './CosmosHero.module.scss';

// ─── Component ────────────────────────────────────────────────────────────────
// CosmosHero is now a transparent spacer.  The astrophoto and star rendering
// are handled by StarBackground (which receives HERO_NEBULA_CONFIG via the
// Layout's heroNebula prop).  This component only contributes:
//   1. A 100 % width/height block to reserve the 60vh space in the flow.
//   2. The edge-fade ::after pseudo-element (from CosmosHero.module.scss).
//   3. An HTML credit line in the bottom-right corner.

export const CosmosHero: React.FC = () => (
  <div className={styles.wrapper}>
    {HERO_NEBULA_CONFIG.creditText && (
      <p className={styles.credit}>{HERO_NEBULA_CONFIG.creditText}</p>
    )}
  </div>
);
