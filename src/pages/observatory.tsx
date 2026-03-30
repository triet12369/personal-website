import { Container, SimpleGrid, Stack, Text, Title } from '@mantine/core';
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem', flexWrap: 'wrap' }}>
            <Stack gap="xs" align="flex-start">
              <Title order={1}>{t('observatory.heading')}</Title>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <LiveClock onMinuteTick={handleMinuteTick} />
              </div>
              <LocationSelector location={location} onLocationChange={handleLocationChange} />
            </Stack>
            {location && (
              <div style={{ flex: '1 1 340px', minWidth: 0, maxWidth: 560 }}>
                <WeatherCard location={location} />
              </div>
            )}
          </div>

          {!location && (
            <Text size="sm" c="dimmed" style={{ fontStyle: 'italic' }}>
              {t('observatory.noLocationHint')}
            </Text>
          )}

          {location && (
            <SimpleGrid
              cols={{ base: 1, sm: 2, lg: 3 }}
              spacing="md"
            >
              <SunCard location={location} date={date} />
              <MoonCard location={location} date={date} />
              <PlanetsCard location={location} date={date} />
              <NightSkyCard location={location} date={date} />
              <ISSCard location={location} date={date} />
            </SimpleGrid>
          )}
        </Stack>
      </Container>
    </Layout>
  );
}

export const getStaticProps: GetStaticProps = () => {
  return { props: {} };
};
