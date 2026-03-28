import { useContext } from 'react';

import { LanguageContext } from '../providers/LanguageProvider';

export type Language = 'en' | 'vi';

type LanguageContextType = {
  lang: Language;
  setLang: (lang: Language) => void;
};

export function useLanguage(): LanguageContextType {
  return useContext(LanguageContext) as LanguageContextType;
}
