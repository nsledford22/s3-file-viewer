// src/components/Layout.tsx
import React from 'react';
import { AppShell, Group, Title, useMantineColorScheme, Switch, Text } from '@mantine/core';
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
            Document Viewer
          </Title>
          <Group>
            <Text
              size="sm" 
              c="dimmed"
            >
              {isDark ? 'Dark Mode' : 'Light Mode'}
            </Text>
            <Switch
              checked={isDark}
              onChange={() => toggleColorScheme()}
              size="lg"
              thumbIcon={
                isDark ? <IconMoonStars size={16} stroke={3} color="var(--mantine-color-grape-text)" /> : <IconSun size={16} stroke={3} color="orange" />
              }
              color='var(--mantine-color-dimmed)'
            />
          </Group>
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