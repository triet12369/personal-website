import React, { createContext, FC, PropsWithChildren, useEffect, useRef, useState } from 'react';

import type { Language } from '../hooks/useLanguage';
import { LANG_TRANSITION_MS } from '../components/AnimatedText/config';
import i18next from '../i18n';
import { LS_KEYS } from '../stores/localStorage';

type LanguageContextType = {
  lang: Language;
  pendingLang: Language;
  isTransitioning: boolean;
  setLang: (lang: Language) => void;
};

export const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  pendingLang: 'en',
  isTransitioning: false,
  setLang: () => undefined,
});

export const LanguageProvider: FC<PropsWithChildren> = ({ children }) => {
  // Always start with 'en' on the server to avoid hydration mismatch.
  // The client effect below corrects to the stored/detected language.
  const [lang, setLangState] = useState<Language>('en');
  const [pendingLang, setPendingLang] = useState<Language>('en');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(LS_KEYS.LANG);
    const detected: Language =
      stored === 'en' || stored === 'vi'
        ? stored
        : navigator.language.startsWith('vi')
        ? 'vi'
        : 'en';
    i18next.changeLanguage(detected);
    setLangState(detected);
    setPendingLang(detected);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const setLang = (next: Language) => {
    // Debounce: ignore while a transition is already running
    if (isTransitioning || next === lang) return;
    localStorage.setItem(LS_KEYS.LANG, next);
    setPendingLang(next);
    setIsTransitioning(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      i18next.changeLanguage(next);
      setLangState(next);
      setIsTransitioning(false);
    }, LANG_TRANSITION_MS);
  };

  return (
    <LanguageContext.Provider value={{ lang, pendingLang, isTransitioning, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
};
