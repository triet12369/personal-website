import { Skeleton, Text } from '@mantine/core';
import dynamic from 'next/dynamic';
import React, { FC } from 'react';

import { moonPhase, moonAltAz, moonRiseSet, nextMoonPhases } from '../../lib/astronomy/moon';
import { MoonTimeline } from './MoonTimeline';
import { useT } from '../../hooks/useT';
import type { Location } from './LocationSelector';
import styles from './Observatory.module.scss';

const MoonPhaseWebGL = dynamic(
  () => import('./MoonPhaseWebGL').then((m) => m.MoonPhaseWebGL),
  { ssr: false, loading: () => <Skeleton height={200} circle /> },
);

type Props = {
  location: Location;
  date: Date;
};

function fmt(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

export const MoonCard: FC<Props> = ({ location, date }) => {
  const t = useT();
  const phase = moonPhase(date);
  const altAz = moonAltAz(location.lat, location.lon, date);
  const { moonrise, moonset } = moonRiseSet(location.lat, location.lon, date);
  const next = nextMoonPhases(date);

  const illumPct = (phase.illumination * 100).toFixed(0);

  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>{t('observatory.moonTitle')}</div>
      <div className={styles.moonLayout}>
        {/* Left: WebGL moon — fills column */}
        <div className={styles.moonImageCol}>
          <MoonPhaseWebGL phaseAngle={phase.angle} />
        </div>

        {/* Right: metadata row */}
        <div className={styles.moonMetaRow}>
          <div className={styles.moonMetaItem}>
            <Text fw={600} size="sm">{phase.name}</Text>
            <Text size="xs" c="dimmed">{illumPct}% {t('observatory.illuminated')}</Text>
          </div>
          <div className={styles.moonMetaItem}>
            <Text size="xs" c="dimmed">{t('observatory.altitude')}</Text>
            <Text size="sm" fw={500}>{altAz.alt.toFixed(1)}°</Text>
          </div>
          <div className={styles.moonMetaItem}>
            <Text size="xs" c="dimmed">{t('observatory.azimuth')}</Text>
            <Text size="sm" fw={500}>{altAz.az.toFixed(1)}°</Text>
          </div>
          <div className={styles.moonMetaItem}>
            <Text size="xs" c="dimmed">{t('observatory.moonrise')}</Text>
            <Text size="sm" fw={500}>{fmt(moonrise)}</Text>
          </div>
          <div className={styles.moonMetaItem}>
            <Text size="xs" c="dimmed">{t('observatory.moonset')}</Text>
            <Text size="sm" fw={500}>{fmt(moonset)}</Text>
          </div>
        </div>
      </div>

      {/* Next phases timeline — full width below */}
      <MoonTimeline next={next} now={date} />
    </div>
  );
};
