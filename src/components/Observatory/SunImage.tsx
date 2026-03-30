/**
 * Live SOHO solar image for a given wavelength/instrument view.
 * Fetched via a Next.js API proxy to avoid CORS/hotlink restrictions.
 * Auto-refreshes every 15 minutes to match SOHO's update cadence.
 */

import React, { FC, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { SunView } from '../../pages/api/sdo-image';

type Props = {
  view?: SunView;
};

export const SunImage: FC<Props> = ({ view = 'hmi_igr' }) => {
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
      src={`/api/sdo-image?view=${view}&t=${bust}`}
      alt={tStr('observatory.sunImageAlt')}
      style={{ width: '100%', display: 'block', borderRadius: 'var(--mantine-radius-md)', background: '#000' }}
    />
  );
};

export type { SunView };
