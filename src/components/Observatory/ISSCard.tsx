import { Badge, Group, SegmentedControl, Skeleton, Stack, Text } from '@mantine/core';
import dynamic from 'next/dynamic';
import React, { FC, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useT } from '../../hooks/useT';

import { getSatrec, computeISSPosition, getISSGroundTrack, getISSPasses, azimuthToDirection, ISSPass, ISSPosition, GroundTrackPoint } from '../../lib/iss';
import { sunSubSolarPoint } from '../../lib/astronomy/sun';
import type { Location } from './LocationSelector';
import styles from './Observatory.module.scss';

// Dynamic imports (no SSR — both need browser APIs)
const ISSGroundTrack2D = dynamic(() => import('./ISSGroundTrack2D').then((m) => m.ISSGroundTrack2D), {
  ssr: false,
  loading: () => <Skeleton height={320} radius="md" />,
});

const ISSGroundTrackWebGL = dynamic(() => import('./ISSGroundTrackWebGL').then((m) => m.ISSGroundTrackWebGL), {
  ssr: false,
  loading: () => <Skeleton height={320} radius="md" />,
});

type Props = {
  location: Location;
  date: Date;
};

function fmt(d: Date): string {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

function fmtDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

export const ISSCard: FC<Props> = ({ location, date }) => {
  const { t: tStr } = useTranslation();
  const t = useT();
  const [view, setView] = useState<'2d' | '3d'>('2d');
  const [position, setPosition] = useState<ISSPosition | null>(null);
  const [track, setTrack] = useState<GroundTrackPoint[]>([]);
  const [passes, setPasses] = useState<ISSPass[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());
  const rafRef = useRef<number | null>(null);
  const satrecRef = useRef<Awaited<ReturnType<typeof getSatrec>> | null>(null);
  const lastTrackRefreshRef = useRef<number>(0);

  // Load TLE data once (pass predictions + initial track)
  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      getISSPasses(location.lat, location.lon, 0, date),
      getISSGroundTrack(new Date(), 90, 90, 30),
      getSatrec(),
    ])
      .then(([p, tr, satrec]) => {
        setPasses(p);
        setTrack(tr);
        satrecRef.current = satrec;
        setPosition(computeISSPosition(satrec));
      })
      .catch(() => setError(tStr('observatory.issError')))
      .finally(() => setLoading(false));
  }, [location.lat, location.lon]); // eslint-disable-line react-hooks/exhaustive-deps

  // Animate ISS position using requestAnimationFrame, throttled to ~200ms (5fps)
  // SGP4 propagation is synchronous and takes <1ms, so this is safe on the main thread.
  useEffect(() => {
    const INTERVAL_MS = 200;
    const TRACK_REFRESH_MS = 60_000;
    let lastUpdate = 0;

    const tick = (ts: number) => {
      rafRef.current = requestAnimationFrame(tick);
      if (ts - lastUpdate < INTERVAL_MS) return;
      lastUpdate = ts;

      const satrec = satrecRef.current;
      if (!satrec) return;

      const now = new Date();
      setPosition(computeISSPosition(satrec, now));
      setNow(now);

      // Refresh ground track every 60 seconds
      if (now.getTime() - lastTrackRefreshRef.current > TRACK_REFRESH_MS) {
        lastTrackRefreshRef.current = now.getTime();
        getISSGroundTrack(now, 90, 90, 30)
          .then(setTrack)
          .catch(() => { /* silent */ });
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, []);

  // Sun direction for the 3D globe lighting — always use real current time,
  // not the user-controlled `date` prop, so the daylight terminator is absolute.
  const subSolar = sunSubSolarPoint(now);

  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>
        <img src="/images/iss_icon.png" alt="ISS" style={{ width: 16, height: 16, verticalAlign: 'middle', marginRight: 6 }} />
        {t('observatory.issTitle')}
      </div>
      <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Future passes */}
        <Stack gap="md" style={{ flex: '1 1 200px', minWidth: 0 }}>
          {loading && <Skeleton height={100} radius="md" />}
          {error && <Text size="sm" c="red">{error}</Text>}

          {position && !loading && (
            <span className={styles.issPosition}>
              {t('observatory.issLat')}: {position.lat.toFixed(2)}° ·{' '}
              {t('observatory.issLon')}: {position.lon.toFixed(2)}° ·{' '}
              {tStr('observatory.altitude')}: {position.alt.toFixed(0)} km
            </span>
          )}

          {passes.length > 0 && (
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={600} style={{ letterSpacing: '0.1em' }} mb={6}>
                {t('observatory.nextPasses')}
              </Text>
              {passes.slice(0, 3).map((p, i) => (
                <div key={i} className={styles.passCard}>
                  <Group justify="space-between" align="flex-start">
                    <div>
                      <div className={styles.passTime}>{fmt(p.start)}</div>
                      <Text size="xs" c="dimmed">
                        {p.start.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                      </Text>
                    </div>
                    <Badge color="cyan" variant="light">
                      {tStr('observatory.issMax')} {p.maxElevation.toFixed(0)}°
                    </Badge>
                  </Group>
                  <Text size="xs" c="dimmed" mt={4}>
                    {fmtDuration(p.duration)} · {azimuthToDirection(p.startAzimuth)} → {azimuthToDirection(p.endAzimuth)}
                  </Text>
                </div>
              ))}
              {passes.length === 0 && (
                <Text size="sm" c="dimmed">{t('observatory.noPassesSoon')}</Text>
              )}
            </div>
          )}
        </Stack>

        {/* Visualization */}
        <div style={{ flex: '2 1 360px', minWidth: 0 }}>
          <SegmentedControl
            className={styles.mapToggle}
            value={view}
            onChange={(v) => setView(v as '2d' | '3d')}
            data={[
              { label: t('observatory.map2D'), value: '2d' },
              { label: t('observatory.globe3D'), value: '3d' },
            ]}
            size="xs"
          />
          <div className={styles.mapContainer}>
            {position && track.length > 0 ? (
              view === '2d' ? (
                <ISSGroundTrack2D position={position} track={track} now={now} />
              ) : (
                <ISSGroundTrackWebGL
                  position={position}
                  track={track}
                  now={now}
                  sunLat={subSolar.lat}
                  sunLon={subSolar.lon}
                />
              )
            ) : (
              <Skeleton height="100%" radius="md" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
