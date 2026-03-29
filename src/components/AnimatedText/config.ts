// import { characterScramble } from './effects/characterScramble';
import { fade } from './effects/fade';
import type { AnimatedTextConfig } from './types';

// ---------------------------------------------------------------------------
// Scramble effect
// ---------------------------------------------------------------------------

/** Characters cycled through during the scramble animation. */
export const SCRAMBLE_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789' +
  // Vietnamese diacritics
  'àáâãèéêìíòóôõùúýăđơư' +
  'ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝĂĐƠƯ' +
  'ảạặắằẳẵấầẩẫậếềểễệỉịọộốồổỗợớờởỡụứừửữựỳỵỷỹ' +
  'ẢẠẶẮẰẲẴẤẦẨẪẬẾỀỂỄỆỈỊỌỘỐỒỔỖỢỚỜỞỠỤỨỪỬỮỰỲỴỶỸ';

/** How often (ms) a new random frame is rendered per word. */
export const SCRAMBLE_FRAME_INTERVAL_MS = 100;

/** How long (ms) each word scrambles before snapping to its final value. */
export const SCRAMBLE_DURATION_MS = 350;

// ---------------------------------------------------------------------------
// Fade effect
// ---------------------------------------------------------------------------

/** Duration (ms) of the per-word fade-out step. */
export const FADE_OUT_MS = 150;

/** Duration (ms) of the per-word fade-in step. */
export const FADE_IN_MS = 150;

// ---------------------------------------------------------------------------
// MDX body
// ---------------------------------------------------------------------------

/** Duration (ms) for the MDX body opacity fade on detail pages. */
export const MDX_FADE_MS = 150;

// ---------------------------------------------------------------------------
// Language transition
// ---------------------------------------------------------------------------

/**
 * How long (ms) the transition window stays open before `lang` commits to
 * the new language. Should be >= the longest per-word animation total
 * (staggerDelayMs × word count + FADE_OUT_MS + FADE_IN_MS or SCRAMBLE_DURATION_MS).
 */
export const LANG_TRANSITION_MS = 300;

// ---------------------------------------------------------------------------
// Default config
// ---------------------------------------------------------------------------

// Change `effect` here to swap the transition style globally.
export const defaultConfig: AnimatedTextConfig = {
  effect: fade,
  staggerOrder: 'random',
  /** Delay (ms) between each word's animation start. */
  staggerDelayMs: 80,
};
