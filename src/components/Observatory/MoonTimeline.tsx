/**
 * Horizontal timeline of the next 4 moon phases (~29.5-day lunar cycle).
 * Modelled after SunTimeline — SVG tape, cursor at left, labels alternate top/bottom.
 */

import React, { FC, useEffect, useRef, useState } from 'react';

import type { NextMoonPhases } from '../../lib/astronomy/moon';
import styles from './Observatory.module.scss';

type Props = {
  next: NextMoonPhases;
  now: Date;
};

// Visible window: 30 days ahead. "Now" cursor sits at 5% from the left.
const DAYS_TOTAL = 30;
const CURSOR_FRACTION = 0.05;

const SVG_HEIGHT = 72;
const TRACK_HEIGHT = 8;
const TRACK_Y = (SVG_HEIGHT - TRACK_HEIGHT) / 2;
const TICK_TOP = TRACK_Y - 10;
const TICK_BOTTOM = TRACK_Y + TRACK_HEIGHT + 10;
const LABEL_Y_TOP = TICK_TOP - 4;
const LABEL_Y_BOTTOM = TICK_BOTTOM + 12;

const PHASE_COLORS: Record<string, string> = {
  new: '#b4b4c8',
  firstQuarter: '#c8c8dc',
  full: '#facc15',
  thirdQuarter: '#c8c8dc',
};

const PHASE_EMOJIS: Record<string, string> = {
  new: '🌑',
  firstQuarter: '🌓',
  full: '🌕',
  thirdQuarter: '🌗',
};

function dayToX(date: Date, now: Date, containerWidth: number): number {
  const deltaDays = (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  const pxPerDay = containerWidth / DAYS_TOTAL;
  return CURSOR_FRACTION * containerWidth + deltaDays * pxPerDay;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function fmtCountdown(diffMs: number): string {
  const totalMinutes = Math.round(diffMs / 60000);
  if (totalMinutes <= 0) return '';
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  return `${hours}h`;
}

export const MoonTimeline: FC<Props> = ({ next, now }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(300);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width || 300);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const id = setInterval(() => forceUpdate((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const phases = [
    { key: 'new', label: 'New Moon', date: next.nextNew },
    { key: 'firstQuarter', label: '1st Quarter', date: next.nextFirstQuarter },
    { key: 'full', label: 'Full Moon', date: next.nextFull },
    { key: 'thirdQuarter', label: '3rd Quarter', date: next.nextThirdQuarter },
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  const nextPhase = phases[0];
  const cursorX = CURSOR_FRACTION * width;

  // Track gradient: dark → bright (full moon position) → dark
  const fullX = dayToX(next.nextFull, now, width);
  const gradId = 'moonTrackGrad';

  return (
    <div className={styles.moonTimeline} ref={containerRef}>
      <svg
        width={width}
        height={SVG_HEIGHT}
        style={{ display: 'block', overflow: 'visible' }}
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(80,80,120,0.4)" />
            <stop offset={`${(fullX / width) * 100}%`} stopColor="rgba(250,204,20,0.35)" />
            <stop offset="100%" stopColor="rgba(80,80,120,0.4)" />
          </linearGradient>
        </defs>

        {/* Track bar */}
        <rect
          x={0}
          y={TRACK_Y}
          width={width}
          height={TRACK_HEIGHT}
          rx={4}
          fill={`url(#${gradId})`}
        />

        {/* Phase ticks + labels */}
        {phases.map((ph, idx) => {
          const x = dayToX(ph.date, now, width);
          const color = PHASE_COLORS[ph.key];
          const labelBelow = idx % 2 === 1;

          return (
            <g key={ph.key}>
              {/* Tick */}
              <line
                x1={x} y1={TICK_TOP}
                x2={x} y2={TICK_BOTTOM}
                stroke={color}
                strokeWidth={ph.key === 'full' ? 2 : 1.5}
              />
              {/* Emoji */}
              <text
                x={x}
                y={labelBelow ? LABEL_Y_BOTTOM : LABEL_Y_TOP}
                textAnchor="middle"
                dominantBaseline={labelBelow ? 'hanging' : 'auto'}
                fontSize={14}
              >
                {PHASE_EMOJIS[ph.key]}
              </text>
              {/* Date */}
              <text
                x={x}
                y={labelBelow ? LABEL_Y_BOTTOM + 16 : LABEL_Y_TOP - 14}
                textAnchor="middle"
                dominantBaseline={labelBelow ? 'hanging' : 'auto'}
                fontSize={10}
                fill={color}
                fontFamily="Raleway, -apple-system, BlinkMacSystemFont, sans-serif"
              >
                {fmtDate(ph.date)}
              </text>
            </g>
          );
        })}

        {/* Cursor (now) */}
        <line
          x1={cursorX} y1={TRACK_Y - 14}
          x2={cursorX} y2={TRACK_Y + TRACK_HEIGHT + 14}
          stroke="#ffffff"
          strokeWidth={2}
          strokeLinecap="round"
        />
        <circle cx={cursorX} cy={TRACK_Y - 14} r={3} fill="#ffffff" />
      </svg>

      {/* Next phase countdown pill */}
      {nextPhase && (
        <div className={styles.sunNextEventPill}>
          <span className={styles.sunNextLabel}>Next</span>
          <span className={styles.sunNextName}>{nextPhase.label}</span>
          <span className={styles.sunNextTime}>{fmtDate(nextPhase.date)}</span>
          {fmtCountdown(nextPhase.date.getTime() - now.getTime()) && (
            <span className={styles.sunNextCountdown}>
              in {fmtCountdown(nextPhase.date.getTime() - now.getTime())}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
