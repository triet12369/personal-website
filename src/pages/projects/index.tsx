import { Group } from '@mantine/core';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { Layout } from '../../components/Layout/Layout';

export default function IndexPage() {
  const { t } = useTranslation();

  return (
    <Layout title={t('projects.pageTitle')}>
      <Group mt={50} justify="center">
        {t('projects.placeholder')}
      </Group>
    </Layout>
  );
}
