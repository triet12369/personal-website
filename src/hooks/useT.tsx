import React from 'react';

import { AnimatedSpan } from '../components/AnimatedText';

export type BilingualText = { en: string; vi: string };

/**
 * Drop-in replacement for `const { t } = useTranslation()` when rendering
 * translated text in JSX. The returned `t()` yields an <AnimatedSpan> that
 * plays the character-scramble effect on language switch.
 *
 * Two call signatures:
 *   t("nav.home")             — i18n key, resolved from i18n resources
 *   t({ en: "Hi", vi: "Xin chào" }) — raw bilingual text (e.g. frontmatter)
 *
 * NOTE: For string contexts (HTML attributes, <Layout title>, aria-label),
 * keep using `useTranslation()` from react-i18next — JSX elements cannot
 * be passed where a plain string is expected.
 */
export function useT(): (input: string | BilingualText) => JSX.Element {
  return (input) => {
    if (typeof input === 'string') {
      return React.createElement(AnimatedSpan, { i18nKey: input });
    }
    return React.createElement(AnimatedSpan, { textEn: input.en, textVi: input.vi });
  };
}
