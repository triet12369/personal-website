/**
 * Live SOHO solar image for a given wavelength/instrument view.
 * Fetched via a Next.js API proxy to avoid CORS/hotlink restrictions.
 * Auto-refreshes every 15 minutes to match SOHO's update cadence.
 *
 * For EIT and LASCO views, a play button loads the 48-hour animated GIF.
 * The GIF duration is parsed from the file itself; playback auto-reverts
 * to the latest still image after one loop.
 */

import React, { FC, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { SunView } from '../../pages/api/sdo-image';
import styles from './Observatory.module.scss';

// Views that have an animated GIF available via /api/sdo-gif
const GIF_VIEWS = new Set<SunView>(['eit_171', 'eit_195', 'eit_284', 'eit_304', 'c2', 'c3']);

/**
 * Parse the total animation duration (ms) from a GIF ArrayBuffer by summing
 * all Graphic Control Extension frame delays.
 */
function parseGifDuration(buffer: ArrayBuffer): number {
  const data = new Uint8Array(buffer);
  let ms = 0;

  // Skip 6-byte header + 7-byte Logical Screen Descriptor → offset 13
  const hasGct = (data[10] & 0x80) !== 0;
  const gctSize = hasGct ? 3 * (1 << ((data[10] & 0x07) + 1)) : 0;
  let i = 13 + gctSize;

  while (i < data.length) {
    const blockType = data[i];
    if (blockType === 0x3B) break; // trailer

    if (blockType === 0x21) {
      // Extension introducer
      const label = data[i + 1];
      i += 2;

      if (label === 0xF9 && data[i] >= 3) {
        // Graphic Control Extension:
        // data[i]   = block size (4)
        // data[i+1] = packed flags
        // data[i+2] = delay low byte  (1/100 sec units)
        // data[i+3] = delay high byte
        const delay = data[i + 2] | (data[i + 3] << 8);
        ms += delay * 10;
      }

      // Skip all sub-blocks until block terminator
      while (i < data.length && data[i] !== 0x00) {
        i += data[i] + 1;
      }
      i++; // block terminator

    } else if (blockType === 0x2C) {
      // Image descriptor (10 bytes), optional local color table, LZW code size, sub-blocks
      const hasLct = (data[i + 9] & 0x80) !== 0;
      const lctSize = hasLct ? 3 * (1 << ((data[i + 9] & 0x07) + 1)) : 0;
      i += 10 + lctSize + 1; // skip descriptor + LCT + LZW min code size byte

      while (i < data.length && data[i] !== 0x00) {
        i += data[i] + 1;
      }
      i++; // block terminator

    } else {
      i++;
    }
  }

  return ms;
}

type PlayState = 'idle' | 'loading' | 'playing';

type Props = {
  view?: SunView;
};

export const SunImage: FC<Props> = ({ view = 'hmi_igr' }) => {
  const { t: tStr } = useTranslation();
  const [bust, setBust] = useState(() => Math.floor(Date.now() / (15 * 60 * 1000)));
  const [playState, setPlayState] = useState<PlayState>('idle');
  const [gifSrc, setGifSrc] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const hasGif = GIF_VIEWS.has(view);

  // Refresh cache-bust every 15 min
  useEffect(() => {
    const id = setInterval(() => {
      setBust(Math.floor(Date.now() / (15 * 60 * 1000)));
    }, 15 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const stopPlayback = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setGifSrc(null);
    setPlayState('idle');
  }, []);

  // Reset when view changes
  useEffect(() => {
    stopPlayback();
  }, [view, stopPlayback]);

  // Cleanup on unmount
  useEffect(() => () => stopPlayback(), [stopPlayback]);

  const handlePlay = async () => {
    if (playState !== 'idle') return;
    setPlayState('loading');

    try {
      const resp = await fetch(`/api/sdo-gif?view=${view}`);
      if (!resp.ok) throw new Error(`GIF fetch failed: ${resp.status}`);

      const buffer = await resp.arrayBuffer();
      const duration = parseGifDuration(buffer);
      const blob = new Blob([buffer], { type: 'image/gif' });
      const url = URL.createObjectURL(blob);
      blobUrlRef.current = url;
      setGifSrc(url);
      setPlayState('playing');

      // Auto-revert after one loop; fallback to 12 s if duration can't be parsed
      const timeout = duration > 0 ? duration + 500 : 12000;
      timerRef.current = setTimeout(stopPlayback, timeout);
    } catch {
      setPlayState('idle');
    }
  };

  const isPlaying = playState === 'playing' && gifSrc !== null;

  return (
    <div className={styles.sunImageWrapper}>
      <img
        src={isPlaying ? gifSrc! : `/api/sdo-image?view=${view}&t=${bust}`}
        alt={tStr('observatory.sunImageAlt')}
        style={{ width: '100%', minHeight: 400, objectFit: 'cover', display: 'block', borderRadius: 'var(--mantine-radius-md)', background: '#000' }}
      />

      {hasGif && playState === 'idle' && (
        <button
          className={styles.sunPlayBtn}
          onClick={handlePlay}
          aria-label={tStr('observatory.sunPlayAnimation')}
        >
          ▶
        </button>
      )}

      {hasGif && playState === 'loading' && (
        <div className={styles.sunPlayBtn} aria-label="Loading" style={{ cursor: 'default' }}>
          <span className={styles.sunPlaySpinner} />
        </div>
      )}

      {hasGif && isPlaying && (
        <button
          className={styles.sunPlayBtn}
          onClick={stopPlayback}
          aria-label={tStr('observatory.sunStopAnimation')}
        >
          ■
        </button>
      )}
    </div>
  );
};

export type { SunView };
