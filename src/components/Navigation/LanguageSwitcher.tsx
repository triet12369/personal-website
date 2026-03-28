import React from 'react';

import { Language, useLanguage } from '../../hooks/useLanguage';

import styles from './LanguageSwitcher.module.scss';

const OPTIONS: { code: Language; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'vi', label: 'VI' },
];

export const LanguageSwitcher: React.FC = () => {
  const { lang, setLang } = useLanguage();

  return (
    <div className={styles.switcher}>
      {OPTIONS.map((opt, i) => (
        <React.Fragment key={opt.code}>
          {i > 0 && <span className={styles.divider}>|</span>}
          <button
            className={`${styles.btn}${lang === opt.code ? ` ${styles.active}` : ''}`}
            onClick={() => setLang(opt.code)}
            aria-pressed={lang === opt.code}
          >
            {opt.label}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
};
