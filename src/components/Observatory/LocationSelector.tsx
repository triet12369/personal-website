/**
 * Location selector with geolocation auto-detect and manual fallback.
 */

import {
  ActionIcon,
  Autocomplete,
  Button,
  Group,
  Loader,
  Modal,
  NumberInput,
  Stack,
  Text,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import React, { FC, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useT } from '../../hooks/useT';

const LS_KEY = 'obs_location';
const LS_CITY_KEY = 'obs_location_city';

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

function loadCityName(): string {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(LS_CITY_KEY) ?? '';
  } catch {
    return '';
  }
}

function saveCityName(name: string): void {
  try {
    localStorage.setItem(LS_CITY_KEY, name);
  } catch {
    /* ignore */
  }
}

async function reverseGeocode(lat: number, lon: number): Promise<string> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  if (!res.ok) throw new Error('Nominatim error');
  const data = (await res.json()) as { address?: Record<string, string> };
  const a = data.address ?? {};
  const city = a.city ?? a.town ?? a.village ?? a.county ?? '';
  const region =
    a.state ?? a.country ?? (a.country_code ? a.country_code.toUpperCase() : '');
  if (city && region) return `${city}, ${region}`;
  return city;
}

type Props = {
  location: Location | null;
  onLocationChange: (loc: Location) => void;
  onCityNameChange?: (name: string) => void;
};

type CityOption = {
  value: string; // display label used by Autocomplete
  lat: number;
  lon: number;
};

async function searchCities(query: string): Promise<CityOption[]> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6&addressdetails=1`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  if (!res.ok) throw new Error('Nominatim error');
  const data = (await res.json()) as Array<{
    display_name: string;
    lat: string;
    lon: string;
  }>;
  return data.map((item) => ({
    value: item.display_name,
    lat: parseFloat(item.lat),
    lon: parseFloat(item.lon),
  }));
}

export const LocationSelector: FC<Props> = ({
  location,
  onLocationChange,
  onCityNameChange,
}) => {
  const { t: tStr } = useTranslation();
  const t = useT();
  const [opened, { open, close }] = useDisclosure(false);
  const [lat, setLat] = useState<number>(location?.lat ?? 0);
  const [lon, setLon] = useState<number>(location?.lon ?? 0);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>(() => loadCityName());

  // City search state
  const [cityQuery, setCityQuery] = useState('');
  const [cityOptions, setCityOptions] = useState<CityOption[]>([]);
  const [citySearching, setCitySearching] = useState(false);
  const [cityError, setCityError] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCityChange = (value: string) => {
    setCityQuery(value);
    setCityError(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) {
      setCityOptions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setCitySearching(true);
      try {
        const results = await searchCities(value);
        // Deduplicate by display label — Nominatim can return identical names
        const seen = new Set<string>();
        const unique = results.filter((o) => {
          if (seen.has(o.value)) return false;
          seen.add(o.value);
          return true;
        });
        setCityOptions(unique);
      } catch {
        setCityError(true);
        setCityOptions([]);
      } finally {
        setCitySearching(false);
      }
    }, 400);
  };

  const handleCitySelect = (value: string) => {
    const found = cityOptions.find((o) => o.value === value);
    if (found) {
      setLat(parseFloat(found.lat.toFixed(4)));
      setLon(parseFloat(found.lon.toFixed(4)));
      setCityQuery(value);
      // Use first 2 comma-separated parts as short display name (e.g. "Dallas, Texas")
      const parts = value.split(',');
      const short = parts
        .slice(0, 2)
        .map((p) => p.trim())
        .join(', ');
      setDisplayName(short);
      saveCityName(short);
      onCityNameChange?.(short);
    }
  };

  const detect = useCallback(() => {
    if (!navigator.geolocation) {
      setError(tStr('observatory.locationNoGeo'));
      return;
    }
    setDetecting(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const loc: Location = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        saveLocation(loc);
        onLocationChange(loc);
        setLat(loc.lat);
        setLon(loc.lon);
        setDetecting(false);
        close();
        try {
          const name = await reverseGeocode(loc.lat, loc.lon);
          if (name) {
            setDisplayName(name);
            saveCityName(name);
            onCityNameChange?.(name);
          }
        } catch {
          /* ignore — coordinates still work */
        }
      },
      () => {
        setError(tStr('observatory.locationDenied'));
        setDetecting(false);
      },
      { timeout: 10000 },
    );
  }, [t, onLocationChange, close]);

  const apply = useCallback(async () => {
    const loc: Location = { lat, lon };
    saveLocation(loc);
    onLocationChange(loc);
    close();
    try {
      const name = await reverseGeocode(lat, lon);
      if (name) {
        setDisplayName(name);
        saveCityName(name);
        onCityNameChange?.(name);
      }
    } catch {
      /* ignore — coordinates still work */
    }
  }, [lat, lon, onLocationChange, close, onCityNameChange]);

  return (
    <>
      <Button variant="outline" size="sm" onClick={open}>
        {location
          ? displayName || `${location.lat.toFixed(2)}°, ${location.lon.toFixed(2)}°`
          : t('observatory.setLocation')}
      </Button>

      <Modal
        opened={opened}
        onClose={close}
        title={t('observatory.locationTitle')}
        size="sm"
      >
        <Stack gap="md">
          <Button onClick={detect} loading={detecting} variant="light" fullWidth>
            {t('observatory.detectLocation')}
          </Button>
          {error && (
            <Text size="sm" c="red">
              {error}
            </Text>
          )}

          <Autocomplete
            label={tStr('observatory.locationCitySearch')}
            placeholder={tStr('observatory.locationCityPlaceholder')}
            value={cityQuery}
            onChange={handleCityChange}
            onOptionSubmit={handleCitySelect}
            data={cityOptions.map((o) => o.value)}
            rightSection={citySearching ? <Loader size="xs" /> : null}
            maxDropdownHeight={240}
            filter={({ options }) => options}
          />
          {cityError && (
            <Text size="sm" c="red">
              {tStr('observatory.locationCityError')}
            </Text>
          )}

          <Text size="sm" c="dimmed">
            {t('observatory.orEnterManual')}
          </Text>
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
          <Button onClick={apply} fullWidth>
            {t('observatory.applyLocation')}
          </Button>
        </Stack>
      </Modal>
    </>
  );
};

export { loadLocation, loadCityName };
