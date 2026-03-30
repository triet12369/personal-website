import { Group, Stack, Text } from '@mantine/core';
import React, { FC } from 'react';

import { moonPhase, moonAltAz, moonRiseSet, nextMoonPhases } from '../../lib/astronomy/moon';
import { useT } from '../../hooks/useT';
import type { Location } from './LocationSelector';
import styles from './Observatory.module.scss';

type Props = {
  location: Location;
  date: Date;
};

function fmt(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export const MoonCard: FC<Props> = ({ location, date }) => {
  const t = useT();
  const phase = moonPhase(date);
  const altAz = moonAltAz(location.lat, location.lon, date);
  const { moonrise, moonset } = moonRiseSet(location.lat, location.lon, date);
  const next = nextMoonPhases(date);

  const illumPct = (phase.illumination * 100).toFixed(0);

  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>🌙 {t('observatory.moonTitle')}</div>
      <Stack gap="sm">
        <Group align="center" gap="md">
          <Text className={styles.moonEmoji}>{phase.emoji}</Text>
          <Stack gap={2}>
            <Text fw={600}>{phase.name}</Text>
            <Text size="sm" c="dimmed">{illumPct}% {t('observatory.illuminated')}</Text>
          </Stack>
        </Group>

        <Text size="sm">
          {t('observatory.altitude')}: {altAz.alt.toFixed(1)}° · {t('observatory.azimuth')}: {altAz.az.toFixed(1)}°
        </Text>

        <Group gap="xl">
          <div>
            <Text size="xs" c="dimmed">{t('observatory.moonrise')}</Text>
            <Text size="sm" fw={500}>{fmt(moonrise)}</Text>
          </div>
          <div>
            <Text size="xs" c="dimmed">{t('observatory.moonset')}</Text>
            <Text size="sm" fw={500}>{fmt(moonset)}</Text>
          </div>
        </Group>

        <Stack gap={4} mt="xs">
          <Text size="xs" c="dimmed" tt="uppercase" fw={600} style={{ letterSpacing: '0.1em' }}>{t('observatory.nextPhases')}</Text>
          {[
            { key: 'newMoon', emoji: '🌑', label: t('observatory.newMoon'), date: next.nextNew },
            { key: 'firstQuarter', emoji: '🌓', label: t('observatory.firstQuarter'), date: next.nextFirstQuarter },
            { key: 'fullMoon', emoji: '🌕', label: t('observatory.fullMoon'), date: next.nextFull },
            { key: 'thirdQuarter', emoji: '🌗', label: t('observatory.thirdQuarter'), date: next.nextThirdQuarter },
          ].map(({ key, emoji, label, date: d }) => (
            <div key={key} className={styles.sunTimeRow}>
              <span>{emoji} {label}</span>
              <span>{fmtDate(d)}</span>
            </div>
          ))}
        </Stack>
      </Stack>
    </div>
  );
};
