import React, { createContext, FC, PropsWithChildren, useEffect, useState } from 'react';

import { Language } from '../hooks/useLanguage';
import i18next from '../i18n';
import { LS_KEYS } from '../stores/localStorage';

type LanguageContextType = {
  lang: Language;
  setLang: (lang: Language) => void;
};

export const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  setLang: () => undefined,
});

export const LanguageProvider: FC<PropsWithChildren> = ({ children }) => {
  // Always start with 'en' on the server to avoid hydration mismatch.
  // The client effect below corrects to the stored/detected language.
  const [lang, setLangState] = useState<Language>('en');

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
  }, []);

  const setLang = (next: Language) => {
    localStorage.setItem(LS_KEYS.LANG, next);
    i18next.changeLanguage(next);
    setLangState(next);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
};
