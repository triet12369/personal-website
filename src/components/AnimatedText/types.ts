import type { CSSProperties } from 'react';

export type AnimateWordOptions = {
  from: string;
  to: string;
  delay: number;
  onFrame: (current: string) => void;
  onStyleFrame?: (style: CSSProperties) => void;
  onComplete: () => void;
};

export type WordTransitionEffect = {
  animateWord(options: AnimateWordOptions): () => void;
};

export type AnimatedTextConfig = {
  effect: WordTransitionEffect;
  staggerOrder: 'random' | 'ltr';
  staggerDelayMs: number;
};
