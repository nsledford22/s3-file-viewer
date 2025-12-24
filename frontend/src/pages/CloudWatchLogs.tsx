// src/pages/CloudWatchLogs.tsx
import { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Text,
  Select,
  Group,
  Button,
  Loader,
  ScrollArea,
  Code,
  Switch,
  Badge,
  Paper,
  Alert,
  TextInput,
  Center,
  Stack,
} from '@mantine/core';
import { IconRefresh, IconTerminal, IconDownload, IconSearch } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

const API_BASE_URL = import.meta.env.VITE_API_URL;

interface LogEvent {
  timestamp: string;
  message: string;
}

export function CloudWatchLogs() {
  const [logGroups, setLogGroups] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [logStreams, setLogStreams] = useState<string[]>([]);
  const [selectedStream, setSelectedStream] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEvent[]>([]);
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Load log groups
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/cloudwatch/log_groups`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setLogGroups(data.log_groups || []);
      } catch {
        notifications.show({ title: 'Error', message: 'Failed to load log groups', color: 'red' });
      }
    };
    fetchGroups();
  }, []);

  // Load streams when group changes
  useEffect(() => {
    if (!selectedGroup) {
      setLogStreams([]);
      setSelectedStream(null);
      setLogs([]);
      setFilteredLogs([]);
      return;
    }

    const fetchStreams = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/cloudwatch/log_streams?log_group=${encodeURIComponent(selectedGroup)}`
        );
        if (!res.ok) throw new Error();
        const data = await res.json();
        setLogStreams(data.log_streams || []);
      } catch {
        notifications.show({ title: 'Error', message: 'Failed to load streams', color: 'red' });
      }
    };
    fetchStreams();
  }, [selectedGroup]);

  // Fetch logs
  const fetchLogs = async () => {
    if (!selectedGroup || !selectedStream) return;

    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/cloudwatch/logs?` +
        new URLSearchParams({
          log_group: selectedGroup,
          log_stream: selectedStream,
        })
      );

      if (!res.ok) throw new Error('Failed to fetch logs');
      const data = await res.json();
      const events = data.events || [];
      setLogs(events);
      setFilteredLogs(events);
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to load logs', color: 'red' });
      setLogs([]);
      setFilteredLogs([]);
    } finally {
      setLoading(false);
    }
  };

  // Auto-load when stream selected
  useEffect(() => {
    if (selectedGroup && selectedStream) {
      fetchLogs();
    }
  }, [selectedGroup, selectedStream]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !selectedStream) return;
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, selectedStream, selectedGroup]);

  // Search within logs (client-side filtering)
  useEffect(() => {
    if (!logSearchQuery.trim()) {
      setFilteredLogs(logs);
      return;
    }

    const query = logSearchQuery.toLowerCase();
    const matches = logs.filter(log =>
      log.message.toLowerCase().includes(query) ||
      log.timestamp.includes(query)
    );
    setFilteredLogs(matches);
  }, [logSearchQuery, logs]);

  // Download logs
  const downloadLogs = () => {
    if (filteredLogs.length === 0) {
      notifications.show({ title: 'No logs', message: 'Nothing to download', color: 'orange' });
      return;
    }

    const content = filteredLogs
      .map(log => `[${log.timestamp}] ${log.message}`)
      .join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${(selectedGroup || 'logs').replace(/\//g, '_')}_${selectedStream || 'stream'}.txt`;
    a.click();

    URL.revokeObjectURL(url);

    notifications.show({
      title: 'Download started',
      message: `${filteredLogs.length} log lines saved`,
      color: 'green',
    });
  };

  return (
    <Container size="xl" py="xl">
      {/* Header: Title + Auto-refresh on same line */}
      <Group justify="space-between" align="center" mb="xl">
        <Title order={1}>
          <Group gap="md">
            <IconTerminal size={32} />
            Browse CloudWatch Logs
          </Group>
        </Title>

        <Switch
          label="Auto-refresh (5s)"
          checked={autoRefresh}
          onChange={(e) => setAutoRefresh(e.currentTarget.checked)}
        />
      </Group>

      {/* Log Group & Stream Selectors */}
      <Group mb="md" grow>
        <Select
          placeholder="Search and select a log group..."
          data={logGroups}
          value={selectedGroup}
          onChange={setSelectedGroup}
          searchable
          clearable
          nothingFoundMessage="No log groups found"
          leftSection={<IconSearch size={16} />}
        />

        <Select
          placeholder="Select log stream"
          data={logStreams}
          value={selectedStream}
          onChange={setSelectedStream}
          disabled={!selectedGroup}
          searchable
          clearable
          nothingFoundMessage="No streams found"
        />
      </Group>

      {/* Action Bar: Refresh + Download + Search (all inline) */}
      <Group mb="xl" align="center" grow>
        <Group gap="xs">
          <Button
            onClick={fetchLogs}
            disabled={!selectedStream || loading}
            leftSection={loading ? <Loader size={16} /> : <IconRefresh size={16} />}
            variant="default"
          >
            {loading ? 'Refreshing...' : 'Refresh Logs'}
          </Button>

          <Button
            onClick={downloadLogs}
            disabled={filteredLogs.length === 0}
            leftSection={<IconDownload size={16} />}
            color="green"
          >
            Download Logs ({filteredLogs.length})
          </Button>
        </Group>

        {/* Search within logs */}
        <TextInput
          placeholder="Search within these logs..."
          value={logSearchQuery}
          onChange={(e) => setLogSearchQuery(e.currentTarget.value)}
          leftSection={<IconSearch size={16} />}
          w={400}
        />
      </Group>

      {/* Content Area with Guided Skeleton/Empty States */}
      {!selectedGroup ? (
        <Center h={475} style={{ border: '2px dashed var(--mantine-color-gray-4)', borderRadius: 'var(--mantine-radius-md)' }}>
          <Stack align="center" gap="md">
            <IconTerminal size={64} color="var(--mantine-color-gray-5)" stroke={1.5} />
            <Text size="xl" c="dimmed" fw={500}>
              Select a Log Group to get started
            </Text>
            <Text size="sm" c="dimmed" ta="center" maw={400}>
              Choose a log group from the dropdown above to view available streams and logs.
            </Text>
          </Stack>
        </Center>
      ) : !selectedStream ? (
        <Center h={475} style={{ border: '2px dashed var(--mantine-color-gray-4)', borderRadius: 'var(--mantine-radius-md)' }}>
          <Stack align="center" gap="md">
            <IconSearch size={64} color="var(--mantine-color-gray-5)" stroke={1.5} />
            <Text size="xl" c="dimmed" fw={500}>
              Select a Log Stream
            </Text>
            <Text size="sm" c="dimmed" ta="center" maw={400}>
              Pick a stream from the dropdown to load its log events.
            </Text>
          </Stack>
        </Center>
      ) : loading && logs.length === 0 ? (
        <Center my="xl">
          <Loader size="lg" />
        </Center>
      ) : filteredLogs.length === 0 ? (
        <Alert title="No matching logs">
          {logSearchQuery
            ? `No logs contain "${logSearchQuery}"`
            : 'This stream is currently empty or has no events in the current view.'}
        </Alert>
      ) : (
        <Paper withBorder p="sm" radius="md">
          <ScrollArea h={450} type="hover">
            {filteredLogs.map((log, i) => (
              <Group key={i} gap="md" align="flex-start" wrap="nowrap" mb="xs">
                <Badge variant="light" color="gray" size="sm">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </Badge>
                <Code block style={{ whiteSpace: 'pre-wrap', flex: 1 }}>
                  {log.message}
                </Code>
              </Group>
            ))}
          </ScrollArea>
        </Paper>
      )}
    </Container>
  );
}