import { Group, Text, ActionIcon } from '@mantine/core';
import {
  IconBrandGithub,
  IconBrandMantine,
  IconBrandPython,
  IconBrandAws
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
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="none">
                <circle cx="128" cy="128" r="30" fill="#61DAFB"/>
                <g stroke="#61DAFB" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round">
                    <ellipse rx="96" ry="36" transform="matrix(.866 -.5 .5 .866 128 128)"/>
                    <ellipse rx="96" ry="36" transform="matrix(.866 .5 -.5 .866 128 128)"/>
                    <ellipse rx="96" ry="36" transform="matrix(0 -1 1 0 128 128)"/>
                </g>
            </svg>
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