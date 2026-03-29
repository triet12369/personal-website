import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './DemoFrame.module.scss';

type Props = {
  /** Matches the directory name under demos/ and public/demos/. */
  slug: string;
  /** Fixed height override. If omitted, height is derived from the iframe content. */
  height?: number | string;
  title?: string;
};

export const DemoFrame: React.FC<Props> = ({ slug, height: heightProp, title }) => {
  const { t } = useTranslation();
  const [loaded, setLoaded] = useState(false);
  const [autoHeight, setAutoHeight] = useState<number | undefined>(undefined);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const roRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const measure = () => {
      const doc = iframe.contentDocument;
      if (!doc) return;
      const h = doc.documentElement.scrollHeight || doc.body?.scrollHeight;
      if (h) setAutoHeight(h);
    };

    const onLoad = () => {
      setLoaded(true);
      if (!heightProp) {
        measure();
        const target = iframe.contentDocument?.documentElement ?? iframe.contentDocument?.body;
        if (target) {
          roRef.current = new ResizeObserver(measure);
          roRef.current.observe(target);
        }
      }
    };

    if (iframe.contentDocument?.readyState === 'complete') {
      onLoad();
      return;
    }

    iframe.addEventListener('load', onLoad);
    return () => {
      iframe.removeEventListener('load', onLoad);
      roRef.current?.disconnect();
    };
  }, [heightProp]);

  const effectiveHeight = heightProp ?? autoHeight ?? 200;
  const src = `/demos/${slug}/index.html`;

  return (
    <div className={styles.root} style={{ height: effectiveHeight }}>
      {!loaded && (
        <div className={styles.placeholder} aria-hidden>
          {t('demo.loading')}
        </div>
      )}
      <iframe
        ref={iframeRef}
        className={styles.frame}
        src={src}
        title={title ?? slug}
        style={{ opacity: loaded ? 1 : 0 }}
        aria-label={title ?? slug}
      />
    </div>
  );
};
