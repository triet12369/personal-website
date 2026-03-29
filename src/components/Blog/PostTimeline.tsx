import Link from 'next/link';
import React from 'react';

import { CommentCount } from '../Engagement/CommentCount';
import { useLanguage } from '../../hooks/useLanguage';
import { useT } from '../../hooks/useT';
import { BlogPost } from '../../types';

import styles from './PostTimeline.module.scss';

type PostTimelineProps = {
  posts: BlogPost[];
};

export const PostTimeline: React.FC<PostTimelineProps> = ({ posts }) => {
  const { lang } = useLanguage();
  const t = useT();

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
            <div className={styles.dateLine}>
              <time className={styles.date} dateTime={fm.date}>
                {new Date(fm.date).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  timeZone: 'UTC',
                })}
              </time>
              {!isExternal && <CommentCount slug={post.slug} />}
            </div>
            <div className={styles.content}>
              {post.imageUrl && (
                <div className={styles.imageWrapper}>
                  <img src={post.imageUrl} alt={fm.title} className={styles.image} />
                </div>
              )}
              <Link href={href} passHref>
                <a
                  className={styles.title}
                  {...(isExternal
                    ? { target: '_blank', rel: 'noopener noreferrer' }
                    : {})}
                >
                  {t({ en: post.frontmatter.title, vi: post.frontmatter_vi?.title ?? post.frontmatter.title })}
                </a>
              </Link>
              {(post.frontmatter.description || post.frontmatter_vi?.description) && (
                <p className={styles.description}>
                  {t({ en: post.frontmatter.description ?? '', vi: post.frontmatter_vi?.description ?? post.frontmatter.description ?? '' })}
                </p>
              )}
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
