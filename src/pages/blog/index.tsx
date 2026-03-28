import { Container, Title } from '@mantine/core';
import { GetStaticProps } from 'next';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { PostTimeline } from '../../components/Blog/PostTimeline';
import { Layout } from '../../components/Layout/Layout';
import { getAllPosts } from '../../lib/blog';
import { BlogPost } from '../../types';

type BlogIndexProps = {
  posts: BlogPost[];
};

export default function BlogIndexPage({ posts }: BlogIndexProps) {
  const { t } = useTranslation();

  return (
    <Layout title={t('blog.pageTitle')}>
      <Container size="md" py="xl">
        <Title order={1} mb="xl">
          {t('blog.heading')}
        </Title>
        <PostTimeline posts={posts} />
      </Container>
    </Layout>
  );
}

export const getStaticProps: GetStaticProps<BlogIndexProps> = () => {
  const posts = getAllPosts();
  return { props: { posts } };
};
