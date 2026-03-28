import { Container, Title } from '@mantine/core';
import { GetStaticPaths, GetStaticProps } from 'next';
import { MDXRemote, MDXRemoteSerializeResult } from 'next-mdx-remote';
import { serialize } from 'next-mdx-remote/serialize';
import React from 'react';

import { MDXComponents } from '../../components/Blog/MDXComponents';
import { POST_COMPONENTS } from '../../components/Blog/registry';
import { Layout } from '../../components/Layout/Layout';
import { useLanguage } from '../../hooks/useLanguage';
import { getAllPosts, getPostBySlug } from '../../lib/blog';
import { BlogPostFrontmatter } from '../../types';

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
  const { lang } = useLanguage();

  const showVi = lang === 'vi';
  const hasVi = !!mdxSource_vi;
  const activeFm = showVi && frontmatter_vi ? frontmatter_vi : frontmatter;
  const activeMdx = showVi && mdxSource_vi ? mdxSource_vi : mdxSource;
  const locale = showVi ? 'vi-VN' : 'en-US';

  return (
    <Layout title={activeFm.title}>
      <Container size="md" py="xl">
        <Title order={1} mb="xs">
          {activeFm.title}
        </Title>
        <time
          dateTime={activeFm.date}
          style={{ opacity: 0.6, fontSize: '0.85rem', fontFamily: 'monospace' }}
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
        <div style={{ marginTop: '2rem' }}>
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
