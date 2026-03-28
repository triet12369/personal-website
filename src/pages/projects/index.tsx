import { Container, Title } from '@mantine/core';
import { GetStaticProps } from 'next';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { ProjectList } from '../../components/Projects/ProjectList';
import { Layout } from '../../components/Layout/Layout';
import { getAllProjects } from '../../lib/projects';
import { Project } from '../../types';

type ProjectsPageProps = {
  projects: Project[];
};

export default function ProjectsPage({ projects }: ProjectsPageProps) {
  const { t } = useTranslation();

  return (
    <Layout title={t('projects.pageTitle')}>
      <Container size="md" py="xl">
        <Title order={1} mb="xl">
          {t('projects.heading')}
        </Title>
        <ProjectList projects={projects} />
      </Container>
    </Layout>
  );
}

export const getStaticProps: GetStaticProps<ProjectsPageProps> = () => {
  const projects = getAllProjects();
  return { props: { projects } };
};
