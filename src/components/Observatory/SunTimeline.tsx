/**
 * Horizontal scrolling day timeline for SunCard.
 *
 * Layout:
 *  - The visible window shows ±3h around the current time.
 *  - The "tape" is a 24h SVG strip; it translates so the current moment
 *    is always at 30% from the left edge of the container.
 *  - Color zones (dark → astro → nautical → civil → day) transition smoothly.
 *  - Each event gets a tick mark + short label + HH:MM.
 *  - The next upcoming event shows a floating countdown badge.
 */

import React, { FC, useEffect, useRef, useState } from 'react';

import type { SunTimes } from '../../lib/astronomy/sun';
import styles from './Observatory.module.scss';

type Props = {
  times: SunTimes;
  now: Date;
};

// Zone fill colors (dark → astronomical twilight → nautical → civil → day)
const ZONE_COLORS = {
  night: 'rgba(15, 12, 41, 0.9)',
  astro: 'rgba(30, 20, 70, 0.9)',
  nautical: 'rgba(60, 40, 100, 0.9)',
  civil: 'rgba(120, 80, 60, 0.9)',
  day: 'rgba(250, 200, 80, 0.25)',
};

const SVG_HEIGHT = 88;
const ZONE_HEIGHT = 18;
const ZONE_Y = (SVG_HEIGHT - ZONE_HEIGHT) / 2;
const TICK_TOP = ZONE_Y - 12;
const TICK_BOTTOM = ZONE_Y + ZONE_HEIGHT + 12;
const LABEL_Y_TOP = TICK_TOP - 4;
const LABEL_Y_BOTTOM = TICK_BOTTOM + 12;

// ±2h window — 4h total visible
const VISIBLE_HOURS = 4;
// "now" cursor sits 30% from left
const CURSOR_FRACTION = 0.3;

function minutesOfDay(d: Date | null): number | null {
  if (!d) return null;
  return d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60;
}

function fmtHHMM(d: Date | null): string {
  if (!d) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function fmtCountdown(diffMs: number): string {
  const total = Math.round(diffMs / 60000);
  if (total <= 0) return '';
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

type Event = {
  key: string;
  label: string;
  shortLabel: string;
  minutes: number;
  date: Date;
};

const SHORT: Record<string, string> = {
  astronomicalDawn: 'Astro Dawn',
  nauticalDawn: 'Naut Dawn',
  civilDawn: 'Civil Dawn',
  sunrise: 'Sunrise',
  sunset: 'Sunset',
  civilDusk: 'Civil Dusk',
  nauticalDusk: 'Naut Dusk',
  astronomicalDusk: 'Astro Dusk',
};

// Returns x position (0–1) for a given minute-of-day in the 24h tape,
// scaled so the container width = VISIBLE_HOURS hours.
function minuteToX(
  minuteOfDay: number,
  nowMinutes: number,
  containerWidth: number,
): number {
  const pxPerMinute = containerWidth / (VISIBLE_HOURS * 60);
  const deltaMinutes = minuteOfDay - nowMinutes;
  return CURSOR_FRACTION * containerWidth + deltaMinutes * pxPerMinute;
}

// Build ordered list of zone fill rects from event times
function buildZones(
  times: SunTimes,
  nowMinutes: number,
  containerWidth: number,
): Array<{ x: number; width: number; color: string }> {
  const events: Array<{ minutes: number; phase: string }> = [
    { minutes: 0, phase: 'night' },
  ];

  const map: Array<[keyof SunTimes, string]> = [
    ['astronomicalDawn', 'astro'],
    ['nauticalDawn', 'nautical'],
    ['civilDawn', 'civil'],
    ['sunrise', 'day'],
    ['sunset', 'civil'],
    ['civilDusk', 'nautical'],
    ['nauticalDusk', 'astro'],
    ['astronomicalDusk', 'night'],
  ];

  for (const [key, phase] of map) {
    const m = minutesOfDay(times[key]);
    if (m !== null) events.push({ minutes: m, phase });
  }

  // Close out at end of day
  events.push({ minutes: 24 * 60, phase: 'night' });

  // Sort by time
  events.sort((a, b) => a.minutes - b.minutes);

  const zones: Array<{ x: number; width: number; color: string }> = [];
  for (let i = 0; i < events.length - 1; i++) {
    const x1 = minuteToX(events[i].minutes, nowMinutes, containerWidth);
    const x2 = minuteToX(events[i + 1].minutes, nowMinutes, containerWidth);
    zones.push({
      x: x1,
      width: x2 - x1,
      color: ZONE_COLORS[events[i].phase as keyof typeof ZONE_COLORS] ?? ZONE_COLORS.night,
    });
  }

  return zones;
}

export const SunTimeline: FC<Props> = ({ times, now }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(300);
  const [, forceUpdate] = useState(0);

  // Observe container width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width || 300);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Refresh countdown every 30s
  useEffect(() => {
    const id = setInterval(() => forceUpdate((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes() + now.getUTCSeconds() / 60;

  // Collect valid events
  const allEvents: Event[] = (
    [
      { key: 'astronomicalDawn', date: times.astronomicalDawn },
      { key: 'nauticalDawn', date: times.nauticalDawn },
      { key: 'civilDawn', date: times.civilDawn },
      { key: 'sunrise', date: times.sunrise },
      { key: 'sunset', date: times.sunset },
      { key: 'civilDusk', date: times.civilDusk },
      { key: 'nauticalDusk', date: times.nauticalDusk },
      { key: 'astronomicalDusk', date: times.astronomicalDusk },
    ] as Array<{ key: string; date: Date | null }>
  )
    .filter((e): e is { key: string; date: Date } => e.date !== null)
    .map((e) => ({
      key: e.key,
      label: SHORT[e.key] ?? e.key,
      shortLabel: SHORT[e.key] ?? e.key,
      minutes: minutesOfDay(e.date)!,
      date: e.date,
    }));

  // Next upcoming event
  const nowMs = now.getTime();
  const nextEvent = allEvents
    .filter((e) => e.date.getTime() > nowMs)
    .sort((a, b) => a.date.getTime() - b.date.getTime())[0] ?? null;

  const zones = buildZones(times, nowMinutes, width);
  const cursorX = CURSOR_FRACTION * width;

  // Only render events within ±(VISIBLE_HOURS/2 + 1)h of now for legibility
  const windowMinutes = (VISIBLE_HOURS / 2 + 1) * 60;
  const visibleEvents = allEvents.filter(
    (e) => Math.abs(e.minutes - nowMinutes) < windowMinutes,
  );

  return (
    <div className={styles.sunTimeline} ref={containerRef}>
      <svg
        width={width}
        height={SVG_HEIGHT}
        style={{ display: 'block', overflow: 'visible' }}
      >
        {/* Zone fill rects */}
        {zones.map((z, i) => (
          <rect
            key={i}
            x={z.x}
            y={ZONE_Y}
            width={Math.max(0, z.width)}
            height={ZONE_HEIGHT}
            fill={z.color}
            rx={4}
          />
        ))}

        {/* Event ticks + labels */}
        {visibleEvents.map((ev, idx) => {
          const x = minuteToX(ev.minutes, nowMinutes, width);
          const isNext = nextEvent?.key === ev.key;
          const labelBelow = idx % 2 === 1;

          return (
            <g key={ev.key}>
              {/* Tick line */}
              <line
                x1={x}
                y1={TICK_TOP}
                x2={x}
                y2={TICK_BOTTOM}
                stroke={isNext ? '#facc15' : 'rgba(255,255,255,0.45)'}
                strokeWidth={isNext ? 2 : 1}
              />
              {/* Short label */}
              <text
                x={x}
                y={labelBelow ? LABEL_Y_BOTTOM : LABEL_Y_TOP}
                textAnchor="middle"
                dominantBaseline={labelBelow ? 'hanging' : 'auto'}
                fontSize={11}
                fill={isNext ? '#facc15' : '#ffffff'}
                fontFamily="Raleway, -apple-system, BlinkMacSystemFont, sans-serif"
              >
                {ev.shortLabel}
              </text>
              {/* HH:MM below label */}
              <text
                x={x}
                y={labelBelow ? LABEL_Y_BOTTOM + 12 : LABEL_Y_TOP - 12}
                textAnchor="middle"
                dominantBaseline={labelBelow ? 'hanging' : 'auto'}
                fontSize={10}
                fill={isNext ? '#facc15' : '#ffffff'}
                fontFamily="Raleway, -apple-system, BlinkMacSystemFont, sans-serif"
              >
                {fmtHHMM(ev.date)}
              </text>
            </g>
          );
        })}

        {/* Cursor (current time) */}
        <line
          x1={cursorX}
          y1={ZONE_Y - 12}
          x2={cursorX}
          y2={ZONE_Y + ZONE_HEIGHT + 12}
          stroke="#ffffff"
          strokeWidth={2}
          strokeLinecap="round"
        />
        <circle cx={cursorX} cy={ZONE_Y - 12} r={3} fill="#ffffff" />
      </svg>

      {/* Next event countdown pill */}
      {nextEvent && (
        <div className={styles.sunNextEventPill}>
          <span className={styles.sunNextLabel}>Next</span>
          <span className={styles.sunNextName}>{nextEvent.shortLabel}</span>
          <span className={styles.sunNextTime}>{fmtHHMM(nextEvent.date)}</span>
          {fmtCountdown(nextEvent.date.getTime() - nowMs) && (
            <span className={styles.sunNextCountdown}>
              in {fmtCountdown(nextEvent.date.getTime() - nowMs)}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
