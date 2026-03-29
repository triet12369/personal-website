import React, { CSSProperties, useEffect, useRef, useState } from 'react';

import i18next from '../../i18n';
import { useLanguage } from '../../hooks/useLanguage';
import { defaultConfig } from './config';
import type { AnimatedTextConfig } from './types';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type I18nKeyProps = { i18nKey: string };
type BilingualProps = { textEn: string; textVi: string };

export type AnimatedSpanProps = (I18nKeyProps | BilingualProps) & {
  config?: AnimatedTextConfig;
};

export const AnimatedSpan: React.FC<AnimatedSpanProps> = (props) => {
  const { lang, pendingLang, isTransitioning } = useLanguage();
  const config = props.config ?? defaultConfig;

  const fromText =
    'i18nKey' in props
      ? i18next.t(props.i18nKey, { lng: lang })
      : lang === 'vi'
      ? props.textVi
      : props.textEn;

  const toText =
    'i18nKey' in props
      ? i18next.t(props.i18nKey, { lng: pendingLang })
      : pendingLang === 'vi'
      ? props.textVi
      : props.textEn;

  // null = not animating; string[] = actively animating word frames
  const [animatedWords, setAnimatedWords] = useState<string[] | null>(null);
  // Per-word inline styles (e.g. opacity for the fade effect)
  const [wordStyles, setWordStyles] = useState<CSSProperties[]>([]);

  const displayWords = animatedWords ?? fromText.split(' ');

  const cleanupRef = useRef<() => void>(() => {});
  const prevTransitioningRef = useRef(false);

  const prefersReducedMotion =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  useEffect(() => {
    const wasTransitioning = prevTransitioningRef.current;
    prevTransitioningRef.current = isTransitioning;

    if (isTransitioning && !wasTransitioning) {
      if (prefersReducedMotion) return;

      cleanupRef.current();

      const fromWords = fromText.split(' ');
      const toWords = toText.split(' ');
      const n = Math.max(fromWords.length, toWords.length);

      while (fromWords.length < n) fromWords.push('');
      while (toWords.length < n) toWords.push('');

      const displayArr = [...fromWords];
      const stylesArr: CSSProperties[] = new Array(n).fill({});
      setAnimatedWords([...displayArr]);
      setWordStyles([...stylesArr]);

      const indices = Array.from({ length: n }, (_, i) => i);
      const orderedIndices =
        config.staggerOrder === 'random' ? shuffle(indices) : indices;

      const cleanups = orderedIndices.map((wordIdx, staggerPos) =>
        config.effect.animateWord({
          from: fromWords[wordIdx],
          to: toWords[wordIdx],
          delay: staggerPos * config.staggerDelayMs,
          onFrame: (current) => {
            displayArr[wordIdx] = current;
            setAnimatedWords([...displayArr]);
          },
          onStyleFrame: (style) => {
            stylesArr[wordIdx] = style;
            setWordStyles([...stylesArr]);
          },
          onComplete: () => {
            displayArr[wordIdx] = toWords[wordIdx];
            stylesArr[wordIdx] = {};
          },
        })
      );

      cleanupRef.current = () => cleanups.forEach((fn) => fn());
    } else if (!isTransitioning && wasTransitioning) {
      cleanupRef.current();
      cleanupRef.current = () => {};
      setAnimatedWords(null);
      setWordStyles([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTransitioning]);

  useEffect(() => () => cleanupRef.current(), []);

  return (
    <span>
      {displayWords.map((word, i) => (
        <React.Fragment key={i}>
          {i > 0 && ' '}
          <span style={wordStyles[i] ?? {}}>{word}</span>
        </React.Fragment>
      ))}
    </span>
  );
};
