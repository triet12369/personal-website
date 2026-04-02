import { Container, Title } from '@mantine/core';
import type { GetStaticProps } from 'next';
import { useTranslation } from 'react-i18next';

import { useT } from '../hooks/useT';
import { PostTimeline } from '../components/Blog/PostTimeline';
import { CosmosHero } from '../components/Hero/CosmosHero';
import { Layout } from '../components/Layout/Layout';
import { HERO_NEBULA_CONFIG } from '../components/Hero/heroNebulaConfig';
import { getAllPosts } from '../lib/blog';
import type { BlogPost } from '../types';

type HomePageProps = {
  recentPosts: BlogPost[];
};

export default function IndexPage({ recentPosts }: HomePageProps) {
  const { t: tStr } = useTranslation();
  const t = useT();

  return (
    <Layout title={tStr('home.pageTitle')} blurBackground heroNebula={HERO_NEBULA_CONFIG}>
      <div style={{ height: '60vh' }}>
        <CosmosHero />
      </div>
      <Container size="md" pt="md" pb="xl">
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
