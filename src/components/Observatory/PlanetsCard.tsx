import { Anchor, Stack, Text } from '@mantine/core';
import React, { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { getVisiblePlanets, PlanetInfo } from '../../lib/astronomy/planets';
import { buildStellariumUrl } from '../../lib/stellarium';
import { useT } from '../../hooks/useT';
import type { Location } from './LocationSelector';
import styles from './Observatory.module.scss';
import layoutStyles from '../Layout/Layout.module.scss';
import clsx from 'clsx';

type Props = {
  location: Location;
  date: Date;
};

function fmt(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

const PLANET_SYMBOL: Record<string, string> = {
  Mercury: '☿',
  Venus: '♀',
  Mars: '♂',
  Jupiter: '♃',
  Saturn: '♄',
};

export const PlanetsCard: FC<Props> = ({ location, date }) => {
  const t = useT();
  const { t: tStr } = useTranslation();
  const planets = getVisiblePlanets(location.lat, location.lon, date);

  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>{t('observatory.planetsTitle')}</div>
      <Stack gap={0}>
        {planets.map((p: PlanetInfo) => (
          <div
            key={p.name}
            className={`${clsx(styles.planetRow, layoutStyles.contentBlur)} ${p.altAz.alt <= 0 ? styles.belowHorizon : ''}`}
          >
            <span className={styles.planetName}>
              <Anchor
                href={buildStellariumUrl({ lat: location.lat, lng: location.lon, date, az: p.altAz.az, alt: p.altAz.alt, objectName: p.name, fov: 20 })}
                target="_blank"
                rel="noopener noreferrer"
                title={tStr('observatory.viewInStellarium')}
                style={{ color: 'inherit', textDecoration: 'none' }}
                onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => { e.currentTarget.style.textDecoration = 'underline'; }}
                onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => { e.currentTarget.style.textDecoration = 'none'; }}
              >
                {PLANET_SYMBOL[p.name]} {p.name}
              </Anchor>
            </span>
            <span style={{ fontSize: '0.78rem' }}>
              {p.altAz.alt.toFixed(1)}° / {p.altAz.az.toFixed(1)}°
            </span>
            <span style={{ minWidth: 80, textAlign: 'right', fontSize: '0.78rem' }}>
              {p.altAz.alt <= 0 ? (
                <Text component="span" c="dimmed" size="xs">{t('observatory.belowHorizon')}</Text>
              ) : (
                <Text component="span" c="teal" size="xs">{t('observatory.visible')}</Text>
              )}
            </span>
            <span style={{ minWidth: 100, textAlign: 'right', fontSize: '0.78rem', opacity: 0.6 }}>
              ↑{fmt(p.riseTime)} ↓{fmt(p.setTime)}
            </span>
          </div>
        ))}
      </Stack>
    </div>
  );
};
