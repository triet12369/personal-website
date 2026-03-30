import { Stack, Text } from '@mantine/core';
import React, { FC } from 'react';

import { getVisibleStars, getVisibleConstellations } from '../../lib/astronomy/sky';
import { useT } from '../../hooks/useT';
import type { Location } from './LocationSelector';
import styles from './Observatory.module.scss';

type Props = {
  location: Location;
  date: Date;
};

export const NightSkyCard: FC<Props> = ({ location, date }) => {
  const t = useT();
  const stars = getVisibleStars(location.lat, location.lon, date);
  const constellations = getVisibleConstellations(location.lat, location.lon, date).filter((c) => c.visible);

  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>✨ {t('observatory.nightSkyTitle')}</div>
      <Stack gap="md">
        <div>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600} style={{ letterSpacing: '0.1em' }} mb={6}>
            {t('observatory.brightStars')} ({stars.length})
          </Text>
          {stars.length === 0 ? (
            <Text size="sm" c="dimmed">{t('observatory.noneVisible')}</Text>
          ) : (
            <div className={styles.starGrid}>
              {stars.slice(0, 16).map((s) => (
                <div key={s.name} className={styles.starItem}>
                  <Text size="xs" fw={600}>{s.name}</Text>
                  <Text size="xs" c="dimmed">{s.bayer} · {s.altAz.alt.toFixed(0)}°</Text>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600} style={{ letterSpacing: '0.1em' }} mb={6}>
            {t('observatory.constellations')} ({constellations.length})
          </Text>
          {constellations.length === 0 ? (
            <Text size="sm" c="dimmed">{t('observatory.noneVisible')}</Text>
          ) : (
            <div className={styles.constellationList}>
              {constellations.map((c) => (
                <span key={c.abbr} className={styles.constBadge} title={`Alt: ${c.altAz.alt.toFixed(1)}°`}>
                  {c.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </Stack>
    </div>
  );
};
