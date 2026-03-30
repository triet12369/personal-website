import { Container, Stack, Text, Title } from '@mantine/core';
import { GetStaticProps } from 'next';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useT } from '../hooks/useT';
import { Layout } from '../components/Layout/Layout';
import { LiveClock } from '../components/Observatory/LiveClock';
import { LocationSelector, loadLocation, Location } from '../components/Observatory/LocationSelector';
import { SunCard } from '../components/Observatory/SunCard';
import { MoonCard } from '../components/Observatory/MoonCard';
import { PlanetsCard } from '../components/Observatory/PlanetsCard';
import { NightSkyCard } from '../components/Observatory/NightSkyCard';
import { ISSCard } from '../components/Observatory/ISSCard';
import { WeatherCard } from '../components/Observatory/WeatherCard';
import { EarthCard } from '../components/Observatory/EarthCard';
import obsStyles from '../components/Observatory/Observatory.module.scss';

export default function ObservatoryPage() {
  const { t: tStr } = useTranslation();
  const t = useT();

  const [location, setLocation] = useState<Location | null>(null);
  const [date, setDate] = useState(() => new Date());

  // Load persisted location on mount
  useEffect(() => {
    const loc = loadLocation();
    if (loc) setLocation(loc);
  }, []);

  const handleMinuteTick = useCallback((d: Date) => {
    setDate(d);
  }, []);

  const handleLocationChange = useCallback((loc: Location) => {
    setLocation(loc);
  }, []);

  return (
    <Layout title={tStr('observatory.pageTitle')} blurBackground>
      <Container size="xl" py="xl">
        <Stack gap="lg">
          {/* Header */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'stretch' }}>
            <div style={{ flex: '1 1 200px', minWidth: 0 }}>
              <div className={obsStyles.card} style={{ height: '100%' }}>
                <Stack gap="xs" align="center" justify='center' style={{ height: '100%'}}>
                  <Title order={1}>{t('observatory.heading')}</Title>
                  <LiveClock onMinuteTick={handleMinuteTick} />
                  <LocationSelector location={location} onLocationChange={handleLocationChange} />
                </Stack>
              </div>
            </div>
            {location && (
              <div style={{ flex: '1 1 400px', minWidth: 0 }}>
                <WeatherCard location={location} />
              </div>
            )}
          </div>

          {!location && (
            <Text size="sm" c="dimmed" style={{ fontStyle: 'italic' }}>
              {t('observatory.noLocationHint')}
            </Text>
          )}

          {/* Earth · Sun · Moon */}
          {location && (
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'stretch' }}>
              <div style={{ flex: '1 1 min(100%, 280px)', minWidth: 0 }}>
                <EarthCard location={location} date={date} />
              </div>
              <div style={{ flex: '1 1 min(100%, 280px)', minWidth: 0 }}>
                <SunCard location={location} date={date} />
              </div>
              <div style={{ flex: '1 1 min(100%, 280px)', minWidth: 0 }}>
                <MoonCard location={location} date={date} />
              </div>
            </div>
          )}

          {/* Planets · Night Sky */}
          {location && (
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'stretch' }}>
              <div style={{ flex: '1 1 min(100%, 340px)', minWidth: 0 }}>
                <PlanetsCard location={location} date={date} />
              </div>
              <div style={{ flex: '1 1 min(100%, 340px)', minWidth: 0 }}>
                <NightSkyCard location={location} date={date} />
              </div>
            </div>
          )}

          {/* ISS */}
          {location && <ISSCard location={location} date={date} />}
        </Stack>
      </Container>
    </Layout>
  );
}

export const getStaticProps: GetStaticProps = () => {
  return { props: {} };
};
