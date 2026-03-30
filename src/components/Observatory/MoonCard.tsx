import { Anchor, Skeleton, Slider, Text } from '@mantine/core';
import dynamic from 'next/dynamic';
import React, { FC, useState } from 'react';

import { moonPhase, moonAltAz, moonRiseSet, nextMoonPhases } from '../../lib/astronomy/moon';
import { buildStellariumUrl } from '../../lib/stellarium';
import { MoonTimeline } from './MoonTimeline';
import { useT } from '../../hooks/useT';
import { useTranslation } from 'react-i18next';
import type { Location } from './LocationSelector';
import styles from './Observatory.module.scss';

const ENABLE_DEBUG_SLIDER = false;

const MoonPhaseWebGL = dynamic(
  () => import('./MoonPhaseWebGL').then((m) => m.MoonPhaseWebGL),
  { ssr: false, loading: () => <Skeleton height={"100%"} circle /> },
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
  const { t: tStr } = useTranslation();

  // Timeline scrubbing: null = live (current date), otherwise overridden
  const [timelineDate, setTimelineDate] = useState<Date | null>(null);
  const activeDate = timelineDate ?? date;

  const phase = moonPhase(activeDate);
  const altAz = moonAltAz(location.lat, location.lon, activeDate);
  const { moonrise, moonset } = moonRiseSet(location.lat, location.lon, activeDate);
  const next = nextMoonPhases(date);

  const [debugAngle, setDebugAngle] = useState<number | null>(null);
  const activeAngle = debugAngle ?? phase.angle;
  const illumPct = (phase.illumination * 100).toFixed(0);

  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>{t('observatory.moonTitle')}</div>
      <div className={styles.moonLayout}>
        {/* Left: WebGL moon — fills column */}
        <div className={styles.moonImageCol}>
          <MoonPhaseWebGL phaseAngle={activeAngle} latitude={location.lat} debug={ENABLE_DEBUG_SLIDER} />
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

      <Anchor
        href={buildStellariumUrl({ lat: location.lat, lng: location.lon, date, az: altAz.az, alt: altAz.alt, objectName: 'Moon', fov: 5 })}
        target="_blank"
        rel="noopener noreferrer"
        size="xs"
        title={tStr('observatory.viewInStellarium')}
        style={{ display: 'block', textAlign: 'center', opacity: 0.65, marginBottom: '0.25rem' }}
      >
        {tStr('observatory.viewInStellarium')} ↗
      </Anchor>

      {/* Next phases timeline — full width below */}
      <MoonTimeline
        next={next}
        now={date}
        overrideDate={timelineDate}
        onDateChange={setTimelineDate}
        onReturnToNow={() => setTimelineDate(null)}
      />

      {/* Debug: phase angle slider */}
      {ENABLE_DEBUG_SLIDER && (
        <div style={{ marginTop: 12 }}>
          <Text size="xs" c="dimmed" mb={4}>
            Debug phase angle: {activeAngle.toFixed(1)}°
            {debugAngle === null ? ' (live)' : ' (override)'}
          </Text>
          <Slider
            min={0}
          max={359}
          step={1}
          value={Math.round(activeAngle)}
          onChange={setDebugAngle}
          marks={[
            { value: 0, label: 'New' },
            { value: 90, label: '1Q' },
            { value: 180, label: 'Full' },
            { value: 270, label: '3Q' },
          ]}
          styles={{ markLabel: { fontSize: 10 } }}
        />
        {debugAngle !== null && (
          <Text
            size="xs"
            c="blue"
            style={{ cursor: 'pointer', marginTop: 6, display: 'inline-block' }}
            onClick={() => setDebugAngle(null)}
          >
            ↩ reset to live
          </Text>
        )}
      </div>
      )}
    </div>
  );
};
