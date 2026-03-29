import { Button, Center, Stack, Text, Title } from '@mantine/core';
import Link from 'next/link';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useT } from '../hooks/useT';
import { Layout } from '../components/Layout/Layout';

export default function NotFoundPage() {
  const { t: tStr } = useTranslation();
  const t = useT();

  return (
    <Layout title={tStr('notFound.pageTitle')}>
      <Center style={{ minHeight: '70vh' }}>
        <Stack align="center" gap="lg">
          <Title order={1} style={{ fontSize: '6rem', lineHeight: 1 }}>
            {t('notFound.heading')}
          </Title>
          <Title order={2}>{t('notFound.subheading')}</Title>
          <Text c="dimmed" size="lg" ta="center" maw={400}>
            {t('notFound.description')}
          </Text>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <Button size="md" mt="sm" variant="outline">
              {t('notFound.backHome')}
            </Button>
          </Link>
        </Stack>
      </Center>
    </Layout>
  );
}
