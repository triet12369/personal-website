import type { AnimateWordOptions, WordTransitionEffect } from '../types';
import { FADE_OUT_MS, FADE_IN_MS } from '../config';

export const fade: WordTransitionEffect = {
  animateWord({ to, delay, onFrame, onStyleFrame, onComplete }: AnimateWordOptions): () => void {
    const timers: ReturnType<typeof setTimeout>[] = [];

    timers.push(
      setTimeout(() => {
        // Fade out the word.
        onStyleFrame?.({ transition: `opacity ${FADE_OUT_MS}ms ease`, opacity: 0 });

        timers.push(
          setTimeout(() => {
            // Snap to new text while invisible, then trigger fade in next frame.
            onFrame(to);
            timers.push(
              setTimeout(() => {
                onStyleFrame?.({ transition: `opacity ${FADE_IN_MS}ms ease`, opacity: 1 });
                timers.push(
                  setTimeout(() => {
                    onStyleFrame?.({});
                    onComplete();
                  }, FADE_IN_MS)
                );
              }, 20) // brief pause so the browser paints opacity:0 + new text before fading in
            );
          }, FADE_OUT_MS)
        );
      }, delay)
    );

    return () => timers.forEach(clearTimeout);
  },
};
