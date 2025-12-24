// src/pages/NotFound.tsx
import { Button, Container, Group, Text, Title, Box } from '@mantine/core';
import { Illustration } from './Illustration';

export function NotFound() {
  return (
    <Container
      size="md"
      py="xl"
      style={{
        position: 'relative',
        minHeight: '60vh', // Ensures content doesn't collapse too small
      }}
    >
      <Box
        style={{
          position: 'relative',
          paddingTop: '80px',
          paddingBottom: '80px',
          textAlign: 'center',
        }}
      >
        {/* Illustration as background or centered */}
        <Illustration
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.05,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
        />

        {/* Main content */}
        <Box
          style={{
            position: 'relative',
            zIndex: 1,
            paddingTop: '220px',
            maxWidth: '540px',
            margin: '0 auto',
          }}
        >
          <Title
            order={1}
            fw={900}
            ta="center"
            mb="xl"
          >
            Nothing to see here
          </Title>

          <Text
            c="dimmed"
            size="lg"
            ta="center"
            mb="xl"
          >
            Page you are trying to open does not exist. You may have mistyped the address, or the
            page has been moved to another URL. If you think this is an error contact support.
          </Text>

          <Group justify="center">
            <Button
              size="md"
              color="violet"
              component="a"
              href="/"
            >
              Take me back to home page
            </Button>
          </Group>
        </Box>
      </Box>
    </Container>
  );
}