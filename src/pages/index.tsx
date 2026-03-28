import { Button, Group } from '@mantine/core';

import { Layout } from '../components/Layout/Layout';

export default function IndexPage() {
  return (
    <Layout title="Home">
      <Group mt={50} justify="center">
        <Button size="xl">Hello World</Button>
      </Group>
    </Layout>
  );
}
