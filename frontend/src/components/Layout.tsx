// src/components/Layout.tsx
import React from 'react';
import { AppShell, Group, Title, ActionIcon, Text, useMantineColorScheme } from '@mantine/core';
import {
  IconSun,
  IconMoonStars,
  IconBrandGithub,
  IconBrandMantine,
  IconBrandPython,
  IconBrandAws
} from '@tabler/icons-react';
import { Navbar } from './Navbar';

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
        <Group justify="space-between" align="center" h="100%">
          <Text size="sm" c="dimmed">
            © 2025 S3 Document Viewer
          </Text>

          <Group gap="xs">
            <Text size="sm" c="dimmed">
              Source:
            </Text>
            <ActionIcon
              component="a"
              href="https://github.com/nsledford22"
              target="_blank"
              rel="noopener noreferrer"
              variant="subtle"
              title="View source on GitHub"
            >
              <IconBrandGithub size={20} stroke={1.5} />
            </ActionIcon>

            <Text size="sm" c="dimmed">
              Built with:
            </Text>

            <ActionIcon 
              component='a' 
              href='https://mantine.dev/' 
              target='_blank' 
              rel='noopener noreferrer'
              variant="subtle" 
              title="Mantine"
            >
              <IconBrandMantine size={20} color="#61DAFB" stroke={1.5} />
            </ActionIcon>

            <ActionIcon
              component='a'
              href='https://fastapi.tiangolo.com/'
              target='_blank'
              rel='noopener noreferrer'
              variant="subtle"
              title="FastAPI / Python"
            >
              <IconBrandPython size={20} color="#3776AB" stroke={1.5} />
            </ActionIcon>
            <ActionIcon
              component='a'
              href='https://aws.amazon.com/'
              target='_blank'
              rel='noopener noreferrer'
              variant="subtle"
              title="AWS"
            >
              <IconBrandAws size={20} color="#FF9900" stroke={1.5} />
            </ActionIcon>
          </Group>
        </Group>
      </AppShell.Footer>
    </AppShell>
  );
}