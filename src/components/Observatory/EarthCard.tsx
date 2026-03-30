import { Modal, SimpleGrid, Skeleton, Stack, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import React, { FC, useEffect, useRef, useState } from 'react';

import { getSatelliteImage, getSatelliteImageBySat, SatelliteEarthData, SatKey } from '../../lib/satelliteEarth';
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
      <Text size="sm" fw={600} ta="center">{label}</Text>

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
        <div style={{ width: '100%', aspectRatio: '1/1', background: '#111', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Text size="xs" c="dimmed">{tStr('observatory.satUnavailable')}</Text>
        </div>
      )}

      {formattedTime && (
        <Text size="xs" c="dimmed" ta="center">{formattedTime}</Text>
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

export const EarthCard: FC<Props> = ({ location }) => {
  const t = useT();
  const { t: tStr } = useTranslation();
  const ALL_SATS = ALL_SATS_KEYS.map(({ key, labelKey }) => ({ key, label: tStr(labelKey) }));
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
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="xl" style={{ paddingBottom: '2rem' }}>
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
            <Text size="sm" c="dimmed">{t('observatory.earthError')}</Text>
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
                <Skeleton height="100%" radius="sm" style={{ position: 'absolute', inset: 0 }} />
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
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.25rem' }}>
              <Text size="xs" c="dimmed">
                {t('observatory.earthSatellite')}: <strong>{data.satellite}</strong>
              </Text>
              {formattedTime && (
                <Text size="xs" c="dimmed">{formattedTime}</Text>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
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

