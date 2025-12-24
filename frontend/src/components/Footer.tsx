import { Group, Text, ActionIcon } from '@mantine/core';
import {
  IconBrandGithub,
  IconBrandMantine,
  IconBrandPython,
  IconBrandAws,
  IconBrandReact
} from '@tabler/icons-react';

export function Footer() {
  return (
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
            href='https://react.dev/' 
            target='_blank' 
            rel='noopener noreferrer'
            variant="subtle" 
            title="React"
        >
            <IconBrandReact size={20} color="#61DAFB" stroke={1.5} />
        </ActionIcon>

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
  );
}