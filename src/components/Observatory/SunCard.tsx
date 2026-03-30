import { Stack, Text } from '@mantine/core';
import React, { FC } from 'react';

import { sunriseSunset, sunAltAz, skyState, SkyState } from '../../lib/astronomy/sun';
import { useT } from '../../hooks/useT';
import type { Location } from './LocationSelector';
import styles from './Observatory.module.scss';
import { SunImage } from './SunImage';
import { SunTimeline } from './SunTimeline';

type Props = {
  location: Location;
  date: Date;
};

const STATE_LABEL_KEYS: Record<SkyState, string> = {
  day: 'observatory.skyDay',
  twilight: 'observatory.skyTwilight',
  dark: 'observatory.skyDark',
};

export const SunCard: FC<Props> = ({ location, date }) => {
  const t = useT();
  const times = sunriseSunset(location.lat, location.lon, date);
  const altAz = sunAltAz(location.lat, location.lon, date);
  const state = skyState(location.lat, location.lon, date);

  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>{t('observatory.sunTitle')}</div>
      <Stack gap="sm" align="stretch">
        <SunImage />
        <Text size="sm" ta="center">
          <span className={styles.skyStateDot} data-state={state} />
          {t(STATE_LABEL_KEYS[state])} · Alt {altAz.alt.toFixed(1)}° Az {altAz.az.toFixed(1)}°
        </Text>
        <SunTimeline times={times} now={date} />
      </Stack>
    </div>
  );
};
