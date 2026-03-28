import React, { useCallback, useEffect, useRef, useState } from 'react';
import { decompressFrames, parseGIF, ParsedFrame } from 'gifuct-js';

import { useLanguage } from '../../../hooks/useLanguage';
import styles from './FortuneCookieWidget.module.scss';

// ─── Fortune messages ─────────────────────────────────────────────────────────

const FORTUNES: { en: string; vi: string }[] = [
  {
    en: 'Good things are coming.',
    vi: 'Những điều tốt đẹp đang đến.',
  },
  {
    en: 'You are exactly where you need to be.',
    vi: 'Bạn đang ở đúng nơi bạn cần.',
  },
  {
    en: 'Today is a great day to try.',
    vi: 'Hôm nay là ngày tuyệt vời để thử.',
  },
  {
    en: 'Someone out there is glad you exist.',
    vi: 'Có người ngoài kia vui vì bạn tồn tại.',
  },
  {
    en: 'You are doing well, and rest is part of the work.',
    vi: 'Bạn đang làm tốt, và nghỉ ngơi cũng là một phần của công việc.',
  },
  {
    en: 'Your kindness leaves a mark.',
    vi: 'Sự tử tế của bạn để lại dấu ấn.',
  },
  {
    en: 'Small steps still move you forward.',
    vi: 'Những bước nhỏ vẫn đưa bạn tiến về phía trước.',
  },
  {
    en: 'You have more strength than you think.',
    vi: 'Bạn mạnh mẽ hơn bạn nghĩ.',
  },
  {
    en: 'Happiness is already close by.',
    vi: 'Hạnh phúc đã ở rất gần rồi.',
  },
  {
    en: 'The best is still ahead of you.',
    vi: 'Điều tốt nhất vẫn đang chờ phía trước.',
  },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type CookieState = 'idle' | 'playing' | 'open';

type BBox = { x1: number; y1: number; x2: number; y2: number };

interface FortuneCookieWidgetProps {
  bbox?: BBox;
}

const DEFAULT_BBOX: BBox = { x1: 85, y1: 57, x2: 315, y2: 87 };

// Set to a number (e.g. 15) to cap playback at that FPS, or null to use the
// delay values baked into each GIF frame.
const PLAYBACK_FPS: number | null = 15;

// Frame index (0-based) at which the fortune text starts appearing.
// The animation continues playing to the last frame after this point.
// Set to null to only show the fortune after the last frame.
const FORTUNE_REVEAL_FRAME: number | null = 22;

// Draw a visible outline of the bounding box to aid positioning.
const DEBUG_BBOX = false;

// ─── Component ────────────────────────────────────────────────────────────────

export const FortuneCookieWidget: React.FC<FortuneCookieWidgetProps> = ({
  bbox = DEFAULT_BBOX,
}) => {
  const { lang } = useLanguage();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const framesRef = useRef<ParsedFrame[]>([]);
  const gifWidthRef = useRef<number>(0);
  const gifHeightRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const loadedRef = useRef(false);
  // Tracks which fortune indices have already been shown this session.
  // Reset automatically once every fortune has been seen.
  const usedIndicesRef = useRef<Set<number>>(new Set());

  const [cookieState, setCookieState] = useState<CookieState>('idle');
  const [fortuneIndex, setFortuneIndex] = useState(0);
  const [canvasReady, setCanvasReady] = useState(false);

  // Draw a single decoded frame onto the visible canvas via an offscreen canvas
  const drawFrame = useCallback((frame: ParsedFrame) => {
    const canvas = canvasRef.current;
    const offscreen = offscreenRef.current;
    if (!canvas || !offscreen) return;

    const ctx = canvas.getContext('2d');
    const offCtx = offscreen.getContext('2d');
    if (!ctx || !offCtx) return;

    const imageData = offCtx.createImageData(frame.dims.width, frame.dims.height);
    imageData.data.set(frame.patch);
    offCtx.putImageData(imageData, 0, 0);

    ctx.drawImage(
      offscreen,
      0,
      0,
      frame.dims.width,
      frame.dims.height,
      frame.dims.left,
      frame.dims.top,
      frame.dims.width,
      frame.dims.height,
    );
  }, []);

  // Load & parse the GIF on mount
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    (async () => {
      const res = await fetch('/content/blog/hello-world/cookie.gif');
      const buffer = await res.arrayBuffer();
      const parsed = parseGIF(buffer);
      const frames = decompressFrames(parsed, true);

      framesRef.current = frames;
      gifWidthRef.current = parsed.lsd.width;
      gifHeightRef.current = parsed.lsd.height;

      // Create offscreen canvas sized to one frame patch (gifuct-js patches can be partial)
      const offscreen = document.createElement('canvas');
      offscreen.width = parsed.lsd.width;
      offscreen.height = parsed.lsd.height;
      offscreenRef.current = offscreen;

      // Size the visible canvas
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = parsed.lsd.width;
        canvas.height = parsed.lsd.height;
      }

      setCanvasReady(true);

      // Draw first frame static
      if (frames.length > 0) {
        drawFrame(frames[0]);
      }
    })();

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [drawFrame]);

  // When canvas is ready + frames are loaded, ensure first frame is drawn
  useEffect(() => {
    if (canvasReady && framesRef.current.length > 0) {
      drawFrame(framesRef.current[0]);
    }
  }, [canvasReady, drawFrame]);

  const playAnimation = useCallback(() => {
    const frames = framesRef.current;
    if (frames.length === 0) return;

    let frameIdx = 0;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - lastTime;
      const delay = PLAYBACK_FPS !== null
        ? 1000 / PLAYBACK_FPS
        : (frames[frameIdx].delay || 10) * 10; // centiseconds → ms

      if (elapsed >= delay) {
        drawFrame(frames[frameIdx]);
        frameIdx++;
        lastTime = now;

        if (FORTUNE_REVEAL_FRAME !== null && frameIdx >= FORTUNE_REVEAL_FRAME) {
          setCookieState('open');
        }

        if (frameIdx >= frames.length) {
          // Reached last frame — stop loop and ensure open state
          setCookieState('open');
          return;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [drawFrame]);

  const handleClick = useCallback(() => {
    if (cookieState === 'playing') return;

    // Pick a fortune not yet seen; reset the pool when all have been shown.
    if (usedIndicesRef.current.size >= FORTUNES.length) {
      usedIndicesRef.current = new Set();
    }
    const remaining = FORTUNES.map((_, i) => i).filter(
      (i) => !usedIndicesRef.current.has(i),
    );
    const idx = remaining[Math.floor(Math.random() * remaining.length)];
    usedIndicesRef.current.add(idx);

    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    const frames = framesRef.current;
    if (frames.length > 0) drawFrame(frames[0]);
    setFortuneIndex(idx);
    setCookieState('playing');
    playAnimation();
  }, [cookieState, drawFrame, playAnimation]);

  // Overlay position & size as percentages of native GIF dimensions so the
  // overlay scales correctly when the canvas is resized via CSS.
  const gw = gifWidthRef.current || 1;
  const gh = gifHeightRef.current || 1;
  const overlayStyle: React.CSSProperties = {
    left:   `${(bbox.x1 / gw) * 100}%`,
    top:    `${(bbox.y1 / gh) * 100}%`,
    width:  `${((bbox.x2 - bbox.x1) / gw) * 100}%`,
    height: `${((bbox.y2 - bbox.y1) / gh) * 100}%`,
  };

  const fortune = FORTUNES[fortuneIndex];
  const hintText = lang === 'vi' ? '✨ Nhấn để mở' : '✨ Click to open';
  const resetText = lang === 'vi' ? 'Nhấn để thử lại' : 'Click to try again';

  return (
    <div className={styles.wrapper}>
      <div
        className={styles.container}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        aria-label={cookieState === 'idle' ? hintText : resetText}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') handleClick();
        }}
      >
        <canvas ref={canvasRef} className={styles.canvas} />

        {/* "Click to open" hint on idle */}
        <div className={`${styles.hint} ${cookieState !== 'idle' ? styles.hidden : ''}`}>
          <span>{hintText}</span>
        </div>

        {/* Fortune overlay, visible only when open */}
        {cookieState === 'open' && (
          <div className={styles.overlay} style={overlayStyle}>
            <p className={styles.fortune}>{lang === 'vi' ? fortune.vi : fortune.en}</p>
          </div>
        )}

        {/* Debug bbox outline — toggle DEBUG_BBOX to enable */}
        {DEBUG_BBOX && canvasReady && (
          <div
            style={{
              position: 'absolute',
              left:   `${(bbox.x1 / gw) * 100}%`,
              top:    `${(bbox.y1 / gh) * 100}%`,
              width:  `${((bbox.x2 - bbox.x1) / gw) * 100}%`,
              height: `${((bbox.y2 - bbox.y1) / gh) * 100}%`,
              outline: '2px dashed red',
              pointerEvents: 'none',
              boxSizing: 'border-box',
            }}
          />
        )}
      </div>

      {cookieState === 'open' && (
        <span className={styles.caption}>{resetText}</span>
      )}

      <span className={styles.credit}>
        Animation by{' '}
        <a
          href="https://dribbble.com/shots/5469327-Fortune-Cookie-animation"
          target="_blank"
          rel="noopener noreferrer"
        >
          Amanda Moody
        </a>
      </span>
    </div>
  );
};
