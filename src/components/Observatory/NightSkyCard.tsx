import { Stack, Text } from '@mantine/core';
import React, { FC } from 'react';

import { getVisibleConstellations, getVisibleNebulae } from '../../lib/astronomy/sky';
import { useT } from '../../hooks/useT';
import type { Location } from './LocationSelector';
import styles from './Observatory.module.scss';

type Props = {
  location: Location;
  date: Date;
};

const TYPE_LABEL: Record<string, string> = {
  galaxy: 'Gx',
  nebula: 'Nb',
  cluster: 'Cl',
};

export const NightSkyCard: FC<Props> = ({ location, date }) => {
  const t = useT();
  const constellations = getVisibleConstellations(location.lat, location.lon, date).filter((c) => c.visible);
  const nebulae = getVisibleNebulae(location.lat, location.lon, date);

  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>{t('observatory.nightSkyTitle')}</div>
      <Stack gap="md">
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

        <div>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600} style={{ letterSpacing: '0.1em' }} mb={6}>
            {t('observatory.deepSky')} ({nebulae.length})
          </Text>
          {nebulae.length === 0 ? (
            <Text size="sm" c="dimmed">{t('observatory.noneVisible')}</Text>
          ) : (
            <div className={styles.starGrid}>
              {nebulae.map((n) => (
                <div key={n.id} className={styles.starItem}>
                  <Text size="xs" fw={600}>{TYPE_LABEL[n.type]} {n.name}</Text>
                  <Text size="xs" c="dimmed">{n.id} · {n.altAz.alt.toFixed(0)}°</Text>
                </div>
              ))}
            </div>
          )}
        </div>
      </Stack>
    </div>
  );
};
