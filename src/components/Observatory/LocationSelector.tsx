/**
 * Location selector with geolocation auto-detect and manual fallback.
 */

import { ActionIcon, Button, Group, Modal, NumberInput, Stack, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import React, { FC, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useT } from '../../hooks/useT';

const LS_KEY = 'obs_location';

export type Location = {
  lat: number;
  lon: number;
};

function loadLocation(): Location | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as Location;
  } catch { /* ignore */ }
  return null;
}

function saveLocation(loc: Location): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(loc));
  } catch { /* ignore */ }
}

type Props = {
  location: Location | null;
  onLocationChange: (loc: Location) => void;
};

export const LocationSelector: FC<Props> = ({ location, onLocationChange }) => {
  const { t: tStr } = useTranslation();
  const t = useT();
  const [opened, { open, close }] = useDisclosure(false);
  const [lat, setLat] = useState<number>(location?.lat ?? 0);
  const [lon, setLon] = useState<number>(location?.lon ?? 0);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detect = useCallback(() => {
    if (!navigator.geolocation) {
      setError(tStr('observatory.locationNoGeo'));
      return;
    }
    setDetecting(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc: Location = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        saveLocation(loc);
        onLocationChange(loc);
        setLat(loc.lat);
        setLon(loc.lon);
        setDetecting(false);
        close();
      },
      () => {
        setError(tStr('observatory.locationDenied'));
        setDetecting(false);
      },
      { timeout: 10000 },
    );
  }, [t, onLocationChange, close]);

  const apply = useCallback(() => {
    const loc: Location = { lat, lon };
    saveLocation(loc);
    onLocationChange(loc);
    close();
  }, [lat, lon, onLocationChange, close]);

  return (
    <>
      <Button variant="outline" size="sm" onClick={open}>
        {location
          ? `${location.lat.toFixed(2)}°, ${location.lon.toFixed(2)}°`
          : t('observatory.setLocation')}
      </Button>

      <Modal opened={opened} onClose={close} title={t('observatory.locationTitle')} size="sm">
        <Stack gap="md">
          <Button
            onClick={detect}
            loading={detecting}
            variant="light"
            fullWidth
          >
            {t('observatory.detectLocation')}
          </Button>
          {error && <Text size="sm" c="red">{error}</Text>}
          <Text size="sm" c="dimmed">{t('observatory.orEnterManual')}</Text>
          <Group grow>
            <NumberInput
              label={t('observatory.latitude')}
              value={lat}
              onChange={(v) => setLat(Number(v))}
              min={-90}
              max={90}
              decimalScale={4}
              step={0.1}
            />
            <NumberInput
              label={t('observatory.longitude')}
              value={lon}
              onChange={(v) => setLon(Number(v))}
              min={-180}
              max={180}
              decimalScale={4}
              step={0.1}
            />
          </Group>
          <Button onClick={apply} fullWidth>{t('observatory.applyLocation')}</Button>
        </Stack>
      </Modal>
    </>
  );
};

export { loadLocation };
