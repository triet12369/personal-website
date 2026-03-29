import { Container, Title } from '@mantine/core';
import fs from 'fs';
import { GetStaticPaths, GetStaticProps } from 'next';
import { MDXRemote, MDXRemoteSerializeResult } from 'next-mdx-remote';
import { serialize } from 'next-mdx-remote/serialize';
import path from 'path';
import React from 'react';

import { MDXComponents } from '../../components/Blog/MDXComponents';
import { POST_COMPONENTS } from '../../components/Blog/registry';
import { AnimatedSpan, MDX_FADE_MS } from '../../components/AnimatedText';
import { Layout } from '../../components/Layout/Layout';
import { useLanguage } from '../../hooks/useLanguage';
import { useT } from '../../hooks/useT';
import { getAllPosts, getPostBySlug } from '../../lib/blog';
import { resolveContentImage } from '../../lib/resolveContentImage';
import { BlogPostFrontmatter } from '../../types';

// Extensions treated as source files — never copied to /public.
const SOURCE_EXTS = new Set(['.mdx', '.tsx', '.ts', '.scss', '.css']);

type BlogPostPageProps = {
  frontmatter: BlogPostFrontmatter;
  mdxSource: MDXRemoteSerializeResult;
  frontmatter_vi?: BlogPostFrontmatter;
  mdxSource_vi?: MDXRemoteSerializeResult;
  slug: string;
};

export default function BlogPostPage({
  frontmatter,
  mdxSource,
  frontmatter_vi,
  mdxSource_vi,
  slug,
}: BlogPostPageProps) {
  const { lang, isTransitioning } = useLanguage();
  const t = useT();

  const showVi = lang === 'vi';
  const hasVi = !!mdxSource_vi;
  const activeFm = showVi && frontmatter_vi ? frontmatter_vi : frontmatter;
  const activeMdx = showVi && mdxSource_vi ? mdxSource_vi : mdxSource;
  const locale = showVi ? 'vi-VN' : 'en-US';

  return (
    <Layout title={activeFm.title} blurBackground>
      <Container size="md" py="xl">
        <Title order={1} mb="xs">
          {t({ en: frontmatter.title, vi: frontmatter_vi?.title ?? frontmatter.title })}
        </Title>
        <time
          dateTime={activeFm.date}
          style={{
            opacity: 0.85,
            fontSize: '0.72rem',
            fontFamily: "'Raleway', sans-serif",
            fontWeight: 500,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          {new Date(activeFm.date).toLocaleDateString(locale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'UTC',
          })}
        </time>
        {showVi && !hasVi && (
          <p
            style={{
              marginTop: '1.5rem',
              padding: '0.75rem 1rem',
              borderRadius: '0.375rem',
              background: 'var(--mantine-color-yellow-light)',
              color: 'var(--mantine-color-yellow-light-color)',
              fontSize: '0.9rem',
            }}
          >
            Xin lỗi, tôi chưa có thời gian dịch bài này. Vui lòng xem phiên bản tiếng Anh
            bên dưới.
          </p>
        )}
        <div style={{ marginTop: '2rem', transition: `opacity ${MDX_FADE_MS}ms ease`, opacity: isTransitioning ? 0 : 1 }}>
          <MDXRemote
            {...activeMdx}
            components={{ ...MDXComponents, ...POST_COMPONENTS[slug] }}
          />
        </div>
      </Container>
    </Layout>
  );
}

export const getStaticPaths: GetStaticPaths = () => {
  const posts = getAllPosts();
  return {
    paths: posts
      .filter((p) => !p.frontmatter.href)
      .map((p) => ({ params: { slug: p.slug } })),
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps<BlogPostPageProps> = async ({ params }) => {
  const slug = params?.slug as string;
  const { frontmatter, content, frontmatter_vi, content_vi } = getPostBySlug(slug);

  if (frontmatter.href) {
    return { redirect: { destination: frontmatter.href, permanent: false } };
  }

  // Auto-copy every non-source file co-located in the post directory to /public
  // so they are served as static assets (e.g. GIFs, images, audio).
  const postDir = path.join(process.cwd(), 'src/content/blog', slug);
  for (const entry of fs.readdirSync(postDir, { withFileTypes: true })) {
    if (entry.isFile() && !SOURCE_EXTS.has(path.extname(entry.name).toLowerCase())) {
      resolveContentImage(postDir, entry.name);
    }
  }

  const mdxSource = await serialize(content);
  const mdxSource_vi = content_vi ? await serialize(content_vi) : undefined;

  return {
    props: {
      frontmatter,
      mdxSource,
      slug,
      ...(frontmatter_vi && { frontmatter_vi }),
      ...(mdxSource_vi && { mdxSource_vi }),
    },
  };
};
