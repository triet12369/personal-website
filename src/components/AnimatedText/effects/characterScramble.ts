import type { AnimateWordOptions, WordTransitionEffect } from '../types';
import {
  SCRAMBLE_CHARS,
  SCRAMBLE_FRAME_INTERVAL_MS,
  SCRAMBLE_DURATION_MS,
} from '../config';

function randomChars(length: number): string {
  return Array.from({ length: Math.max(1, length) }, () =>
    SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]
  ).join('');
}

export const characterScramble: WordTransitionEffect = {
  animateWord({ to, delay, onFrame, onComplete }: AnimateWordOptions): () => void {
    let timeoutId: ReturnType<typeof setTimeout>;
    let intervalId: ReturnType<typeof setInterval>;
    let elapsed = 0;

    timeoutId = setTimeout(() => {
      onFrame(randomChars(to.length));
      intervalId = setInterval(() => {
        elapsed += SCRAMBLE_FRAME_INTERVAL_MS;
        if (elapsed >= SCRAMBLE_DURATION_MS) {
          clearInterval(intervalId);
          onFrame(to);
          onComplete();
        } else {
          onFrame(randomChars(to.length));
        }
      }, SCRAMBLE_FRAME_INTERVAL_MS);
    }, delay);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  },
};
