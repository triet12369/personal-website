import { Container, Title } from '@mantine/core';
import { GetStaticPaths, GetStaticProps } from 'next';
import { MDXRemote, MDXRemoteSerializeResult } from 'next-mdx-remote';
import { serialize } from 'next-mdx-remote/serialize';
import React from 'react';

import { MDXComponents } from '../../components/Blog/MDXComponents';
import { PROJECT_COMPONENTS } from '../../components/Projects/registry';
import { Layout } from '../../components/Layout/Layout';
import { useLanguage } from '../../hooks/useLanguage';
import { getAllProjects, getProjectBySlug } from '../../lib/projects';
import { ProjectFrontmatter } from '../../types';

type ProjectPageProps = {
  frontmatter: ProjectFrontmatter;
  mdxSource: MDXRemoteSerializeResult;
  frontmatter_vi?: ProjectFrontmatter;
  mdxSource_vi?: MDXRemoteSerializeResult;
  slug: string;
};

export default function ProjectPage({
  frontmatter,
  mdxSource,
  frontmatter_vi,
  mdxSource_vi,
  slug,
}: ProjectPageProps) {
  const { lang } = useLanguage();

  const showVi = lang === 'vi';
  const hasVi = !!mdxSource_vi;
  const activeFm = showVi && frontmatter_vi ? frontmatter_vi : frontmatter;
  const activeMdx = showVi && mdxSource_vi ? mdxSource_vi : mdxSource;

  return (
    <Layout title={activeFm.title} blurBackground>
      <Container size="md" py="xl">
        <Title order={1} mb="xs">
          {activeFm.title}
        </Title>
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
            Xin lỗi, tôi chưa có thời gian dịch trang này. Vui lòng xem phiên bản tiếng Anh
            bên dưới.
          </p>
        )}
        <div style={{ marginTop: '2rem' }}>
          <MDXRemote
            {...activeMdx}
            components={{ ...MDXComponents, ...PROJECT_COMPONENTS[slug] }}
          />
        </div>
      </Container>
    </Layout>
  );
}

export const getStaticPaths: GetStaticPaths = () => {
  const projects = getAllProjects();
  return {
    paths: projects
      .filter((p) => !p.frontmatter.href)
      .map((p) => ({ params: { slug: p.slug } })),
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps<ProjectPageProps> = async ({ params }) => {
  const slug = params?.slug as string;
  const { frontmatter, content, frontmatter_vi, content_vi } = getProjectBySlug(slug);

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
