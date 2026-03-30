import { Stack, Text } from '@mantine/core';
import React, { FC } from 'react';

import { getVisiblePlanets, PlanetInfo } from '../../lib/astronomy/planets';
import { useT } from '../../hooks/useT';
import type { Location } from './LocationSelector';
import styles from './Observatory.module.scss';

type Props = {
  location: Location;
  date: Date;
};

const PLANET_EMOJI: Record<string, string> = {
  Mercury: '☿',
  Venus: '♀',
  Mars: '♂',
  Jupiter: '♃',
  Saturn: '♄',
};

function fmt(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

export const PlanetsCard: FC<Props> = ({ location, date }) => {
  const t = useT();
  const planets = getVisiblePlanets(location.lat, location.lon, date);

  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>🪐 {t('observatory.planetsTitle')}</div>
      <Stack gap={0}>
        {planets.map((p: PlanetInfo) => (
          <div
            key={p.name}
            className={`${styles.planetRow} ${p.altAz.alt <= 0 ? styles.belowHorizon : ''}`}
          >
            <span className={styles.planetName}>
              {PLANET_EMOJI[p.name]} {p.name}
            </span>
            <span style={{ fontSize: '0.78rem' }}>
              {p.altAz.alt.toFixed(1)}° / {p.altAz.az.toFixed(1)}°
            </span>
            <span style={{ minWidth: 80, textAlign: 'right', fontSize: '0.78rem' }}>
              {p.altAz.alt <= 0 ? (
                <Text component="span" c="dimmed" size="xs">{t('observatory.belowHorizon')}</Text>
              ) : (
                <Text component="span" c="teal" size="xs">{t('observatory.visible')}</Text>
              )}
            </span>
            <span style={{ minWidth: 100, textAlign: 'right', fontSize: '0.78rem', opacity: 0.6 }}>
              ↑{fmt(p.riseTime)} ↓{fmt(p.setTime)}
            </span>
          </div>
        ))}
      </Stack>
    </div>
  );
};
