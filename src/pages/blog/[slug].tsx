import { Container, Title } from '@mantine/core';
import { GetStaticPaths, GetStaticProps } from 'next';
import { MDXRemote, MDXRemoteSerializeResult } from 'next-mdx-remote';
import { serialize } from 'next-mdx-remote/serialize';
import React from 'react';

import { MDXComponents } from '../../components/Blog/MDXComponents';
import { POST_COMPONENTS } from '../../components/Blog/registry';
import { Layout } from '../../components/Layout/Layout';
import { getAllPosts, getPostBySlug } from '../../lib/blog';
import { BlogPostFrontmatter } from '../../types';

type BlogPostPageProps = {
  frontmatter: BlogPostFrontmatter;
  mdxSource: MDXRemoteSerializeResult;
  slug: string;
};

export default function BlogPostPage({
  frontmatter,
  mdxSource,
  slug,
}: BlogPostPageProps) {
  return (
    <Layout title={frontmatter.title}>
      <Container size="md" py="xl">
        <Title order={1} mb="xs">
          {frontmatter.title}
        </Title>
        <time
          dateTime={frontmatter.date}
          style={{ opacity: 0.6, fontSize: '0.85rem', fontFamily: 'monospace' }}
        >
          {new Date(frontmatter.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'UTC',
          })}
        </time>
        <div style={{ marginTop: '2rem' }}>
          <MDXRemote
            {...mdxSource}
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
  const { frontmatter, content } = getPostBySlug(slug);

  if (frontmatter.href) {
    return { redirect: { destination: frontmatter.href, permanent: false } };
  }

  const mdxSource = await serialize(content);
  return { props: { frontmatter, mdxSource, slug } };
};
