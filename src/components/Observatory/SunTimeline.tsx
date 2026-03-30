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
import { useTranslation } from 'react-i18next';

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
// Reserved zone at the right edge for the next out-of-window event
const RESERVED_RIGHT = 72; // px
const BREAK_WIDTH = 20;    // px for the break indicator
// Minutes from cursor to the right edge of the visible 4h window
const RIGHT_VISIBLE_MINUTES = (1 - CURSOR_FRACTION) * VISIBLE_HOURS * 60;

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

// Returns the background zone color active at the given minute-of-day
function getZoneColorAtMinute(times: SunTimes, minute: number): string {
  const events: Array<{ minutes: number; color: string }> = [
    { minutes: 0, color: ZONE_COLORS.night },
  ];
  const map: Array<[keyof SunTimes, keyof typeof ZONE_COLORS]> = [
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
    if (m !== null) events.push({ minutes: m, color: ZONE_COLORS[phase] });
  }
  events.sort((a, b) => a.minutes - b.minutes);
  let color = ZONE_COLORS.night;
  for (const ev of events) {
    if (ev.minutes <= minute) color = ev.color;
    else break;
  }
  return color;
}

type Event = {
  key: string;
  label: string;
  shortLabel: string;
  minutes: number;
  date: Date;
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
  nowMs: number,
  containerWidth: number,
): Array<{ x: number; width: number; color: string }> {
  const pxPerMinute = containerWidth / (VISIBLE_HOURS * 60);

  // Do NOT anchor to UTC midnight — for eastern-timezone users, sunCrossing
  // returns dawn events before UTC midnight and dusk events after it, so a
  // midnight 'night' boundary would land in the middle of the day zone.
  // Instead use ±24h bookends and let the actual event timestamps drive
  // every zone transition.
  const DAY_MS = 24 * 60 * 60 * 1000;
  const boundaries: Array<{ ms: number; phase: string }> = [
    { ms: nowMs - DAY_MS, phase: 'night' },
    { ms: nowMs + DAY_MS, phase: 'night' },
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
    const d = times[key];
    if (d != null) boundaries.push({ ms: d.getTime(), phase });
  }

  boundaries.sort((a, b) => a.ms - b.ms);

  const zones: Array<{ x: number; width: number; color: string }> = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    const deltaMin1 = (boundaries[i].ms - nowMs) / 60000;
    const deltaMin2 = (boundaries[i + 1].ms - nowMs) / 60000;
    zones.push({
      x: CURSOR_FRACTION * containerWidth + deltaMin1 * pxPerMinute,
      width: (deltaMin2 - deltaMin1) * pxPerMinute,
      color: ZONE_COLORS[boundaries[i].phase as keyof typeof ZONE_COLORS] ?? ZONE_COLORS.night,
    });
  }

  return zones;
}

export const SunTimeline: FC<Props> = ({ times, now }) => {
  const { t: tStr } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(300);
  const [, forceUpdate] = useState(0);

  const SHORT: Record<string, string> = {
    astronomicalDawn: tStr('observatory.sunShortAstroDawn'),
    nauticalDawn: tStr('observatory.sunShortNautDawn'),
    civilDawn: tStr('observatory.sunShortCivilDawn'),
    sunrise: tStr('observatory.sunrise'),
    sunset: tStr('observatory.sunset'),
    civilDusk: tStr('observatory.sunShortCivilDusk'),
    nauticalDusk: tStr('observatory.sunShortNautDusk'),
    astronomicalDusk: tStr('observatory.sunShortAstroDusk'),
  };

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
  const nextEvent =
    allEvents
      .filter((e) => e.date.getTime() > nowMs)
      .sort((a, b) => a.date.getTime() - b.date.getTime())[0] ?? null;

  // Use real millisecond delta (not UTC-minute arithmetic) so timezone wraps don't confuse it
  const nextEventMsAhead = nextEvent ? nextEvent.date.getTime() - nowMs : null;
  const nextEventMinAhead = nextEventMsAhead != null ? nextEventMsAhead / 60000 : null;

  // Show break zone when: there IS a next event AND it falls beyond the right edge of the 4h window
  const nextEventIsVisible =
    nextEventMinAhead != null &&
    nextEventMinAhead >= 0 &&
    nextEventMinAhead < RIGHT_VISIBLE_MINUTES;
  const showBreakZone = nextEvent != null && !nextEventIsVisible;

  console.log("Debug log", { nowMinutes, nextEvent, nextEventMinAhead, nextEventIsVisible, showBreakZone });

  // Cursor always sits at CURSOR_FRACTION * width — never move it.
  // When a break zone is needed, clip the main tape at a fixed distance and
  // render the break symbol + next-event slot in the reserved right strip.
  const cursorX = CURSOR_FRACTION * width;
  const clipRight = showBreakZone ? Math.max(80, width - RESERVED_RIGHT - BREAK_WIDTH) : width;
  const breakSymbolCenterX = clipRight + BREAK_WIDTH / 2;
  const nextSlotCenterX = clipRight + BREAK_WIDTH + (RESERVED_RIGHT - BREAK_WIDTH) / 2;

  // Zone colors for the reserved slot
  const currentZoneColor = showBreakZone
    ? getZoneColorAtMinute(times, nowMinutes)
    : ZONE_COLORS.night;
  const nextSlotZoneColor = showBreakZone && nextEvent
    ? getZoneColorAtMinute(times, nextEvent.minutes)
    : ZONE_COLORS.night;

  // Always compute positions using the full width so the cursor stays fixed.
  const zones = buildZones(times, nowMs, width);

  // Only render events within the visible tape window
  const leftWindowMinutes = CURSOR_FRACTION * VISIBLE_HOURS * 60 + 60;
  const rightWindowMinutes = showBreakZone
    ? (clipRight / width) * VISIBLE_HOURS * 60 - CURSOR_FRACTION * VISIBLE_HOURS * 60
    : (1 - CURSOR_FRACTION) * VISIBLE_HOURS * 60 + 60;
  const visibleEvents = allEvents.filter((e) => {
    const delta = (e.date.getTime() - nowMs) / 60000;
    return delta >= -leftWindowMinutes && delta < rightWindowMinutes;
  });

  return (
    <div className={styles.sunTimeline} ref={containerRef}>
      <svg
        width={width}
        height={SVG_HEIGHT}
        style={{ display: 'block', overflow: 'visible' }}
      >
        <defs>
          {showBreakZone && (
            <clipPath id="sunMainClip">
              <rect x={0} y={0} width={clipRight} height={SVG_HEIGHT} />
            </clipPath>
          )}
        </defs>

        {/* Zone fill rects — clipped to main area when break zone is active */}
        <g clipPath={showBreakZone ? 'url(#sunMainClip)' : undefined}>
          {zones.map((z, i) => (
            <rect
              key={i}
              x={z.x}
              y={ZONE_Y}
              width={Math.max(0, z.width)}
              height={ZONE_HEIGHT}
              fill={z.color}
            />
          ))}
        </g>

        {/* Event ticks + labels */}
        {visibleEvents.map((ev, idx) => {
          const deltaMin = (ev.date.getTime() - nowMs) / 60000;
          const x = CURSOR_FRACTION * width + deltaMin * (width / (VISIBLE_HOURS * 60));
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

        {/* ── Break indicator + next-event slot ──────────────────── */}
        {showBreakZone && nextEvent && (
          <g>
            {/* Current zone bar: from clipRight + BREAK_WIDTH → nextSlotCenterX */}
            <rect
              x={clipRight + BREAK_WIDTH}
              y={ZONE_Y}
              width={Math.max(0, nextSlotCenterX - (clipRight + BREAK_WIDTH))}
              height={ZONE_HEIGHT}
              fill={currentZoneColor}
              rx={4}
            />
            {/* Next zone bar: from nextSlotCenterX → width */}
            <rect
              x={nextSlotCenterX}
              y={ZONE_Y}
              width={Math.max(0, width - nextSlotCenterX)}
              height={ZONE_HEIGHT}
              fill={nextSlotZoneColor}
              rx={4}
            />
            {/* Break lines ( || ) centred at breakSymbolCenterX */}
            <line
              x1={breakSymbolCenterX - 4}
              y1={TICK_TOP + 6}
              x2={breakSymbolCenterX - 4}
              y2={TICK_BOTTOM - 6}
              stroke="rgba(255,255,255,0.55)"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
            <line
              x1={breakSymbolCenterX + 4}
              y1={TICK_TOP + 6}
              x2={breakSymbolCenterX + 4}
              y2={TICK_BOTTOM - 6}
              stroke="rgba(255,255,255,0.55)"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
            {/* Next event tick */}
            <line
              x1={nextSlotCenterX}
              y1={TICK_TOP}
              x2={nextSlotCenterX}
              y2={TICK_BOTTOM}
              stroke="#facc15"
              strokeWidth={2}
            />
            {/* Next event short label (below zone bar) */}
            <text
              x={nextSlotCenterX}
              y={LABEL_Y_BOTTOM}
              textAnchor="middle"
              dominantBaseline="hanging"
              fontSize={11}
              fill="#facc15"
              fontFamily="Raleway, -apple-system, BlinkMacSystemFont, sans-serif"
            >
              {nextEvent.shortLabel}
            </text>
            {/* Next event HH:MM below label */}
            <text
              x={nextSlotCenterX}
              y={LABEL_Y_BOTTOM + 13}
              textAnchor="middle"
              dominantBaseline="hanging"
              fontSize={10}
              fill="#facc15"
              fontFamily="Raleway, -apple-system, BlinkMacSystemFont, sans-serif"
            >
              {fmtHHMM(nextEvent.date)}
            </text>
          </g>
        )}
      </svg>

      {/* Next event countdown pill */}
      {nextEvent && (
        <div className={styles.sunNextEventPill}>
          <span className={styles.sunNextLabel}>{tStr('observatory.next')}</span>
          <span className={styles.sunNextName}>{nextEvent.shortLabel}</span>
          <span className={styles.sunNextTime}>{fmtHHMM(nextEvent.date)}</span>
          {fmtCountdown(nextEvent.date.getTime() - nowMs) && (
            <span className={styles.sunNextCountdown}>
              {tStr('observatory.in')} {fmtCountdown(nextEvent.date.getTime() - nowMs)}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
