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
} from '@mantine/core';
import { IconLayoutGrid, IconTable, IconSearch, IconDownload } from '@tabler/icons-react';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import modules from './BrowseDocuments.module.css';

const ITEMS_PER_PAGE = 9;
const BUCKET_NAME = 's3-file-viewer-files';
const PREFIX = 'files/';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

interface S3File {
  key: string;
  name: string;
  size: number;
  last_modified: string;
}

// File type detection
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
  const [documents, setDocuments] = useState<S3File[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<S3File | null>(null);
  const [previewContent, setPreviewContent] = useState<'loading' | 'iframe' | 'word' | 'spreadsheet' | 'error'>('loading');
  const [wordHtml, setWordHtml] = useState<string>('');
  const [sheetData, setSheetData] = useState<any[][]>([]);

  // Reset preview when file changes
  useEffect(() => {
    if (selectedFile) {
      setPreviewContent('loading');
      setWordHtml('');
      setSheetData([]);
    }
  }, [selectedFile]);

  // Fetch file list
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(
          `${API_BASE_URL}/list_files?bucket_name=${BUCKET_NAME}&prefix=${PREFIX}`
        );
        if (!response.ok) throw new Error('Failed to fetch files');
        const data = await response.json();
        setDocuments(data.files || []);
      } catch (err: any) {
        setError(err.message || 'Unable to load documents');
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, []);

  // Filtering & pagination
  const filteredDocuments = documents.filter((doc) =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalItems = filteredDocuments.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedDocuments = filteredDocuments.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
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

  // Load and render file content
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

  // Trigger preview load when file selected
  useEffect(() => {
    if (selectedFile) {
      loadFilePreview(selectedFile);
    }
  }, [selectedFile]);

  if (loading) {
    return (
      <Container fluid py="xl" px={{ base: 'md', lg: 'xl' }}>
        <Center h="60vh">
          <Loader size="lg" color="violet" />
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
      {/* Header */}
      <Group justify="space-between" align="center" mb="xl" wrap="wrap">
        <Title order={1}>Browse Documents</Title>

        <Group gap="md">
          <TextInput
            placeholder="Search by file name..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.currentTarget.value)}
            leftSection={<IconSearch size={16} />}
            w={300}
            classNames={{ input: modules.inputField }}
          />

          <Group gap="xs">
            <Text fw={500}>View as:</Text>
            <Switch
              size="md"
              color="violet"
              checked={viewMode === 'table'}
              onChange={(e) => setViewMode(e.currentTarget.checked ? 'table' : 'cards')}
              thumbIcon={
                viewMode === 'table' ? <IconTable size={16} /> : <IconLayoutGrid size={16} />
              }
            />
          </Group>
        </Group>
      </Group>

      {/* List / Grid */}
      {totalItems === 0 ? (
        <Text ta="center" c="dimmed" size="lg" py="xl">
          No documents found.
        </Text>
      ) : (
        <>
          {viewMode === 'cards' ? (
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
              {paginatedDocuments.map((doc) => (
                <Card key={doc.key} withBorder shadow="sm" padding="lg" radius="md">
                  <Text fw={500} mb="xs" truncate="end" maw={300}>
                    {doc.name}
                  </Text>
                  <Group gap="xs" mb="md">
                    <Badge variant="light" color="violet">{formatSize(doc.size)}</Badge>
                    <Badge variant="light" color="gray">{formatDate(doc.last_modified)}</Badge>
                  </Group>
                  <Button fullWidth variant="light" color="violet" onClick={() => setSelectedFile(doc)}>
                    View / Download
                  </Button>
                </Card>
              ))}
            </SimpleGrid>
          ) : (
            <Table highlightOnHover verticalSpacing="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Size</Table.Th>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {paginatedDocuments.map((doc) => (
                  <Table.Tr key={doc.key}>
                    <Table.Td>
                      <Text truncate="end" maw={400}>{doc.name}</Text>
                    </Table.Td>
                    <Table.Td>{formatSize(doc.size)}</Table.Td>
                    <Table.Td>{formatDate(doc.last_modified)}</Table.Td>
                    <Table.Td>
                      <Button size="xs" variant="light" color="violet" onClick={() => setSelectedFile(doc)}>
                        View / Download
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}

          {totalPages > 1 && (
            <Group justify="center" mt="xl">
              <Pagination
                total={totalPages}
                value={currentPage}
                onChange={setCurrentPage}
                color="violet"
                withEdges
              />
            </Group>
          )}
        </>
      )}

      {/* File Preview Drawer */}
      <Drawer
        opened={!!selectedFile}
        onClose={() => setSelectedFile(null)}
        position="bottom"
        size="80%"
        title={`Viewing: ${selectedFile?.name || 'File'}`}
        overlayProps={{ opacity: 0.5, blur: 4 }}
        padding="md"
      >
        <Stack h="100%" gap="md">
          {/* Top bar with download button */}
          <Group justify="space-between" align="center">
            <Text fw={600} size="lg">File Preview</Text>
            <Button
              color="violet"
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

          {/* Preview Area */}
          <Stack flex={1} pos="relative" style={{ minHeight: 0 }}>
            {/* Loading overlay */}
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
              <Loader size="xl" color="violet" variant="dots" />
            </Center>

            {/* Render based on file type */}
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
                          background: 'white',
                          borderRadius: 'var(--mantine-radius-md)',
                        }}
                      />
                    </ScrollArea>
                  );
                }
                if (previewContent === 'loading') {
                  return null;
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
                // Normalize rows to prevent column misalignment
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