import { Anchor, Image, Skeleton, Stack, Text } from '@mantine/core';
import React, { FC, useEffect, useState } from 'react';

import {
  ConstellationWithAltAz,
  NebulaWithAltAz,
  getVisibleConstellations,
  getVisibleNebulae,
} from '../../lib/astronomy/sky';
import { useT } from '../../hooks/useT';
import type { Location } from './LocationSelector';
import styles from './Observatory.module.scss';

type Props = {
  location: Location;
  date: Date;
};

type SelectedItem =
  | { kind: 'constellation'; data: ConstellationWithAltAz }
  | { kind: 'nebula'; data: NebulaWithAltAz }
  | null;

const TYPE_LABEL_SHORT: Record<string, string> = {
  galaxy: 'Gx',
  nebula: 'Nb',
  cluster: 'Cl',
};

function wikiTitleFor(item: NonNullable<SelectedItem>): string {
  return item.kind === 'constellation'
    ? `${item.data.name} (constellation)`
    : item.data.name;
}

// ─── Detail page ─────────────────────────────────────────────────────────────

type DetailPageProps = {
  item: NonNullable<SelectedItem>;
  onBack: () => void;
};

const DetailPage: FC<DetailPageProps> = ({ item, onBack }) => {
  const t = useT();
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [extract, setExtract] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setImageSrc(null);
    setExtract(null);
    setLoading(true);
    const encoded = encodeURIComponent(wikiTitleFor(item));
    const url =
      `https://en.wikipedia.org/w/api.php?action=query` +
      `&titles=${encoded}` +
      `&prop=pageimages|extracts` +
      `&pithumbsize=400` +
      `&exintro=true&exsentences=2&explaintext=true` +
      `&redirects=1&format=json&origin=*`;
    let cancelled = false;
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error('fetch failed');
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        const pages = (data?.query?.pages ?? {}) as Record<string, Record<string, unknown>>;
        const page = Object.values(pages)[0] ?? {};
        const src = (page.thumbnail as { source?: string } | undefined)?.source ?? null;
        const ext = typeof page.extract === 'string' ? page.extract : null;
        setImageSrc(src);
        setExtract(ext);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [item]);

  const { name, altAz } = item.data;
  const catalogId = item.kind === 'constellation' ? item.data.abbr : item.data.id;
  const wikiUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(wikiTitleFor(item))}`;

  const typeEl =
    item.kind === 'constellation'
      ? t('observatory.skyTypeConstellation')
      : item.data.type === 'galaxy'
        ? t('observatory.skyTypeGalaxy')
        : item.data.type === 'cluster'
          ? t('observatory.skyTypeCluster')
          : t('observatory.skyTypeNebula');

  return (
    <div className={styles.detailPage}>
      <button className={styles.backBtn} onClick={onBack}>
        ← {t('observatory.nightSkyTitle')}
      </button>

      <div className={styles.detailBody}>
        <div className={styles.detailImageWrap}>
          {loading && <Skeleton width="100%" height="100%" radius="sm" style={{ position: 'absolute', inset: 0 }} />}
          {!loading && imageSrc && (
            <Image
              src={imageSrc}
              alt={name}
              radius="sm"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          )}
          {!loading && !imageSrc && (
            <div className={styles.detailNoImage}>
              <Text size="xs" c="dimmed">{t('observatory.skyNoImage')}</Text>
            </div>
          )}
        </div>

        <div className={styles.detailInfo}>
          <Text size="sm" fw={700} lh={1.3}>{name}</Text>
          <Text size="xs" c="dimmed" mt={4}>
            {typeEl} · {catalogId}
          </Text>
          <Text size="xs" c="dimmed">
            Alt {altAz.alt.toFixed(1)}° · Az {altAz.az.toFixed(1)}°
          </Text>

          {extract && (
            <Text size="xs" mt="xs" className={styles.detailExtract}>
              {extract}
            </Text>
          )}

          <Anchor
            href={wikiUrl}
            target="_blank"
            rel="noopener noreferrer"
            size="xs"
            mt="sm"
            display="block"
          >
            {t('observatory.viewOnWikipedia')}
          </Anchor>
        </div>
      </div>
    </div>
  );
};

// ─── Night Sky Card ───────────────────────────────────────────────────────────

export const NightSkyCard: FC<Props> = ({ location, date }) => {
  const t = useT();
  const [selectedItem, setSelectedItem] = useState<SelectedItem>(null);
  const constellations = getVisibleConstellations(location.lat, location.lon, date).filter((c) => c.visible);
  const nebulae = getVisibleNebulae(location.lat, location.lon, date);

  if (selectedItem) {
    return (
      <div className={styles.card}>
        <DetailPage item={selectedItem} onBack={() => setSelectedItem(null)} />
      </div>
    );
  }

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
                <span
                  key={c.abbr}
                  className={styles.constBadge}
                  onClick={() => setSelectedItem({ kind: 'constellation', data: c })}
                >
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
                <div
                  key={n.id}
                  className={`${styles.starItem} ${styles.starItemClickable}`}
                  onClick={() => setSelectedItem({ kind: 'nebula', data: n })}
                >
                  <Text size="xs" fw={600}>{TYPE_LABEL_SHORT[n.type]} {n.name}</Text>
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
