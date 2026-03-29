import { Button, Container, Stack, Text, Title } from '@mantine/core';
import type { NextPage } from 'next';

import { Layout } from '../components/Layout/Layout';
import { useAdminAuth } from '../hooks/useAdminAuth';

const AdminPage: NextPage = () => {
  const { isAdmin, loading, logout } = useAdminAuth();

  return (
    <Layout title="Admin">
      <Container size="sm" pt="xl">
        <Stack gap="md">
          <Title order={3}>Admin</Title>
          {loading ? (
            <Text c="dimmed">Checking authentication…</Text>
          ) : isAdmin ? (
            <>
              <Text>Authenticated via Cloudflare Access.</Text>
              <Button variant="default" onClick={logout} w="fit-content">
                Log out
              </Button>
            </>
          ) : (
            <Text c="dimmed">
              Not authenticated.{' '}
              <a href="/" style={{ textDecoration: 'underline' }}>
                Return home
              </a>
            </Text>
          )}
        </Stack>
      </Container>
    </Layout>
  );
};

export default AdminPage;
