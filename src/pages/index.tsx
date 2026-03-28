import { Button, Container, Group, Title } from '@mantine/core';
import { GetStaticProps } from 'next';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { PostTimeline } from '../components/Blog/PostTimeline';
import { Layout } from '../components/Layout/Layout';
import { getAllPosts } from '../lib/blog';
import { BlogPost } from '../types';

type HomePageProps = {
  recentPosts: BlogPost[];
};

export default function IndexPage({ recentPosts }: HomePageProps) {
  const { t } = useTranslation();

  return (
    <Layout title={t('home.pageTitle')}>
      <Group mt={50} justify="center">
        <Button size="xl">{t('home.helloButton')}</Button>
      </Group>
      <Container size="md" py="xl">
        <Title order={2} mb="xl">
          {t('home.recentPosts')}
        </Title>
        <PostTimeline posts={recentPosts} />
      </Container>
    </Layout>
  );
}

export const getStaticProps: GetStaticProps<HomePageProps> = () => {
  const recentPosts = getAllPosts().slice(0, 3);
  return { props: { recentPosts } };
};
