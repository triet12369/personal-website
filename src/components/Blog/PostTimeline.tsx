import Link from 'next/link';
import React from 'react';

import { BlogPost } from '../../types';

import styles from './PostTimeline.module.scss';

type PostTimelineProps = {
  posts: BlogPost[];
};

export const PostTimeline: React.FC<PostTimelineProps> = ({ posts }) => {
  if (posts.length === 0) {
    return <p className={styles.empty}>No posts yet.</p>;
  }

  return (
    <ol className={styles.timeline}>
      {posts.map((post) => {
        const href = post.frontmatter.href ?? `/blog/${post.slug}`;
        const isExternal = !!post.frontmatter.href;

        return (
          <li key={post.slug} className={styles.item}>
            <time className={styles.date} dateTime={post.frontmatter.date}>
              {new Date(post.frontmatter.date).toLocaleDateString('en-US', {
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
                  {post.frontmatter.title}
                </a>
              </Link>
              {post.frontmatter.description && (
                <p className={styles.description}>{post.frontmatter.description}</p>
              )}
              {post.frontmatter.tags && post.frontmatter.tags.length > 0 && (
                <ul className={styles.tags}>
                  {post.frontmatter.tags.map((tag) => (
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
