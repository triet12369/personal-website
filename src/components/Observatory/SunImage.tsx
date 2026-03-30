/**
 * Live SOHO HMI Intensitygram (white-light solar image).
 * Fetched via a Next.js API proxy to avoid CORS/hotlink restrictions.
 * Auto-refreshes every 15 minutes to match SOHO's update cadence.
 */

import React, { FC, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export const SunImage: FC = () => {
  const { t: tStr } = useTranslation();
  const [bust, setBust] = useState(() => Math.floor(Date.now() / (15 * 60 * 1000)));

  useEffect(() => {
    const id = setInterval(() => {
      setBust(Math.floor(Date.now() / (15 * 60 * 1000)));
    }, 15 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <img
      src={`/api/sdo-image?t=${bust}`}
      alt={tStr('observatory.sunImageAlt')}
      style={{ width: '100%', display: 'block', borderRadius: 'var(--mantine-radius-md)' }}
    />
  );
};
