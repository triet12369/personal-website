import { useContext } from 'react';

import { LanguageContext } from '../providers/LanguageProvider';

export type Language = 'en' | 'vi';

export function useLanguage() {
  return useContext(LanguageContext);
}
