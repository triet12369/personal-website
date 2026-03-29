import { useContext } from 'react';

import { LanguageContext } from '../providers/LanguageProvider';

export type Language = 'en' | 'vi';

export type LanguageContextType = {
  lang: Language;
  pendingLang: Language;
  isTransitioning: boolean;
  setLang: (lang: Language) => void;
};

export function useLanguage(): LanguageContextType {
  return useContext(LanguageContext) as LanguageContextType;
}
