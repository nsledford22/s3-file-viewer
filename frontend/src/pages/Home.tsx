// src/pages/Home.tsx
import { Container, Title, Text, Card, SimpleGrid, Button, Group } from '@mantine/core';
import { IconFileSearch, IconUpload } from '@tabler/icons-react';

export function Home() {
  return (
    <Container fluid py="xl" px={{ base: 'md', lg: 'xl' }}>
      {/* Title with explicit centering and extra spacing */}
      <Title order={1} ta="center" fw={900} mb="xl">
        Welcome to Document Viewer
      </Title>

      <Text c="dimmed" size="lg" ta="center" mb="xl">
        Securely view and manage your documents stored in S3.
      </Text>

      {/* Feature Cards – 2 columns on sm+ screens */}
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group justify="center" mb="md">
            <IconFileSearch size={48} stroke={1.5} color="var(--mantine-color-grape-6)" />
          </Group>
          <Title order={3} ta="center" mb="xs">
            Browse Documents
          </Title>
          <Text ta="center" c="dimmed" size="sm" mb="md">
            View your files in a clean card or table layout.
          </Text>
          <Button 
            fullWidth 
            variant="light" 
            component="a"
            href="/browse"
          >
            Start Browsing
          </Button>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group justify="center" mb="md">
            <IconUpload size={48} stroke={1.5} color="var(--mantine-color-green-6)" />
          </Group>
          <Title order={3} ta="center" mb="xs">
            Upload New Files
          </Title>
          <Text ta="center" c="dimmed" size="sm" mb="md">
            Securely add documents to your S3 bucket.
          </Text>
          <Button 
            fullWidth 
            variant="light" 
            color="green"
            component="a"
            href="/upload"
          >
            Upload Now
          </Button>
        </Card>
      </SimpleGrid>
    </Container>
  );
}