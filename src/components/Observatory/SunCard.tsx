import { Anchor, Modal, SimpleGrid, Skeleton, Stack, Text, Tooltip } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import React, { FC, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { sunriseSunset, sunAltAz, skyState, SkyState } from '../../lib/astronomy/sun';
import { buildStellariumUrl } from '../../lib/stellarium';
import { useT } from '../../hooks/useT';
import type { Location } from './LocationSelector';
import styles from './Observatory.module.scss';
import { SunImage } from './SunImage';
import type { SunView } from './SunImage';
import { SunTimeline } from './SunTimeline';

type Props = {
  location: Location;
  date: Date;
};

const STATE_LABEL_KEYS: Record<SkyState, string> = {
  day: 'observatory.skyDay',
  twilight: 'observatory.skyTwilight',
  dark: 'observatory.skyDark',
};

type ViewMeta = {
  key: SunView;
  shortKey: string;   // i18n key for the pill label
  labelKey: string;   // i18n key for the full label (used in the modal)
  descKey: string;    // i18n key for the tooltip description
};

// Descriptions sourced from https://soho.nascom.nasa.gov/data/realtime/image-description.html
const VIEW_DESCRIPTIONS: Record<SunView, string> = {
  hmi_igr: 'HMI white-light continuum near the Ni I 6768 Å line. Shows sunspot structure, very close to how the Sun appears to the naked eye through safe solar filters.',
  hmi_mag: 'HMI magnetogram showing the magnetic field in the solar photosphere. Black and white regions indicate opposite magnetic polarities.',
  eit_171: 'EIT 171 Å: extreme ultraviolet image of the solar corona at ~1 million °K. Highlights coronal loops and active regions.',
  eit_195: 'EIT 195 Å: extreme ultraviolet at ~1.5 million °K. Reveals hotter coronal plasma and is sensitive to flare activity.',
  eit_284: 'EIT 284 Å: extreme ultraviolet at ~2 million °K. Shows the highest, hottest layers of the solar atmosphere.',
  eit_304: 'EIT 304 Å: extreme ultraviolet at ~60,000-80,000 °K. Images the chromosphere and cool coronal material; prominences appear bright.',
  c2: 'LASCO C2 coronagraph: blocks the solar disk to reveal the inner corona out to 8.4 million km (5.25 million miles). Shows coronal streamers and CMEs.',
  c3: 'LASCO C3 coronagraph: wider field covering 32 solar diameters (~45 million km). Background stars are visible; large CMEs and comets can be tracked.',
};

const VIEW_META: ViewMeta[] = [
  { key: 'hmi_igr', shortKey: 'observatory.sunViewShortHmiIgr', labelKey: 'observatory.sunHmiIgrLabel', descKey: 'hmi_igr' },
  { key: 'hmi_mag', shortKey: 'observatory.sunViewShortHmiMag', labelKey: 'observatory.sunHmiMagLabel', descKey: 'hmi_mag' },
  { key: 'eit_171', shortKey: 'observatory.sunViewShort171',    labelKey: 'observatory.sun171Label',    descKey: 'eit_171' },
  { key: 'eit_195', shortKey: 'observatory.sunViewShort195',    labelKey: 'observatory.sun195Label',    descKey: 'eit_195' },
  { key: 'eit_284', shortKey: 'observatory.sunViewShort284',    labelKey: 'observatory.sun284Label',    descKey: 'eit_284' },
  { key: 'eit_304', shortKey: 'observatory.sunViewShort304',    labelKey: 'observatory.sun304Label',    descKey: 'eit_304' },
  { key: 'c2',      shortKey: 'observatory.sunViewShortC2',     labelKey: 'observatory.sunC2Label',     descKey: 'c2' },
  { key: 'c3',      shortKey: 'observatory.sunViewShortC3',     labelKey: 'observatory.sunC3Label',     descKey: 'c3' },
];

function SunModalTile({ view, label }: { view: SunView; label: string }) {
  return (
    <Stack gap="xs">
      <Text size="sm" fw={600} ta="center">{label}</Text>
      <SunImage view={view} />
    </Stack>
  );
}

export const SunCard: FC<Props> = ({ location, date }) => {
  const t = useT();
  const { t: tStr } = useTranslation();
  const [view, setView] = useState<SunView>('hmi_igr');
  const [opened, { open, close }] = useDisclosure(false);

  // Pick a random view on first mount
  React.useEffect(() => {
    const idx = Math.floor(Math.random() * VIEW_META.length);
    setView(VIEW_META[idx].key);
  }, []);

  const times = sunriseSunset(location.lat, location.lon, date);
  const altAz = sunAltAz(location.lat, location.lon, date);
  const state = skyState(location.lat, location.lon, date);

  const activeLabel = tStr(VIEW_META.find((v) => v.key === view)?.labelKey ?? 'observatory.sunHmiIgrLabel');

  return (
    <>
      <Modal
        opened={opened}
        onClose={close}
        title={t('observatory.sunAllViews')}
        fullScreen
      >
        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xl" style={{ paddingBottom: '2rem' }}>
          {VIEW_META.map(({ key, labelKey }) => (
            <SunModalTile key={key} view={key} label={tStr(labelKey)} />
          ))}
        </SimpleGrid>
      </Modal>

      <div className={styles.card}>
        <div className={styles.cardTitle}>{t('observatory.sunTitle')}</div>
        <Stack gap="sm" align="stretch">
          <SunImage view={view} />

          {/* View switcher */}
          <div className={styles.sunViewSwitcher}>
            {VIEW_META.map(({ key, shortKey }) => (
              <button
                key={key}
                className={styles.sunViewBtn}
                data-active={view === key ? 'true' : 'false'}
                onClick={() => setView(key)}
              >
                {tStr(shortKey)}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Text size="xs" c="dimmed">{activeLabel}</Text>
              <Tooltip
                label={VIEW_DESCRIPTIONS[view]}
                multiline
                w={260}
                withArrow
                position="top-start"
                styles={{ tooltip: { fontSize: '0.72rem', lineHeight: 1.45 } }}
              >
                <span
                  aria-label="View description"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    border: '1px solid currentColor',
                    fontSize: '0.6rem',
                    lineHeight: 1,
                    opacity: 0.5,
                    cursor: 'default',
                    userSelect: 'none',
                    flexShrink: 0,
                  }}
                >
                  ?
                </span>
              </Tooltip>
            </div>
            <Text
              size="xs"
              style={{ cursor: 'pointer', textDecoration: 'underline', opacity: 0.65 }}
              onClick={open}
            >
              {t('observatory.sunViewAll')}
            </Text>
          </div>

          <Text size="sm" ta="center">
            <span className={styles.skyStateDot} data-state={state} />
            {t(STATE_LABEL_KEYS[state])} · Alt {altAz.alt.toFixed(1)}° Az {altAz.az.toFixed(1)}°
            {' '}
            <Anchor
              href={buildStellariumUrl({ lat: location.lat, lng: location.lon, date, az: altAz.az, alt: altAz.alt, objectName: 'Sun', fov: 5 })}
              target="_blank"
              rel="noopener noreferrer"
              size="xs"
              title={tStr('observatory.viewInStellarium')}
              style={{ opacity: 0.7, verticalAlign: 'middle' }}
            >
              🔭
            </Anchor>
          </Text>
          <SunTimeline times={times} now={date} />
        </Stack>
      </div>
    </>
  );
};
