import Link from 'next/link';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useLanguage } from '../../hooks/useLanguage';
import { BlogPost } from '../../types';

import styles from './PostTimeline.module.scss';

type PostTimelineProps = {
  posts: BlogPost[];
};

export const PostTimeline: React.FC<PostTimelineProps> = ({ posts }) => {
  const { lang } = useLanguage();
  const { t } = useTranslation();

  if (posts.length === 0) {
    return <p className={styles.empty}>{t('blog.noPostsYet')}</p>;
  }

  return (
    <ol className={styles.timeline}>
      {posts.map((post) => {
        const fm =
          lang === 'vi' && post.frontmatter_vi ? post.frontmatter_vi : post.frontmatter;
        const href = post.frontmatter.href ?? `/blog/${post.slug}`;
        const isExternal = !!post.frontmatter.href;

        return (
          <li key={post.slug} className={styles.item}>
            <time className={styles.date} dateTime={fm.date}>
              {new Date(fm.date).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                timeZone: 'UTC',
              })}
            </time>
            <div className={styles.content}>
              <Link href={href} passHref>
                <a
                  className={styles.title}
                  {...(isExternal
                    ? { target: '_blank', rel: 'noopener noreferrer' }
                    : {})}
                >
                  {fm.title}
                </a>
              </Link>
              {fm.description && <p className={styles.description}>{fm.description}</p>}
              {fm.tags && fm.tags.length > 0 && (
                <ul className={styles.tags}>
                  {fm.tags.map((tag) => (
                    <li key={tag} className={styles.tag}>
                      {tag}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
};
