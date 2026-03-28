import { Anchor, Code, Text, Title } from '@mantine/core';
import type { MDXRemoteProps } from 'next-mdx-remote';
import React, { ComponentPropsWithoutRef } from 'react';

type MDXComponents = MDXRemoteProps['components'];

export const MDXComponents: MDXComponents = {
  h1: (props: ComponentPropsWithoutRef<'h1'>) => (
    <Title order={1} mt="xl" mb="md" {...props} />
  ),
  h2: (props: ComponentPropsWithoutRef<'h2'>) => (
    <Title order={2} mt="xl" mb="sm" {...props} />
  ),
  h3: (props: ComponentPropsWithoutRef<'h3'>) => (
    <Title order={3} mt="lg" mb="sm" {...props} />
  ),
  p: (props: ComponentPropsWithoutRef<'p'>) => (
    <Text component="p" mb="sm" style={{ lineHeight: 1.75, fontWeight: 400 }} {...props} />
  ),
  a: ({ href, ...props }: ComponentPropsWithoutRef<'a'>) => (
    <Anchor
      href={href}
      target={href?.startsWith('http') ? '_blank' : undefined}
      rel="noopener noreferrer"
      {...props}
    />
  ),
  code: (props: ComponentPropsWithoutRef<'code'>) => <Code {...props} />,
  pre: (props: ComponentPropsWithoutRef<'pre'>) => (
    <pre
      style={{
        background: 'var(--mantine-color-default)',
        border: '1px solid var(--mantine-color-default-border)',
        borderRadius: '0.375rem',
        padding: '1rem',
        overflowX: 'auto',
        marginBottom: '1rem',
      }}
      {...props}
    />
  ),
  ul: (props: ComponentPropsWithoutRef<'ul'>) => (
    <ul
      style={{ paddingLeft: '1.5rem', marginBottom: '1rem', lineHeight: 1.75 }}
      {...props}
    />
  ),
  ol: (props: ComponentPropsWithoutRef<'ol'>) => (
    <ol
      style={{ paddingLeft: '1.5rem', marginBottom: '1rem', lineHeight: 1.75 }}
      {...props}
    />
  ),
  li: (props: ComponentPropsWithoutRef<'li'>) => (
    <li style={{ marginBottom: '0.25rem' }} {...props} />
  ),
  hr: () => <hr style={{ margin: '2rem 0', opacity: 0.2 }} />,
};
