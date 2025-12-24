// src/components/Layout.tsx
import React from 'react';
import { AppShell, Group, Title, ActionIcon, useMantineColorScheme } from '@mantine/core';
import {
  IconSun,
  IconMoonStars,
} from '@tabler/icons-react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <AppShell
      header={{ height: 70 }}
      navbar={{
        width: 300,
        breakpoint: 'sm',
      }}
      footer={{ height: 60 }}
      padding="md"
    >
      {/* Header */}
      <AppShell.Header p="md">
        <Group justify="space-between" h="100%" align="center">
          <Title order={3} fw={700}>
            S3 Document Viewer
          </Title>

          <ActionIcon
            variant="default"
            size="lg"
            onClick={() => toggleColorScheme()}
            aria-label="Toggle light/dark mode"
          >
            {isDark ? <IconSun size={20} stroke={1.5} /> : <IconMoonStars size={20} stroke={1.5} />}
          </ActionIcon>
        </Group>
      </AppShell.Header>

      {/* Navbar */}
      <AppShell.Navbar p="md">
        <Navbar />
      </AppShell.Navbar>

      {/* Main Content */}
      <AppShell.Main>
        {children}
      </AppShell.Main>

      {/* Footer */}
      <AppShell.Footer p="md">
        <Footer />
      </AppShell.Footer>
    </AppShell>
  );
}