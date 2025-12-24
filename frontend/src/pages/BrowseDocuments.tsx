// src/pages/BrowseDocuments.tsx
import { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Text,
  Card,
  SimpleGrid,
  Table,
  Switch,
  Group,
  Badge,
  Button,
  TextInput,
  Pagination,
  Loader,
  Center,
  Drawer,
  Stack,
  ScrollArea,
  Breadcrumbs,
  Anchor,
  Slider
} from '@mantine/core';
import {
  IconLayoutGrid,
  IconTable,
  IconSearch,
  IconDownload,
  IconFolder,
  IconFile,
  IconChevronRight,
} from '@tabler/icons-react';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';

const ITEMS_PER_PAGE = 12;
const BUCKET_NAME = 's3-file-viewer-files';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

interface S3File {
  key: string;
  name: string;
  size: number;
  last_modified: string;
}

interface S3Folder {
  key: string; // ends with '/'
  name: string;
}

const getFileType = (filename: string): 'pdf' | 'docx' | 'doc' | 'excel' | 'csv' | 'other' => {
  const ext = filename.toLowerCase().split('.').pop() || '';
  if (ext === 'pdf') return 'pdf';
  if (ext === 'docx') return 'docx';
  if (ext === 'doc') return 'doc';
  if (['xlsx', 'xls'].includes(ext)) return 'excel';
  if (ext === 'csv') return 'csv';
  return 'other';
};

export function BrowseDocuments() {
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [files, setFiles] = useState<S3File[]>([]);
  const [folders, setFolders] = useState<S3Folder[]>([]);
  const [currentPrefix, setCurrentPrefix] = useState('files/');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<S3File | null>(null);
  const [previewContent, setPreviewContent] = useState<'loading' | 'iframe' | 'word' | 'spreadsheet' | 'error'>('loading');
  const [wordHtml, setWordHtml] = useState<string>('');
  const [sheetData, setSheetData] = useState<any[][]>([]);
  const [density, setDensity] = useState(4);

  // Build proper breadcrumbs from currentPrefix
  const breadcrumbItems = currentPrefix
    .split('/')
    .filter(Boolean)
    .reduce((acc: { title: string; prefix: string }[], part, index, arr) => {
      const prefix = arr.slice(0, index + 1).join('/') + '/';
      acc.push({ title: part, prefix });
      return acc;
    }, []);

  const navigateToPrefix = (prefix: string) => {
    setCurrentPrefix(prefix);
    setCurrentPage(1);
    setSearchQuery('');
  };

  // Reset preview
  useEffect(() => {
    if (selectedFile) {
      setPreviewContent('loading');
      setWordHtml('');
      setSheetData([]);
    }
  }, [selectedFile]);

  // Fetch files and folders
  useEffect(() => {
    const fetchContents = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(
          `${API_BASE_URL}/list_files?bucket_name=${BUCKET_NAME}&prefix=${encodeURIComponent(currentPrefix)}`
        );
        if (!response.ok) throw new Error('Failed to fetch contents');
        const data = await response.json();

        setFiles(data.files || []);
        setFolders(data.folders || []); // Backend must return folders array
      } catch (err: any) {
        setError(err.message || 'Unable to load folder contents');
      } finally {
        setLoading(false);
      }
    };

    fetchContents();
  }, [currentPrefix]);

  // Combine files and folders for display and search
  const allItems = [
    ...folders.map(f => ({ ...f, type: 'folder' as const })),
    ...files.map(f => ({ ...f, type: 'file' as const })),
  ];

  const filteredItems = allItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ('key' in item && item.key.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalItems = filteredItems.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '—';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const loadFilePreview = async (file: S3File) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/view_file/${encodeURIComponent(file.key)}?bucket_name=${BUCKET_NAME}`
      );
      if (!response.ok) throw new Error('Failed to load file');

      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();

      const type = getFileType(file.name);

      if (type === 'docx') {
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setWordHtml(result.value);
        setPreviewContent('word');
      } else if (type === 'doc') {
        setPreviewContent('word');
      } else if (type === 'excel' || type === 'csv') {
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        setSheetData(json as any[][]);
        setPreviewContent('spreadsheet');
      } else {
        setPreviewContent('iframe');
      }
    } catch (err) {
      console.error('Preview error:', err);
      setPreviewContent('error');
    }
  };

  useEffect(() => {
    if (selectedFile) loadFilePreview(selectedFile);
  }, [selectedFile]);

  if (loading) {
    return (
      <Container fluid py="xl" px={{ base: 'md', lg: 'xl' }}>
        <Center h="60vh">
          <Loader size="lg" />
        </Center>
      </Container>
    );
  }

  if (error) {
    return (
      <Container fluid py="xl" px={{ base: 'md', lg: 'xl' }}>
        <Center h="60vh">
          <Text c="red" size="lg">{error}</Text>
        </Center>
      </Container>
    );
  }

  return (
    <Container fluid py="xl" px={{ base: 'md', lg: 'xl' }}>
      {/* Breadcrumbs + View Switch (inline) */}
      <Group justify="space-between" align="center" mb="lg" wrap="nowrap">
        <Breadcrumbs separator={<IconChevronRight size={16} />}>
          <Anchor onClick={() => navigateToPrefix('files/')} style={{ cursor: 'pointer' }}>
            Home
          </Anchor>
          {breadcrumbItems.map((item) => (
            <Anchor
              key={item.prefix}
              onClick={() => navigateToPrefix(item.prefix)}
              style={{ cursor: 'pointer' }}
            >
              {item.title}
            </Anchor>
          ))}
        </Breadcrumbs>

        <Group gap="xs" align="center">
          <Text size="sm" fw={500}>View:</Text>
          <Switch
            checked={viewMode === 'table'}
            onChange={(e) => setViewMode(e.currentTarget.checked ? 'table' : 'cards')}
            thumbIcon={viewMode === 'table' ? <IconTable size={16} /> : <IconLayoutGrid size={16} />}
          />
        </Group>
      </Group>

      {/* Header */}
      <Group justify="space-between" align="center" mb="xl" wrap="wrap">
        <Title order={1}>Browse Documents</Title>

        <Group gap="md">
          <TextInput
            placeholder="Search files or folders..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.currentTarget.value)}
            leftSection={<IconSearch size={16} />}
            w={350}
          />

          {/* Card Size Slider */}
          <Group gap="xs" align="center">
            <Text size="sm" fw={500}>Card size:</Text>
            <Slider
              min={3}
              max={6}
              step={1}
              value={density}
              onChange={setDensity}
              marks={[
                { value: 3, label: 'Spacious' },
                { value: 4, label: 'Normal' },
                { value: 5, label: 'Compact' },
                { value: 6, label: 'Dense' },
              ]}
              w={220}
            />
          </Group>
        </Group>
      </Group>

      {/* Current location & Pagination */}
      <Group justify="space-between" align="center" mb="xl" wrap="nowrap">
        <Text size="sm" c="dimmed">
          Location: <strong>{currentPrefix === 'files/' ? '/' : currentPrefix}</strong>
        </Text>

        {totalPages > 1 && (
          <Pagination
            total={totalPages}
            value={currentPage}
            onChange={setCurrentPage}
            withEdges
          />
        )}
      </Group>

      {/* Content Grid */}
      {totalItems === 0 ? (
        <Text ta="center" c="dimmed" size="lg" py="xl">
          This folder is empty.
        </Text>
      ) : (
        <>
          {viewMode === 'cards' ? (
            <SimpleGrid
              cols={{ base: density, sm: density, md: density, lg: density }}
              spacing={density <= 4 ? 'lg' : density === 5 ? 'md' : 'sm'}
            >
              {paginatedItems.map((item) => {
                if (item.type === 'folder') {
                  return (
                    <Card
                      key={item.key}
                      withBorder
                      shadow="sm"
                      padding="lg"
                      radius="md"
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigateToPrefix(item.key)}
                    >
                      <Group align="center" gap="md">
                        <IconFolder size={40} color='#cc5de8	
' />
                        <Text fw={600} size="lg">
                          {item.name}
                        </Text>
                      </Group>
                      <Text size="sm" c="dimmed" mt="xs">
                        Folder
                      </Text>
                    </Card>
                  );
                }

                return (
                  <Card
                    padding={density <= 3 ? 'xl' : density === 4 ? 'lg' : density === 5 ? 'md' : 'sm'}
                    radius="md"
                    withBorder
                    shadow="sm"
                  >
                    <Group align="center" gap="xs" mb="xs">
                      <IconFile size={20} color="gray" />
                      <Text fw={500} truncate="end" maw={260}>
                        {item.name}
                      </Text>
                    </Group>
                    <Text size="xs" c="dimmed" truncate>
                      {item.key}
                    </Text>
                    <Group gap="xs" mb="md" mt="sm">
                      <Badge variant="light" color="yellow">{formatSize(item.size)}</Badge>
                      <Badge variant="light" color="gray">{formatDate(item.last_modified)}</Badge>
                    </Group>
                    <Button fullWidth variant="light" onClick={() => setSelectedFile(item)}>
                      View / Download
                    </Button>
                  </Card>
                );
              })}
            </SimpleGrid>
          ) : (
            <Table
              highlightOnHover
              verticalSpacing={density <= 3 ? 'xl' : density === 4 ? 'lg' : density === 5 ? 'md' : 'sm'}
              horizontalSpacing={density >= 6 ? 'xs' : 'md'}
            >
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Full Path</Table.Th>
                  <Table.Th>Size</Table.Th>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {paginatedItems.map((item) => (
                  <Table.Tr
                    key={item.key}
                    style={item.type === 'folder' ? { cursor: 'pointer' } : {}}
                    onClick={() => item.type === 'folder' && navigateToPrefix(item.key)}
                  >
                    <Table.Td>
                      {item.type === 'folder' ? <IconFolder size={18} /> : <IconFile size={18} />}
                    </Table.Td>
                    <Table.Td>
                      <Text fw={item.type === 'folder' ? 600 : 500}>{item.name}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed" truncate="end" maw={400}>
                        {item.key}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      {item.type === 'folder' ? (
                        <Badge variant="light" color="gray">
                          —
                        </Badge>
                      ) : (
                        <Badge variant="light" color="yellow">
                          {formatSize(item.size)}
                        </Badge>
                      )}
                    </Table.Td>
                    <Table.Td>
                      {item.type === 'folder' ? (
                        <Badge variant="light" color="gray">
                          —
                        </Badge>
                      ) : (
                        <Badge variant="light" color="gray">
                          {formatDate(item.last_modified)}
                        </Badge>
                      )}
                    </Table.Td>
                    <Table.Td>
                      {item.type === 'file' && (
                        <Button
                          size="xs"
                          variant="light"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent folder click
                            setSelectedFile(item);
                          }}
                        >
                          View / Download
                        </Button>
                      )}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </>
      )}

      {/* File Preview Drawer */}
      <Drawer
        opened={!!selectedFile}
        onClose={() => setSelectedFile(null)}
        position="bottom"
        size="85%"
        title={`Viewing: ${selectedFile?.name || 'File'}`}
        overlayProps={{ opacity: 0.5, blur: 4 }}
        padding="md"
      >
        <Stack h="100%" gap="md">
          <Group justify="space-between" align="center">
            <Text fw={600} size="lg">File Preview</Text>
            <Button
              leftSection={<IconDownload size={18} />}
              onClick={() => {
                if (!selectedFile) return;
                const url = `${API_BASE_URL}/view_file/${encodeURIComponent(selectedFile.key)}?bucket_name=${BUCKET_NAME}`;
                const a = document.createElement('a');
                a.href = url;
                a.download = selectedFile.name;
                a.click();
              }}
            >
              Download
            </Button>
          </Group>

          <Stack flex={1} pos="relative" style={{ minHeight: 0 }}>
            <Center
              pos="absolute"
              inset={0}
              bg="rgba(255, 255, 255, 0.8)"
              style={{
                zIndex: 10,
                display: previewContent === 'loading' ? 'flex' : 'none',
                borderRadius: 'var(--mantine-radius-md)',
              }}
            >
              <Loader size="xl" variant="dots" />
            </Center>

            {(() => {
              if (!selectedFile) return null;

              const type = getFileType(selectedFile.name);

              if (previewContent === 'iframe' || type === 'pdf' || type === 'other') {
                return (
                  <iframe
                    src={`${API_BASE_URL}/view_file/${encodeURIComponent(selectedFile.key)}?bucket_name=${BUCKET_NAME}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      border: 'none',
                      borderRadius: 'var(--mantine-radius-md)',
                    }}
                    title="File preview"
                  />
                );
              }

              if (type === 'docx') {
                if (previewContent === 'word' && wordHtml) {
                  return (
                    <ScrollArea h="100%">
                      <div
                        dangerouslySetInnerHTML={{ __html: wordHtml }}
                        style={{
                          padding: '2rem',
                          background: 'var(--mantine-color-body)', 
                          color: 'var(--mantine-color-text)',      
                          borderRadius: 'var(--mantine-radius-md)',
                          minHeight: '100%',
                        }}
                      />
                    </ScrollArea>
                  );
                }
                return (
                  <Center h="100%">
                    <Text c="red">Failed to load Word document</Text>
                  </Center>
                );
              }

              if (type === 'doc') {
                return (
                  <Center h="100%">
                    <Stack align="center" gap="md">
                      <Text c="dimmed" size="lg">
                        Legacy Word (.doc) files are not supported for preview.
                      </Text>
                      <Text c="dimmed" size="sm">
                        Please download to view.
                      </Text>
                    </Stack>
                  </Center>
                );
              }

              if ((type === 'excel' || type === 'csv') && previewContent === 'spreadsheet' && sheetData.length > 0) {
                const headerCount = sheetData[0]?.length || 0;
                const normalizedData = sheetData.map(row => {
                  const padded = [...row];
                  while (padded.length < headerCount) padded.push('');
                  return padded.slice(0, headerCount);
                });

                return (
                  <ScrollArea h="100%">
                    <Table striped highlightOnHover withTableBorder withColumnBorders>
                      <Table.Thead>
                        <Table.Tr>
                          {normalizedData[0].map((header: any, i: number) => (
                            <Table.Th key={i}>{header || `Column ${i + 1}`}</Table.Th>
                          ))}
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {normalizedData.slice(1).map((row: any[], rowIndex: number) => (
                          <Table.Tr key={rowIndex}>
                            {row.map((cell: any, cellIndex: number) => (
                              <Table.Td key={cellIndex}>{cell ?? ''}</Table.Td>
                            ))}
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </ScrollArea>
                );
              }

              return (
                <Center h="100%">
                  <Text c="dimmed">Loading preview...</Text>
                </Center>
              );
            })()}
          </Stack>
        </Stack>
      </Drawer>
    </Container>
  );
}