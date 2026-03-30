/**
 * Horizontal timeline of the next 4 moon phases (~29.5-day lunar cycle).
 * Modelled after SunTimeline — SVG tape, cursor at left, labels alternate top/bottom.
 */

import { ActionIcon, Tooltip } from '@mantine/core';
import React, { FC, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { NextMoonPhases } from '../../lib/astronomy/moon';
import styles from './Observatory.module.scss';

type Props = {
  next: NextMoonPhases;
  now: Date;
  /** If set, cursor is rendered at this date's position instead of `now`. */
  overrideDate?: Date | null;
  /** Called when the user drags the cursor to a new date. */
  onDateChange?: (date: Date | null) => void;
  /** Called when the user clicks the "return to now" button. */
  onReturnToNow?: () => void;
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

export const MoonTimeline: FC<Props> = ({ next, now, overrideDate, onDateChange, onReturnToNow }) => {
  const { t: tStr } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(300);
  const widthRef = useRef(300);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [, forceUpdate] = useState(0);

  // Keep widthRef in sync so drag handlers don't close over stale width
  useEffect(() => { widthRef.current = width; }, [width]);

  // Drag state stored in refs so pointer move doesn't cause extra renders
  const dragStartClientX = useRef(0);
  const dragStartDate = useRef<Date>(now);

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
    { key: 'new', label: tStr('observatory.newMoon'), date: next.nextNew },
    { key: 'firstQuarter', label: tStr('observatory.firstQuarter'), date: next.nextFirstQuarter },
    { key: 'full', label: tStr('observatory.fullMoon'), date: next.nextFull },
    { key: 'thirdQuarter', label: tStr('observatory.thirdQuarter'), date: next.nextThirdQuarter },
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  const nextPhase = phases[0];

  // Cursor position: follow overrideDate when set, otherwise sit at CURSOR_FRACTION
  const pxPerDay = width / DAYS_TOTAL;
  const activeCursorDate = overrideDate ?? now;
  const deltaDays = (activeCursorDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  const cursorX = Math.max(0, Math.min(width, CURSOR_FRACTION * width + deltaDays * pxPerDay));

  const isOverride = overrideDate != null;

  // Drag handlers
  const handlePointerDown = (e: React.PointerEvent<SVGGElement>) => {
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    dragStartClientX.current = e.clientX;
    dragStartDate.current = activeCursorDate;
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGGElement>) => {
    if (!isDragging) return;
    e.preventDefault();
    const deltaX = e.clientX - dragStartClientX.current;
    const deltaDaysFromDrag = deltaX / (widthRef.current / DAYS_TOTAL);
    const newTime = dragStartDate.current.getTime() + deltaDaysFromDrag * 24 * 60 * 60 * 1000;
    // Clamp: allow from start of timeline to end
    const minTime = now.getTime() - CURSOR_FRACTION * DAYS_TOTAL * 24 * 60 * 60 * 1000;
    const maxTime = now.getTime() + (1 - CURSOR_FRACTION) * DAYS_TOTAL * 24 * 60 * 60 * 1000;
    onDateChange?.(new Date(Math.max(minTime, Math.min(maxTime, newTime))));
  };

  const handlePointerUp = (e: React.PointerEvent<SVGGElement>) => {
    (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    setIsDragging(false);
    setIsHovered(false);
  };

  // Track gradient: peaks at full moon, zero at new moon.
  // Build multi-stop gradient from all four phase positions.
  const gradId = 'moonTrackGrad';
  const phaseStops = phases.map((ph) => ({
    frac: Math.max(0, Math.min(1, dayToX(ph.date, now, width) / width)),
    isNew: ph.key === 'new',
    isFull: ph.key === 'full',
  })).sort((a, b) => a.frac - b.frac);

  // Build gradient stops: full moon → yellow peak, new moon → zero (base grey)
  const gradStops = phaseStops.map((ps) => {
    if (ps.isFull)  return { frac: ps.frac, color: 'rgba(250,204,20,0.40)' };
    if (ps.isNew)   return { frac: ps.frac, color: 'rgba(80,80,120,0.10)' };
    // quarters get an intermediate warm tint
    return          { frac: ps.frac, color: 'rgba(160,140,80,0.22)' };
  });

  return (
    <div className={styles.moonTimeline} ref={containerRef}>
      <svg
        width={width}
        height={SVG_HEIGHT}
        style={{ display: 'block', overflow: 'visible', touchAction: 'none' }}
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            {gradStops.map((s, i) => (
              <stop key={i} offset={`${s.frac * 100}%`} stopColor={s.color} />
            ))}
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

        {/* Draggable cursor (now / override) */}
        <g
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerEnter={() => setIsHovered(true)}
          onPointerLeave={() => { if (!isDragging) setIsHovered(false); }}
          style={{ cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
        >
          {/* Wide invisible hit area */}
          <rect
            x={cursorX - 14}
            y={TRACK_Y - 18}
            width={28}
            height={TRACK_HEIGHT + 36}
            fill="transparent"
          />
          <line
            x1={cursorX} y1={TRACK_Y - 14}
            x2={cursorX} y2={TRACK_Y + TRACK_HEIGHT + 14}
            stroke={isDragging ? '#f59e0b' : isOverride ? '#60a5fa' : '#ffffff'}
            strokeWidth={isDragging ? 3 : isOverride ? 2.5 : 2}
            strokeLinecap="round"
            style={{ transition: 'stroke 0.15s, stroke-width 0.15s' }}
          />
          {/* Drag handle */}
          <circle
            cx={cursorX}
            cy={TRACK_Y + TRACK_HEIGHT / 2}
            r={isDragging ? 9 : isHovered ? 8 : isOverride ? 7 : 5}
            fill={isDragging ? '#f59e0b' : isOverride ? '#3b82f6' : '#ffffff'}
            stroke="rgba(0,0,0,0.4)"
            strokeWidth={1.5}
            style={{ transition: 'r 0.12s, fill 0.15s' }}
          />
          <circle
            cx={cursorX}
            cy={TRACK_Y - 14}
            r={isDragging ? 4 : isHovered ? 4 : 3}
            fill={isDragging ? '#f59e0b' : isOverride ? '#60a5fa' : '#ffffff'}
            style={{ transition: 'r 0.12s, fill 0.15s' }}
          />
          {/* Date label below cursor when overriding */}
          {isOverride && (
            <text
              x={cursorX}
              y={TRACK_Y + TRACK_HEIGHT + 26}
              textAnchor="middle"
              dominantBaseline="hanging"
              fontSize={9}
              fill="#60a5fa"
              fontFamily="Raleway, -apple-system, BlinkMacSystemFont, sans-serif"
            >
              {fmtDate(activeCursorDate)}
            </text>
          )}
        </g>
      </svg>

      {/* Return to now button */}
      {isOverride && onReturnToNow && (
        <div style={{ position: 'absolute', top: 6, right: 8 }}>
          <Tooltip label={tStr('observatory.returnToNow')} withArrow position="left">
            <ActionIcon
              variant="light"
              color="blue"
              size="sm"
              radius="xl"
              onClick={onReturnToNow}
              aria-label={tStr('observatory.returnToNow')}
            >
              ↩
            </ActionIcon>
          </Tooltip>
        </div>
      )}

      {/* Next phase countdown pill */}
      {nextPhase && (
        <div className={styles.sunNextEventPill}>
          <span className={styles.sunNextLabel}>{tStr('observatory.next')}</span>
          <span className={styles.sunNextName}>{nextPhase.label}</span>
          <span className={styles.sunNextTime}>{fmtDate(nextPhase.date)}</span>
          {fmtCountdown(nextPhase.date.getTime() - now.getTime()) && (
            <span className={styles.sunNextCountdown}>
              {tStr('observatory.in')} {fmtCountdown(nextPhase.date.getTime() - now.getTime())}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
