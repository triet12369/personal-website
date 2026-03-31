import { Modal, SimpleGrid, Skeleton, Stack, Text, Tooltip } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import React, { FC, useEffect, useRef, useState } from 'react';

import {
  getSatelliteImage,
  getSatelliteImageBySat,
  SatelliteEarthData,
  SatKey,
} from '../../lib/satelliteEarth';
import { geoToImageFraction } from '../../lib/satelliteProjection';
import { useT } from '../../hooks/useT';
import { useTranslation } from 'react-i18next';
import type { Location } from './LocationSelector';
import styles from './Observatory.module.scss';

type Props = {
  location: Location;
  date: Date;
};

const REFRESH_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

const ALL_SATS_KEYS: Array<{ key: SatKey; labelKey: string }> = [
  { key: 'GOES19', labelKey: 'observatory.satGOES19' },
  { key: 'GOES18', labelKey: 'observatory.satGOES18' },
  { key: 'Himawari9', labelKey: 'observatory.satHimawari9' },
];

// Individual tile shown in the all-satellites modal
function SatTile({ satKey, label }: { satKey: SatKey; label: string }) {
  const { t: tStr } = useTranslation();
  const [data, setData] = useState<SatelliteEarthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSatelliteImageBySat(satKey)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [satKey]);

  const formattedTime = data
    ? new Date(data.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'UTC',
      }) + ' UTC'
    : null;

  return (
    <Stack gap="xs">
      <Text size="sm" fw={600} ta="center">
        {label}
      </Text>

      {loading ? (
        <Skeleton height={320} radius="sm" />
      ) : data ? (
        <img
          src={data.imageUrl}
          alt={`${label} full-disk Earth`}
          style={{
            width: '100%',
            aspectRatio: '1 / 1',
            objectFit: 'contain',
            background: '#000',
            borderRadius: 6,
            display: 'block',
          }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            aspectRatio: '1/1',
            background: '#111',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text size="xs" c="dimmed">
            {tStr('observatory.satUnavailable')}
          </Text>
        </div>
      )}

      {formattedTime && (
        <Text size="xs" c="dimmed" ta="center">
          {formattedTime}
        </Text>
      )}
      {data && (
        <Text size="xs" c="dimmed" ta="center">
          <a
            href={data.attributionUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'inherit', textDecoration: 'underline' }}
          >
            {data.attribution}
          </a>
        </Text>
      )}
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Location marker overlay
// ---------------------------------------------------------------------------

const PULSE_KEYFRAMES = `
@keyframes obs-marker-ring1 {
  0%   { opacity: 0.75; r: 0.012; }
  100% { opacity: 0;    r: 0.038; }
}
@keyframes obs-marker-ring2 {
  0%   { opacity: 0.75; r: 0.012; }
  100% { opacity: 0;    r: 0.038; }
}
`;

function LocationMarker({
  lat,
  lon,
  satellite,
}: {
  lat: number;
  lon: number;
  satellite: string;
}) {
  const t = useT();
  const pos = geoToImageFraction(lat, lon, satellite);
  if (!pos) return null;

  const { px, py } = pos;
  const DOT_R = 0.014;
  const RING_W = 0.003;

  const tooltipLabel = (
    <>
      <div style={{ fontWeight: 600 }}>{t('observatory.earthYouAreHere')}</div>
      <div
        style={{ opacity: 0.7, fontSize: '0.75em' }}
      >{`${lat.toFixed(2)}°, ${lon.toFixed(2)}°`}</div>
    </>
  );

  return (
    <>
      <style>{PULSE_KEYFRAMES}</style>

      {/* SVG is purely visual — no pointer events */}
      <svg
        viewBox="0 0 1 1"
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          overflow: 'visible',
          pointerEvents: 'none',
        }}
      >
        {/* Dark halo */}
        <circle cx={px} cy={py} r={DOT_R + 0.006} fill="rgba(0,0,0,0.45)" />

        {/* Pulsing rings — staggered 1 s apart */}
        <circle
          cx={px}
          cy={py}
          r={DOT_R}
          fill="none"
          stroke="rgba(99,210,255,0.9)"
          strokeWidth={RING_W}
          style={{ animation: 'obs-marker-ring1 2s ease-out infinite' }}
        />
        <circle
          cx={px}
          cy={py}
          r={DOT_R}
          fill="none"
          stroke="rgba(99,210,255,0.9)"
          strokeWidth={RING_W}
          style={{ animation: 'obs-marker-ring2 2s ease-out 1s infinite' }}
        />

        {/* Crosshair lines */}
        <line
          x1={px - DOT_R * 1.8}
          y1={py}
          x2={px - DOT_R * 1.1}
          y2={py}
          stroke="rgba(255,255,255,0.85)"
          strokeWidth={RING_W * 0.9}
        />
        <line
          x1={px + DOT_R * 1.1}
          y1={py}
          x2={px + DOT_R * 1.8}
          y2={py}
          stroke="rgba(255,255,255,0.85)"
          strokeWidth={RING_W * 0.9}
        />
        <line
          x1={px}
          y1={py - DOT_R * 1.8}
          x2={px}
          y2={py - DOT_R * 1.1}
          stroke="rgba(255,255,255,0.85)"
          strokeWidth={RING_W * 0.9}
        />
        <line
          x1={px}
          y1={py + DOT_R * 1.1}
          x2={px}
          y2={py + DOT_R * 1.8}
          stroke="rgba(255,255,255,0.85)"
          strokeWidth={RING_W * 0.9}
        />

        {/* Solid dot */}
        <circle
          cx={px}
          cy={py}
          r={DOT_R * 0.45}
          fill="rgba(99,210,255,1)"
          stroke="white"
          strokeWidth={RING_W * 0.7}
        />
      </svg>

      {/* Mantine Tooltip — positioned div acts as the anchor */}
      <Tooltip label={tooltipLabel} withArrow position="top" openDelay={100}>
        <div
          style={{
            position: 'absolute',
            left: `${px * 100}%`,
            top: `${py * 100}%`,
            width: `${DOT_R * 2 * 100}%`,
            height: `${DOT_R * 2 * 100}%`,
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%',
            cursor: 'default',
          }}
        />
      </Tooltip>
    </>
  );
}

export const EarthCard: FC<Props> = ({ location }) => {
  const t = useT();
  const { t: tStr } = useTranslation();
  const ALL_SATS = ALL_SATS_KEYS.map(({ key, labelKey }) => ({
    key,
    label: tStr(labelKey),
  }));
  const [opened, { open, close }] = useDisclosure(false);
  const [data, setData] = useState<SatelliteEarthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = async (lat: number, lon: number) => {
    setLoading(true);
    setError(false);
    try {
      const result = await getSatelliteImage(lat, lon);
      setData(result);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(location.lat, location.lon);

    intervalRef.current = setInterval(() => {
      load(location.lat, location.lon);
    }, REFRESH_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.lat, location.lon]);

  const formattedTime = data
    ? new Date(data.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'UTC',
      }) + ' UTC'
    : null;

  return (
    <>
      <Modal
        opened={opened}
        onClose={close}
        title={t('observatory.earthAllSatellites')}
        fullScreen
      >
        <SimpleGrid
          cols={{ base: 1, sm: 3 }}
          spacing="xl"
          style={{ paddingBottom: '2rem' }}
        >
          {ALL_SATS.map(({ key, label }) => (
            <SatTile key={key} satKey={key} label={label} />
          ))}
        </SimpleGrid>
      </Modal>

      <div className={styles.card} style={{ height: '100%' }}>
        <div className={styles.cardTitle} style={{ marginBottom: '0.5rem' }}>
          {t('observatory.earthTitle')}
        </div>

        {loading && !data && <Skeleton height={200} radius="sm" />}

        {error && !data && (
          <Stack gap="xs" align="center" style={{ padding: '1rem 0' }}>
            <Text size="sm" c="dimmed">
              {t('observatory.earthError')}
            </Text>
            <button
              onClick={() => load(location.lat, location.lon)}
              style={{
                background: 'transparent',
                border: '1px solid currentColor',
                borderRadius: 4,
                padding: '2px 10px',
                cursor: 'pointer',
                fontSize: '0.8rem',
                color: 'inherit',
              }}
            >
              {t('observatory.earthRefresh')}
            </button>
          </Stack>
        )}

        {data && (
          <Stack gap="xs">
            <div style={{ position: 'relative' }}>
              {loading && (
                <Skeleton
                  height="100%"
                  radius="sm"
                  style={{ position: 'absolute', inset: 0 }}
                />
              )}
              <img
                src={data.imageUrl}
                alt={`${data.satellite} full-disk Earth image`}
                loading="lazy"
                style={{
                  width: '100%',
                  aspectRatio: '1 / 1',
                  objectFit: 'contain',
                  background: '#000',
                  borderRadius: 6,
                  display: 'block',
                  opacity: loading ? 0.4 : 1,
                  transition: 'opacity 0.3s',
                }}
                onError={() => setError(true)}
              />
              <LocationMarker
                lat={location.lat}
                lon={location.lon}
                satellite={data.satellite}
              />
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                flexWrap: 'wrap',
                gap: '0.25rem',
              }}
            >
              <Text size="xs" c="dimmed">
                {t('observatory.earthSatellite')}: <strong>{data.satellite}</strong>
              </Text>
              {formattedTime && (
                <Text size="xs" c="dimmed">
                  {formattedTime}
                </Text>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
              }}
            >
              <Text size="xs" c="dimmed">
                {t('observatory.earthAttribution')}:{' '}
                <a
                  href={data.attributionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'inherit', textDecoration: 'underline' }}
                >
                  {data.attribution}
                </a>
              </Text>
              <Text
                size="xs"
                style={{ cursor: 'pointer', textDecoration: 'underline', opacity: 0.65 }}
                onClick={open}
              >
                {t('observatory.earthViewAll')}
              </Text>
            </div>
          </Stack>
        )}
      </div>
    </>
  );
};
