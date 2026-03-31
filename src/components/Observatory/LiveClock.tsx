/**
 * Live clock updating every second.
 * Exposes the current Date via onTick callback (called each minute for
 * triggering astronomy recalculations).
 */

import { Stack, Text } from '@mantine/core';
import React, { FC, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './Observatory.module.scss';

type Props = {
  onMinuteTick?: (date: Date) => void;
};

function formatTime(date: Date, locale: string): string {
  return date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function formatDate(date: Date, locale: string): string {
  return date.toLocaleDateString(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTZ(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return '';
  }
}

export const LiveClock: FC<Props> = ({ onMinuteTick }) => {
  const { i18n } = useTranslation();
  const locale = i18n.language;
  const [now, setNow] = useState<Date | null>(null);
  const lastMinuteRef = useRef<number>(-1);

  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => {
      const d = new Date();
      setNow(d);
      const min = d.getMinutes();
      if (min !== lastMinuteRef.current) {
        lastMinuteRef.current = min;
        onMinuteTick?.(d);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [onMinuteTick]);

  if (!now) return null;

  return (
    <Stack gap={2}>
      <div className={styles.clockDisplay}>{formatTime(now, locale)}</div>
      <Text className={styles.dateDisplay}>{formatDate(now, locale)}</Text>
      <Text size="xs" c="dimmed">
        {formatTZ()} · UTC{now.getTimezoneOffset() <= 0 ? '+' : ''}
        {-now.getTimezoneOffset() / 60}
      </Text>
    </Stack>
  );
};
