import { Stack, Text } from '@mantine/core';
import React, { FC } from 'react';

import { sunriseSunset, sunAltAz, skyState, SkyState } from '../../lib/astronomy/sun';
import { useT } from '../../hooks/useT';
import type { Location } from './LocationSelector';
import styles from './Observatory.module.scss';

type Props = {
  location: Location;
  date: Date;
};

function fmt(d: Date | null, loc: Location): string {
  if (!d) return '—';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

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

  const rows: Array<{ key: string; label: JSX.Element; date: Date | null }> = [
    { key: 'astronomicalDawn', label: t('observatory.astronomicalDawn'), date: times.astronomicalDawn },
    { key: 'nauticalDawn', label: t('observatory.nauticalDawn'), date: times.nauticalDawn },
    { key: 'civilDawn', label: t('observatory.civilDawn'), date: times.civilDawn },
    { key: 'sunrise', label: t('observatory.sunrise'), date: times.sunrise },
    { key: 'sunset', label: t('observatory.sunset'), date: times.sunset },
    { key: 'civilDusk', label: t('observatory.civilDusk'), date: times.civilDusk },
    { key: 'nauticalDusk', label: t('observatory.nauticalDusk'), date: times.nauticalDusk },
    { key: 'astronomicalDusk', label: t('observatory.astronomicalDusk'), date: times.astronomicalDusk },
  ];

  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>☀️ {t('observatory.sunTitle')}</div>
      <Stack gap="xs">
        <Text size="sm">
          <span className={styles.skyStateDot} data-state={state} />
          {t(STATE_LABEL_KEYS[state])} · Alt {altAz.alt.toFixed(1)}° Az {altAz.az.toFixed(1)}°
        </Text>
        {rows.map(({ key, label, date: d }) => (
          <div key={key} className={styles.sunTimeRow}>
            <span>{label}</span>
            <span>{fmt(d, location)}</span>
          </div>
        ))}
      </Stack>
    </div>
  );
};
