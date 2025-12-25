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
  TextInput,
  Pagination,
  Loader,
  Center,
  Drawer,
  Stack,
  ScrollArea,
  Breadcrumbs,
  Anchor,
  Slider,
  ActionIcon,
  Select,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconLayoutGrid,
  IconTable,
  IconSearch,
  IconDownload,
  IconFolder,
  IconFile,
  IconFileTypePdf,
  IconFileTypeXls,
  IconFileTypeCsv,
  IconFileTypeDocx,
  IconChevronRight,
  IconTrash,
  IconBrandPython,
  IconBrandHtml5,
  IconBrandCss3,
  IconBrandJavascript,
  IconBrandTypescript,
  IconJson,
  IconFileText,
  IconSql,
  IconFileTypeXml,
  IconFileSearch,
  IconBucket as IconS3,
  IconXboxX,
  IconEye
} from '@tabler/icons-react';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import SyntaxHighlighter from 'react-syntax-highlighter';
import atomOneDark from 'react-syntax-highlighter/dist/esm/styles/hljs/atom-one-dark';
import atomOneLight from 'react-syntax-highlighter/dist/esm/styles/hljs/atom-one-light';
import { useMantineColorScheme } from '@mantine/core';
import { useSearchParams } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_URL;

interface S3File {
  key: string;
  name: string;
  size: number;
  last_modified: string;
  rawContent?: string;
}

interface S3Folder {
  key: string;
  name: string;
}

const getFileType = (filename: string): 'pdf' | 'docx' | 'doc' | 'excel' | 'csv' | 'code' | 'other' => {
  const ext = filename.toLowerCase().split('.').pop() || '';
  if (ext === 'pdf') return 'pdf';
  if (ext === 'docx') return 'docx';
  if (ext === 'doc') return 'doc';
  if (['xlsx', 'xls'].includes(ext)) return 'excel';
  if (ext === 'csv') return 'csv';
  if (['html', 'htm', 'js', 'jsx', 'ts', 'tsx', 'css', 'json', 'xml', 'yaml', 'yml', 'txt', 'md', 'py', 'java', 'sh', 'sql', 'log'].includes(ext))
    return 'code';
  return 'other';
};

const getFileIcon = (filename: string, size: number = 20) => {
  const ext = filename.toLowerCase().split('.').pop() || '';

  switch (ext) {
    case 'pdf':
      return <IconFileTypePdf size={size} color="#ED2224" />;
    case 'xlsx':
    case 'xls':
      return <IconFileTypeXls size={size} color="#008000" />;
    case 'csv':
      return <IconFileTypeCsv size={size} color="#008040" />;
    case 'docx':
    case 'doc':
      return <IconFileTypeDocx size={size} color="#00A2ED" />;
    case 'html':
    case 'htm':
      return <IconBrandHtml5 size={size} color="#E34F26" />;
    case 'css':
      return <IconBrandCss3 size={size} color="#1572B6" />;
    case 'js':
    case 'jsx':
      return <IconBrandJavascript size={size} color="#F7DF1E" />;
    case 'ts':
    case 'tsx':
      return <IconBrandTypescript size={size} color="#3178C6" />;
    case 'py':
      return <IconBrandPython size={size} color="#3776AB" />;
    case 'json':
      return <IconJson size={size} color="#F7DF1E" />;
    case 'txt':
    case 'log':
    case 'md':
      return <IconFileText size={size} color="#7950F2" />;
    case 'sql':
      return <IconSql size={size} color="#F29111" />;
    case 'xml':
      return <IconFileTypeXml size={size} color="#FF6600" />;
    default:
      return <IconFile size={size} color="gray" />;
  }
};

const getItemsPerPage = (density: number): number => {
  switch (density) {
    case 3: return 6;
    case 4: return 8;
    case 5: return 10;
    case 6: return 12;
    default: return 8;
  }
};

export function BrowseDocuments() {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  const [searchParams, setSearchParams] = useSearchParams();

  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [files, setFiles] = useState<S3File[]>([]);
  const [folders, setFolders] = useState<S3Folder[]>([]);
  const [currentPrefix, setCurrentPrefix] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<S3File | null>(null);
  const [previewContent, setPreviewContent] = useState<'loading' | 'iframe' | 'word' | 'spreadsheet' | 'code' | 'error'>('loading');
  const [wordHtml, setWordHtml] = useState<string>('');
  const [sheetData, setSheetData] = useState<any[][]>([]);
  const [density, setDensity] = useState(4);

  // Bucket selection
  const [buckets, setBuckets] = useState<string[]>([]);
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);

  const itemsPerPage = getItemsPerPage(density);

  // 1. Restore from URL
  useEffect(() => {
    const urlBucket = searchParams.get('bucket');
    const urlPrefix = searchParams.get('prefix');

    if (urlBucket) {
      setSelectedBucket(urlBucket);
      setCurrentPrefix(urlPrefix ? decodeURIComponent(urlPrefix) : '');
    }
  }, [searchParams]);

  // 2. Validate bucket access
  useEffect(() => {
    if (buckets.length === 0 || !selectedBucket) return;

    if (!buckets.includes(selectedBucket)) {
      notifications.show({
        title: 'Access Denied',
        message: `You don't have access to bucket "${selectedBucket}".`,
        color: 'red',
      });
      setSelectedBucket(null);
      setCurrentPrefix('');
      setSearchParams({});
      localStorage.removeItem('s3BrowseLastLocation');
    }
  }, [buckets, selectedBucket, searchParams, setSearchParams]);

  // 3. Sync URL
  useEffect(() => {
    const currentBucket = searchParams.get('bucket');
    const currentUrlPrefix = searchParams.get('prefix') || '';

    const shouldUpdate =
      currentBucket !== selectedBucket ||
      decodeURIComponent(currentUrlPrefix) !== currentPrefix;

    if (!shouldUpdate) return;

    if (selectedBucket) {
      const newParams: { bucket: string; prefix?: string } = { bucket: selectedBucket };
      if (currentPrefix) {
        newParams.prefix = encodeURIComponent(currentPrefix);
      }
      setSearchParams(newParams);
    } else {
      setSearchParams({});
    }
  }, [selectedBucket, currentPrefix, searchParams, setSearchParams]);

  // 4. Save to localStorage
  useEffect(() => {
    if (selectedBucket) {
      localStorage.setItem('s3BrowseLastLocation', JSON.stringify({
        bucket: selectedBucket,
        prefix: currentPrefix,
      }));
    } else {
      localStorage.removeItem('s3BrowseLastLocation');
    }
  }, [selectedBucket, currentPrefix]);

  // 5. Restore from localStorage
  useEffect(() => {
    if (selectedBucket !== null) return;

    const saved = localStorage.getItem('s3BrowseLastLocation');
    if (saved) {
      try {
        const { bucket, prefix } = JSON.parse(saved);
        if (bucket && buckets.includes(bucket)) {
          setSelectedBucket(bucket);
          setCurrentPrefix(prefix || '');
          setSearchParams({
            bucket,
            ...(prefix ? { prefix: encodeURIComponent(prefix) } : {}),
          });
        }
      } catch (e) {
        console.warn('Failed to parse saved browse location');
        localStorage.removeItem('s3BrowseLastLocation');
      }
    }
  }, [buckets, selectedBucket, setSearchParams]);

  // Load buckets
  useEffect(() => {
    const fetchBuckets = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/list_buckets`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setBuckets(data.buckets || []);
      } catch {
        notifications.show({
          title: 'Error',
          message: 'Failed to load S3 buckets',
          color: 'red',
        });
      }
    };
    fetchBuckets();
  }, []);

  // Breadcrumbs
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

  // Fetch contents
  useEffect(() => {
    if (!selectedBucket) return;

    const fetchContents = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(
          `${API_BASE_URL}/list_files?bucket_name=${encodeURIComponent(selectedBucket)}&prefix=${encodeURIComponent(currentPrefix)}`
        );
        if (!response.ok) throw new Error('Failed to fetch contents');
        const data = await response.json();

        setFiles(data.files || []);
        setFolders(data.folders || []);
      } catch (err: any) {
        setError(err.message || 'Unable to load contents');
      } finally {
        setLoading(false);
      }
    };

    fetchContents();
  }, [currentPrefix, selectedBucket]);

  // Filter & paginate
  const allItems = [
    ...folders.map(f => ({ ...f, type: 'folder' as const })),
    ...files.map(f => ({ ...f, type: 'file' as const })),
  ];

  const filteredItems = allItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalItems = filteredItems.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

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
        `${API_BASE_URL}/view_file/${encodeURIComponent(file.key)}?bucket_name=${encodeURIComponent(selectedBucket!)}`
      );
      if (!response.ok) throw new Error('Failed to load file');

      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const textDecoder = new TextDecoder('utf-8');
      let textContent = textDecoder.decode(arrayBuffer);

      const ext = file.name.toLowerCase().split('.').pop() || '';

      // XML: pretty print
      if (ext === 'xml') {
        try {
          const formatted = textContent
            .replace(/></g, '>\n<')
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map((line, index) => {
              let indent = 0;
              const openTags = (line.match(/</g) || []).length;
              const closeTags = (line.match(/<\//g) || []).length;
              indent = openTags - closeTags;
              if (indent < 0 && index > 0) indent = 0;
              return '  '.repeat(indent) + line;
            })
            .join('\n')
            .trim();

          (file as any).rawContent = formatted;
          setPreviewContent('code');
          return;
        } catch (e) {
          console.warn('XML formatting failed');
        }
      }

      // Code files
      const codeExtensions = ['html', 'htm', 'js', 'jsx', 'ts', 'tsx', 'css', 'json', 'yaml', 'yml', 'txt', 'md', 'py', 'java', 'sh', 'sql', 'log'];
      if (codeExtensions.includes(ext)) {
        (file as any).rawContent = textContent;
        setPreviewContent('code');
        return;
      }

      const type = getFileType(file.name);

      // Word
      if (type === 'docx') {
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setWordHtml(result.value);
        setPreviewContent('word');
        return;
      }

      // Excel / CSV
      if (type === 'excel' || type === 'csv') {
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        setSheetData(json as any[][]);
        setPreviewContent('spreadsheet');
        return;
      }

      // Fallback: iframe (PDF, images, etc.)
      setPreviewContent('iframe');
    } catch (err) {
      console.error('Preview error:', err);
      setPreviewContent('error');
    }
  };

  const handleDelete = async (key: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/delete_file/?key=${encodeURIComponent(key)}&bucket_name=${encodeURIComponent(selectedBucket!)}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Delete failed');
      }

      notifications.show({
        title: 'Deleted',
        message: `${name} has been permanently deleted`,
        color: 'red',
        icon: <IconTrash size={18} />,
      });

      const refreshed = await fetch(
        `${API_BASE_URL}/list_files?bucket_name=${encodeURIComponent(selectedBucket!)}&prefix=${encodeURIComponent(currentPrefix)}`
      );
      const data = await refreshed.json();
      setFiles(data.files || []);
      setFolders(data.folders || []);
    } catch (error: any) {
      notifications.show({
        title: 'Delete Failed',
        message: error.message,
        color: 'red',
        autoClose: false,
      });
    }
  };

  const handleDownload = async (fileKey: string, fileName: string) => {
    if (!selectedBucket) return;

    try {
      const url = `${API_BASE_URL}/view_file/${encodeURIComponent(fileKey)}?bucket_name=${encodeURIComponent(selectedBucket)}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error();

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      notifications.show({
        title: 'Download Failed',
        message: 'Could not download the file.',
        color: 'red',
      });
    }
  };

  useEffect(() => {
    if (selectedFile) loadFilePreview(selectedFile);
  }, [selectedFile]);

  // === UI States ===
  if (selectedBucket === null) {
    return (
      <Container fluid py="xl" px={{ base: 'md', lg: 'xl' }}>
        <Center h="70vh">
          <Stack align="center" gap="xl">
            <IconS3 size={80} color="#cc5de8" stroke={1.5} />
            <Stack align="center" gap="xs">
              <Title order={2} ta="center">
                Select an S3 Bucket to Get Started
              </Title>
              <Text size="lg" c="dimmed" ta="center" maw={500}>
                Choose a bucket from the dropdown below to browse its folders and files.
              </Text>
            </Stack>

            <Select
              placeholder="Choose a bucket..."
              data={buckets}
              value={selectedBucket}
              onChange={(value) => setSelectedBucket(value)}
              searchable
              w={400}
              size="lg"
              leftSection={<IconS3 size={24} />}
              allowDeselect={false}
              nothingFoundMessage="No buckets available"
              disabled={buckets.length === 0}
            />
          </Stack>
        </Center>
      </Container>
    );
  }

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
      {/* Breadcrumbs + View Switch */}
      <Group justify="space-between" align="center" mb="sm" wrap="nowrap">
        <Breadcrumbs separator={<IconChevronRight size={16} />}>
          <Anchor onClick={() => setCurrentPrefix('')} style={{ cursor: 'pointer' }}>
            {selectedBucket}
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
            thumbIcon={viewMode === 'table' ? <IconTable size={12} /> : <IconLayoutGrid size={12} />}
          />
        </Group>
      </Group>

      <Title order={1} mb="sm">
        <Group gap="md">
          <IconFileSearch size={32} />
          Browse Documents
        </Group>
      </Title>

      {/* Controls */}
      <Group justify="space-between" align="end" mb="lg" wrap="wrap">
        <Select
          placeholder="Select bucket..."
          data={buckets}
          value={selectedBucket}
          onChange={setSelectedBucket}
          searchable
          w={300}
          leftSection={<IconS3 size={16} />}
          allowDeselect={false}
        />

        <Group gap="md" grow>
          <TextInput
            placeholder="Search files or folders..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.currentTarget.value)}
            leftSection={<IconSearch size={16} />}
            w={400}
          />

          <Group gap="xs" align="center">
            <Text size="sm" fw={500}>Item size:</Text>
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
              w={240}
            />
          </Group>
        </Group>
      </Group>

      {/* Pagination */}
      <Group justify="flex-end" align="center" mb="lg" wrap="nowrap">
        {totalPages > 1 && (
          <Pagination total={totalPages} value={currentPage} onChange={setCurrentPage} withEdges />
        )}
      </Group>

      {/* Content */}
      {totalItems === 0 ? (
        <Text ta="center" c="dimmed" size="lg" py="xl">
          This location is empty.
        </Text>
      ) : (
        <>
          {viewMode === 'cards' ? (
            <SimpleGrid cols={{ base: density, sm: density, md: density, lg: density }} spacing={density <= 4 ? 'lg' : density === 5 ? 'md' : 'sm'}>
              {paginatedItems.map((item) => {
                if (item.type === 'folder') {
                  return (
                    <Card key={item.key} withBorder shadow="sm" padding="lg" radius="md" style={{ cursor: 'pointer' }} onClick={() => navigateToPrefix(item.key)}>
                      <Group align="center" gap="md">
                        <IconFolder size={40} color="#cc5de8" />
                        <Text fw={600} size="lg">{item.name}</Text>
                      </Group>
                      <Text size="sm" c="dimmed" mt="xs">Folder</Text>
                    </Card>
                  );
                }

                const file = item as S3File;
                return (
                  <Card key={file.key} padding={density <= 3 ? 'xl' : density === 4 ? 'lg' : density === 5 ? 'md' : 'sm'} radius="md" withBorder shadow="sm">
                    <Group align="center" gap="xs" mb="xs">
                      {getFileIcon(file.name, 24)}
                      <Text fw={500} truncate="end" maw={260}>{file.name}</Text>
                    </Group>
                    <Text size="xs" c="dimmed" truncate mb="md">{file.key}</Text>
                    <Group gap="xs" mb="md">
                      <Badge variant="light" color="yellow">{formatSize(file.size)}</Badge>
                      <Badge variant="light" color="gray">{formatDate(file.last_modified)}</Badge>
                    </Group>
                    <Group grow mt="auto">
                        <ActionIcon
                          variant="light"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFile(file);
                          }}
                        >
                          <IconEye size={18} />
                        </ActionIcon>

                        <ActionIcon
                          variant="light"
                          color="blue"
                          size="lg"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(file.key, file.name);
                          }}
                        >
                          <IconDownload size={18} />
                        </ActionIcon>

                        <ActionIcon
                          variant="light"
                          color="red"
                          size="lg"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(file.key, file.name);
                          }}
                        >
                          <IconTrash size={18} />
                        </ActionIcon>
                    </Group>
                  </Card>
                );
              })}
            </SimpleGrid>
          ) : (
            <Table highlightOnHover verticalSpacing={density <= 3 ? 'xl' : density === 4 ? 'lg' : density === 5 ? 'md' : 'sm'} horizontalSpacing={density >= 6 ? 'xs' : 'md'}>
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
                  <Table.Tr key={item.key} style={item.type === 'folder' ? { cursor: 'pointer' } : {}} onClick={() => item.type === 'folder' && navigateToPrefix(item.key)}>
                    <Table.Td>{item.type === 'folder' ? <IconFolder size={18} /> : getFileIcon((item as S3File).name, 18)}</Table.Td>
                    <Table.Td><Text fw={item.type === 'folder' ? 600 : 500}>{item.name}</Text></Table.Td>
                    <Table.Td><Text size="sm" c="dimmed" truncate="end" maw={400}>{item.key}</Text></Table.Td>
                    <Table.Td>{item.type === 'folder' ? <Badge variant="light" color="gray">—</Badge> : <Badge variant="light" color="yellow">{formatSize((item as S3File).size)}</Badge>}</Table.Td>
                    <Table.Td>{item.type === 'folder' ? <Badge variant="light" color="gray">—</Badge> : <Badge variant="light" color="gray">{formatDate((item as S3File).last_modified)}</Badge>}</Table.Td>
                    <Table.Td>
                      {item.type === 'file' && (
                        <Group gap="xs">
                          <ActionIcon size="sm" variant="light" onClick={(e) => { e.stopPropagation(); setSelectedFile(item as S3File); }}>
                            <IconEye size={16} />
                          </ActionIcon>
                          <ActionIcon
                            variant="light"
                            color="blue"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload((item as S3File).key, item.name);
                            }}
                          >
                            <IconDownload size={16} />
                          </ActionIcon>
                          <ActionIcon variant="light" color="red" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete((item as S3File).key, item.name); }}>
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      )}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </>
      )}

      {/* Preview Drawer */}
      <Drawer
        opened={!!selectedFile}
        onClose={() => setSelectedFile(null)}
        position="bottom"
        size="100%"
        title={`Viewing: ${selectedFile?.name || 'File'}`}
        overlayProps={{ opacity: 0.5, blur: 4 }}
        padding="sm"
        transitionProps={{ transition: 'slide-up', duration: 300 }}
        closeButtonProps={{
          icon: <IconXboxX size={32} stroke={1.5} color='red'/>,
        }}
      >
        <Stack h="100%" gap="md">
          <Group justify="flex-end" align="center">
            {/* <Button
              leftSection={<IconDownload size={18} />}
              onClick={() => {
                if (!selectedFile) return;
                const url = `${API_BASE_URL}/view_file/${encodeURIComponent(selectedFile.key)}?bucket_name=${encodeURIComponent(selectedBucket!)}`;
                const a = document.createElement('a');
                a.href = url;
                a.download = selectedFile.name;
                a.click();
              }}
            >
              Download
            </Button> */}
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
              <Loader size="xl" />
            </Center>

            {(() => {
              if (!selectedFile) return null;

              const ext = selectedFile.name.toLowerCase().split('.').pop() || '';
              const codeExtensions = ['html', 'htm', 'js', 'jsx', 'ts', 'tsx', 'css', 'json', 'xml', 'yaml', 'yml', 'txt', 'md', 'py', 'java', 'sh', 'sql', 'log'];

              if (codeExtensions.includes(ext)) {
                const languageMap: Record<string, string> = {
                  js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
                  html: 'html', htm: 'html', json: 'json', css: 'css', xml: 'xml',
                  yaml: 'yaml', yml: 'yaml', md: 'markdown', py: 'python', sh: 'bash', sql: 'sql',
                };
                const language = languageMap[ext] || 'text';

                return (
                  <ScrollArea h="100%">
                    <SyntaxHighlighter
                      language={language}
                      style={isDark ? atomOneDark : atomOneLight}
                      showLineNumbers
                      wrapLines
                      customStyle={{ margin: 0, borderRadius: 'var(--mantine-radius-md)', padding: '1.5rem', fontSize: '14px' }}
                    >
                      {(selectedFile as any).rawContent || '// Unable to display content'}
                    </SyntaxHighlighter>
                  </ScrollArea>
                );
              }

              const type = getFileType(selectedFile.name);

              if (previewContent === 'iframe' || type === 'pdf' || type === 'other') {
                return (
                  <iframe
                    src={`${API_BASE_URL}/view_file/${encodeURIComponent(selectedFile.key)}?bucket_name=${encodeURIComponent(selectedBucket!)}`}
                    style={{ width: '100%', height: '100%', border: 'none', borderRadius: 'var(--mantine-radius-md)' }}
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
                return <Center h="100%"><Text c="red">Failed to load Word document</Text></Center>;
              }

              if (type === 'doc') {
                return (
                  <Center h="100%">
                    <Stack align="center" gap="md">
                      <Text c="dimmed" size="lg">Legacy Word (.doc) files are not supported for preview.</Text>
                      <Text c="dimmed" size="sm">Please download to view.</Text>
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
                  <Text c="dimmed">Preview not available for this file type</Text>
                </Center>
              );
            })()}
          </Stack>
        </Stack>
      </Drawer>
    </Container>
  );
}