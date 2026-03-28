import React, { useEffect, useState } from 'react';

import styles from './WeatherWidget.module.scss';

// WMO Weather Code descriptions — https://open-meteo.com/en/docs#weathervariables
const WMO_CODES: Record<number, { label: string; icon: string }> = {
  0: { label: 'Clear sky', icon: '☀️' },
  1: { label: 'Mainly clear', icon: '🌤️' },
  2: { label: 'Partly cloudy', icon: '⛅' },
  3: { label: 'Overcast', icon: '☁️' },
  45: { label: 'Foggy', icon: '🌫️' },
  48: { label: 'Icy fog', icon: '🌫️' },
  51: { label: 'Light drizzle', icon: '🌦️' },
  53: { label: 'Drizzle', icon: '🌦️' },
  55: { label: 'Heavy drizzle', icon: '🌧️' },
  61: { label: 'Light rain', icon: '🌧️' },
  63: { label: 'Rain', icon: '🌧️' },
  65: { label: 'Heavy rain', icon: '🌧️' },
  71: { label: 'Light snow', icon: '🌨️' },
  73: { label: 'Snow', icon: '❄️' },
  75: { label: 'Heavy snow', icon: '❄️' },
  80: { label: 'Rain showers', icon: '🌦️' },
  81: { label: 'Rain showers', icon: '🌧️' },
  82: { label: 'Violent showers', icon: '⛈️' },
  95: { label: 'Thunderstorm', icon: '⛈️' },
  96: { label: 'Thunderstorm + hail', icon: '⛈️' },
  99: { label: 'Thunderstorm + hail', icon: '⛈️' },
};

type WeatherState =
  | { status: 'idle' }
  | { status: 'locating' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'done'; temp: number; unit: string; code: number };

export const WeatherWidget: React.FC = () => {
  const [weather, setWeather] = useState<WeatherState>({ status: 'idle' });

  useEffect(() => {
    if (!navigator.geolocation) {
      setWeather({
        status: 'error',
        message: 'Geolocation is not supported by your browser.',
      });
      return;
    }

    setWeather({ status: 'locating' });

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        setWeather({ status: 'loading' });
        try {
          const url = new URL('https://api.open-meteo.com/v1/forecast');
          url.searchParams.set('latitude', coords.latitude.toFixed(4));
          url.searchParams.set('longitude', coords.longitude.toFixed(4));
          url.searchParams.set('current', 'temperature_2m,weather_code');
          url.searchParams.set('temperature_unit', 'celsius');
          url.searchParams.set('forecast_days', '1');

          const res = await fetch(url.toString());
          if (!res.ok) throw new Error(`Weather API error: ${res.status}`);
          const json = await res.json();
          const current = json?.current;
          setWeather({
            status: 'done',
            temp: Math.round(current.temperature_2m),
            unit: '°C',
            code: current.weather_code,
          });
        } catch {
          setWeather({ status: 'error', message: 'Could not fetch weather data.' });
        }
      },
      () => {
        setWeather({ status: 'error', message: 'Location access was denied.' });
      },
    );
  }, []);

  return (
    <div className={styles.widget}>
      {weather.status === 'idle' && (
        <span className={styles.muted}>Weather widget loading…</span>
      )}
      {(weather.status === 'locating' || weather.status === 'loading') && (
        <span className={styles.muted}>
          {weather.status === 'locating'
            ? '📍 Detecting location…'
            : '🌐 Fetching weather…'}
        </span>
      )}
      {weather.status === 'error' && (
        <span className={styles.error}>⚠️ {weather.message}</span>
      )}
      {weather.status === 'done' && (
        <>
          <span className={styles.icon}>{WMO_CODES[weather.code]?.icon ?? '🌡'}</span>
          <span className={styles.temp}>
            {weather.temp}
            {weather.unit}
          </span>
          <span className={styles.label}>
            {WMO_CODES[weather.code]?.label ?? 'Unknown'}
          </span>
          <span className={styles.muted}>near your location</span>
        </>
      )}
    </div>
  );
};
