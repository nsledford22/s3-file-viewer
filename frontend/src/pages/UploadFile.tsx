// src/pages/UploadFile.tsx
import { useState, useEffect, useRef } from 'react';
import {
  Container,
  Title,
  Group,
  Loader,
  TextInput,
  Select,
  SegmentedControl,
  Center,
  Stack,
  Text,
  Breadcrumbs,
  Anchor,
  ActionIcon,
  Progress
} from '@mantine/core';
import { Dropzone, MIME_TYPES } from '@mantine/dropzone';
import {
  IconCloudUpload,
  IconFolder,
  IconFolderPlus,
  IconChevronRight,
  IconBucket as IconS3
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

const API_BASE_URL = import.meta.env.VITE_API_URL;

export function UploadFile() {
  const openRef = useRef<() => void>(null);

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [currentFiles, setCurrentFiles] = useState<File[]>([]);

  // Bucket selection
  const [buckets, setBuckets] = useState<string[]>([]);
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [bucketsLoading, setBucketsLoading] = useState(true);

  // Folder browsing state
  const [currentPrefix, setCurrentPrefix] = useState('');
  const [folders, setFolders] = useState<string[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);

  // Folder mode
  const [folderMode, setFolderMode] = useState<'existing' | 'new'>('existing');
  const [newFolderPath, setNewFolderPath] = useState('');

  // Track previous uploading state for notification management
  const [previousUploading, setPreviousUploading] = useState(false);

  // Breadcrumb parts
  const breadcrumbParts = currentPrefix
    .split('/')
    .filter(Boolean)
    .reduce((acc: { title: string; prefix: string }[], part, index, arr) => {
      const prefix = arr.slice(0, index + 1).join('/') + '/';
      acc.push({ title: part, prefix });
      return acc;
    }, []);

  // Load buckets
  useEffect(() => {
    const fetchBuckets = async () => {
      setBucketsLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/list_buckets`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        const bucketList = data.buckets || [];
        setBuckets(bucketList);
        // No auto-selection — user must choose explicitly
      } catch {
        notifications.show({
          title: 'Error',
          message: 'Failed to load S3 buckets',
          color: 'red',
        });
      } finally {
        setBucketsLoading(false);
      }
    };
    fetchBuckets();
  }, []);

  // Load folders when bucket or prefix changes
  useEffect(() => {
    if (!selectedBucket) {
      setFolders([]);
      setCurrentPrefix('');
      return;
    }

    const fetchFolders = async () => {
      setLoadingFolders(true);
      try {
        const res = await fetch(
          `${API_BASE_URL}/list_files?bucket_name=${encodeURIComponent(selectedBucket)}&prefix=${encodeURIComponent(currentPrefix)}`
        );
        if (!res.ok) throw new Error();
        const data = await res.json();
        const folderKeys = (data.folders || []).map((f: { key: string }) => f.key);
        const subFolders = folderKeys.map((key: string) =>
          key.slice(currentPrefix.length).replace(/\/$/, '')
        );
        setFolders(subFolders);
      } catch {
        notifications.show({
          title: 'Error',
          message: 'Failed to load folders',
          color: 'red',
        });
        setFolders([]);
      } finally {
        setLoadingFolders(false);
      }
    };

    fetchFolders();
  }, [selectedBucket, currentPrefix]);

  const navigateToFolder = (prefix: string) => {
    setCurrentPrefix(prefix);
    setFolderMode('existing');
  };

  const getUploadPath = () => {
    if (folderMode === 'existing') {
      return currentPrefix;
    }
    const base = currentPrefix;
    const newPart = newFolderPath.trim().replace(/\/+$/, '');
    return newPart ? `${base}${newPart}/` : base;
  };

  const handleUpload = async (files: File[]) => {
    if (files.length === 0 || !selectedBucket) return;

    setUploading(true);
    setProgress(0);
    setCurrentFiles(files);

    const basePath = getUploadPath();
    let uploadedCount = 0;
    const totalFiles = files.length;

    for (const file of files) {
      const key = basePath ? `${basePath}${file.name}` : file.name;

      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch(
          `${API_BASE_URL}/upload_file/?key=${encodeURIComponent(key)}&bucket_name=${encodeURIComponent(selectedBucket)}`,
          {
            method: 'POST',
            body: formData,
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || 'Upload failed');
        }

        uploadedCount++;
        setProgress(Math.round((uploadedCount / totalFiles) * 100));

        notifications.show({
          title: 'Success',
          message: `${file.name} → ${key || '(root)'}`,
          color: 'teal',
        });
      } catch (error: any) {
        notifications.show({
          title: 'Failed',
          message: `${file.name}: ${error.message}`,
          color: 'red',
          autoClose: false,
        });
      }
    }

    setUploading(false);
    setProgress(0);
    setCurrentFiles([]);
    setNewFolderPath('');
  };

  // Manage upload progress notification
  useEffect(() => {
    if (uploading && !previousUploading) {
      notifications.show({
        id: 'upload-in-progress',
        loading: true,
        title: 'Uploading files...',
        message: (
          <Stack gap="xs" mt="md">
            <Progress value={progress} animated striped />
            <Text size="sm">
              Processing {currentFiles.length} file(s) — {progress}% complete
            </Text>
            <Text size="xs">
              Target: <strong>{getUploadPath() || '(bucket root)'}</strong>
            </Text>
          </Stack>
        ),
        autoClose: false,
        withCloseButton: false,
        color: 'violet',
      });
    } else if (!uploading && previousUploading) {
      notifications.hide('upload-in-progress');
    }

    if (uploading) {
      notifications.update({
        id: 'upload-in-progress',
        loading: true,
        message: (
          <Stack gap="xs" mt="md">
            <Progress value={progress} animated striped />
            <Text size="sm">
              Processing {currentFiles.length} file(s) — {progress}% complete
            </Text>
            <Text size="xs">
              Target: <strong>{getUploadPath() || '(bucket root)'}</strong>
            </Text>
          </Stack>
        ),
      });
    }

    setPreviousUploading(uploading);
  }, [uploading, progress, currentFiles.length, previousUploading]);

  if (bucketsLoading) {
    return (
      <Container size="xl" py="xl">
        <Center h="80vh">
          <Stack align="center" gap="xl">
            <Loader size="xl" />
            <Text size="lg" c="dimmed">
              Loading S3 buckets...
            </Text>
          </Stack>
        </Center>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Title order={1} mb="xl" ta="center">
        <Group gap="md" justify="center">
          Upload File(s)
        </Group>
      </Title>

      {/* Bucket Selector */}
      <Group justify="center" mb="lg">
        <Select
          placeholder="Select target bucket..."
          data={buckets}
          value={selectedBucket}
          onChange={(value) => {
            setSelectedBucket(value);
            setCurrentPrefix('');
          }}
          searchable
          w={400}
          leftSection={<IconS3 size={18} />}
          disabled={uploading}
          allowDeselect={false}
        />
      </Group>

      {selectedBucket && (
        <>
          {/* Breadcrumb Navigation */}
          <Center mb="lg">
            <Breadcrumbs separator={<IconChevronRight size={16} />}>
              <Anchor
                onClick={() => setCurrentPrefix('')}
                style={{ cursor: 'pointer' }}
              >
                <Group gap={4}>
                  <IconS3 size={16} />
                  {selectedBucket}
                </Group>
              </Anchor>
              {breadcrumbParts.map((part) => (
                <Anchor
                  key={part.prefix}
                  onClick={() => navigateToFolder(part.prefix)}
                  style={{ cursor: 'pointer' }}
                >
                  {part.title}
                </Anchor>
              ))}
            </Breadcrumbs>
          </Center>

          {/* Final Upload Path Display */}
          <Center mb="md">
            <Text size="sm" c="dimmed">
              Uploading to:{' '}
              <strong>{getUploadPath() || '(bucket root)'}</strong>
            </Text>
          </Center>

          {/* Folder Mode Toggle */}
          <Center mb="lg">
            <SegmentedControl
              value={folderMode}
              onChange={(value) => {
                setFolderMode(value as 'existing' | 'new');
                setNewFolderPath('');
              }}
              data={[
                { label: 'Upload to Current Folder', value: 'existing' },
                { label: 'Create New Subfolder', value: 'new' },
              ]}
              w={500}
              color="grape"
            />
          </Center>

          {/* New Folder Input */}
          {folderMode === 'new' && (
            <Group justify="center" mb="xl">
              <TextInput
                placeholder="e.g., invoices/december/ or reports/Q4/"
                value={newFolderPath}
                onChange={(e) => setNewFolderPath(e.currentTarget.value)}
                leftSection={<IconFolderPlus size={18} />}
                w={500}
                disabled={uploading}
                description="Will be created inside current folder"
              />
            </Group>
          )}

          {/* Subfolder Browser */}
          {loadingFolders ? (
            <Center my="lg">
              <Loader />
            </Center>
          ) : folders.length > 0 ? (
            <Center my="lg">
              <Stack align="center" gap="sm">
                <Text size="sm" c="dimmed">Subfolders in current location:</Text>
                <Group gap="xs">
                  {folders.map((folder) => (
                    <ActionIcon
                      key={folder}
                      variant="light"
                      w={120}
                      onClick={() => navigateToFolder(currentPrefix + folder + '/')}
                    >
                      <IconFolder size={20} />
                      <Text size="sm" ml={4}>{folder}</Text>
                    </ActionIcon>
                  ))}
                </Group>
              </Stack>
            </Center>
          ) : null}
        </>
      )}

      {/* Dropzone */}
      <Center>
        <Dropzone
          openRef={openRef}
          onDrop={handleUpload}
          multiple={true}
          radius="md"
          accept={[
            MIME_TYPES.pdf,
            MIME_TYPES.xlsx,
            MIME_TYPES.xls,
            MIME_TYPES.csv,
            MIME_TYPES.docx,
            MIME_TYPES.zip,
            'text/csv',
          ]}
          maxSize={50 * 1024 ** 2}
          disabled={!selectedBucket || uploading}
          style={{
            width: '100%',
            maxWidth: 600,
            border: '2px dashed var(--mantine-color-gray-4)',
            borderRadius: 'var(--mantine-radius-md)',
            position: 'relative', // Needed for overlay
          }}
        >
          {/* Default content */}
          <Group justify="center" gap="xl" style={{ pointerEvents: 'none' }} py={80}>
            <IconCloudUpload size={60} stroke={1.5} />
            <div>
              <Text size="xl" inline ta="center">
                Drag files here or click to upload
              </Text>
              <Text size="sm" c="dimmed" inline ta="center" mt={7}>
                Accepts .pdf, .xlsx, .xls, .csv, .docx, .zip up to 50MB
              </Text>
            </div>
          </Group>

          {/* Custom clickable overlay (always active) */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'all', // Makes it clickable even when Dropzone is disabled
              cursor: selectedBucket ? 'pointer' : 'not-allowed',
            }}
            onClick={() => {
              if (!selectedBucket) {
                notifications.show({
                  id: 'no-bucket-warning',
                  title: 'Bucket Required',
                  message: 'Please select a bucket from the list before uploading files.',
                  color: 'orange',
                  autoClose: 5000,
                });
              } else {
                // Safe to open file picker
                openRef.current?.();
              }
            }}
          />
        </Dropzone>
      </Center>
    </Container>
  );
}