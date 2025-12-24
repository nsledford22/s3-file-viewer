// src/pages/UploadFile.tsx
import { useState, useEffect, useRef } from 'react';
import {
  Container,
  Title,
  Group,
  Loader,
  Alert,
  Progress,
  TextInput,
  Select,
  SegmentedControl,
  Center,
  Stack,
  Text
} from '@mantine/core';
import { Dropzone, MIME_TYPES } from '@mantine/dropzone';
import {
  IconCloudUpload,
  IconFolder,
  IconFolderPlus,
  IconUpload,
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

  // Folder selection mode
  const [folderMode, setFolderMode] = useState<'existing' | 'new'>('existing');

  // Existing folders
  const [existingFolders, setExistingFolders] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  // New folder input
  const [newFolderPath, setNewFolderPath] = useState('');

  // Load buckets on mount
  useEffect(() => {
    const fetchBuckets = async () => {
      setBucketsLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/list_buckets`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        const bucketList = data.buckets || [];
        setBuckets(bucketList);
        if (bucketList.length > 0) {
          setSelectedBucket(bucketList[0]);
        }
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

  // Load folders when bucket changes
  useEffect(() => {
    if (!selectedBucket) {
      setExistingFolders([]);
      setSelectedFolder(null);
      return;
    }

    const fetchFolders = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/list_files?bucket_name=${encodeURIComponent(selectedBucket)}&prefix=`
        );
        if (!res.ok) throw new Error();
        const data = await res.json();
        const folders = (data.folders || []).map((f: { key: string }) => f.key);
        setExistingFolders(folders);
      } catch {
        notifications.show({
          title: 'Error',
          message: 'Failed to load folders',
          color: 'red',
        });
        setExistingFolders([]);
      }
    };

    fetchFolders();
  }, [selectedBucket]);

  const handleUpload = async (files: File[]) => {
    if (files.length === 0 || !selectedBucket) return;

    setUploading(true);
    setProgress(0);
    setCurrentFiles(files);

    let uploadedCount = 0;
    const totalFiles = files.length;

    const basePath = folderMode === 'existing'
      ? (selectedFolder || '')
      : newFolderPath.trim().replace(/\/+$/, '');

    for (const file of files) {
      const key = basePath ? `${basePath}/${file.name}` : file.name;

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
    setSelectedFolder(null);
    setNewFolderPath('');
  };

  // Loading state while buckets load
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
      <Group justify="center" mb="xl">
        <Select
          placeholder="Select target bucket..."
          data={buckets}
          value={selectedBucket}
          onChange={setSelectedBucket}
          searchable
          w={400}
          leftSection={<IconFolder size={18} />}
          disabled={uploading}
        />
      </Group>

      {selectedBucket && (
        <>
          {/* Folder Mode Toggle */}
          <Center mb="lg">
            <SegmentedControl
              value={folderMode}
              onChange={(value) => {
                setFolderMode(value as 'existing' | 'new');
                setSelectedFolder(null);
                setNewFolderPath('');
              }}
              data={[
                { label: 'Upload to Existing Folder', value: 'existing' },
                { label: 'Create New Folder', value: 'new' },
              ]}
              w={500}
            />
          </Center>

          {/* Folder Selection */}
          <Group justify="center" mb="xl">
            {folderMode === 'existing' ? (
              <Select
                placeholder="Choose folder (optional)"
                data={existingFolders}
                value={selectedFolder}
                onChange={setSelectedFolder}
                searchable
                clearable
                nothingFoundMessage="No folders found"
                leftSection={<IconFolder size={18} />}
                w={500}
                disabled={uploading}
                description="Leave empty to upload to bucket root"
              />
            ) : (
              <TextInput
                placeholder="e.g., reports/2025/Q4/ or new-project/"
                value={newFolderPath}
                onChange={(e) => setNewFolderPath(e.currentTarget.value)}
                leftSection={<IconFolderPlus size={18} />}
                w={500}
                disabled={uploading}
                description="New folder will be created automatically"
              />
            )}
          </Group>
        </>
      )}

      {/* Dropzone with border (matching CloudWatch style) */}
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
            'text/csv',
          ]}
          maxSize={50 * 1024 ** 2}
          disabled={!selectedBucket || uploading}
          style={{
            width: '100%',
            maxWidth: 600,
            border: '2px dashed var(--mantine-color-gray-4)',
            borderRadius: 'var(--mantine-radius-md)',
            backgroundColor: uploading ? 'var(--mantine-color-gray-1)' : undefined,
          }}
        >
          <Group justify="center" gap="xl" style={{ pointerEvents: 'none' }} py={80}>
            <IconCloudUpload size={60} stroke={1.5} />
            <div>
              <Text size="xl" inline ta="center">
                Drag files here or click to upload
              </Text>
              <Text size="sm" c="dimmed" inline ta="center" mt={7}>
                Accepts .pdf, .xlsx, .xls, .csv up to 50MB
              </Text>
            </div>
          </Group>
        </Dropzone>
      </Center>

      {/* Upload Progress */}
      {uploading && (
        <Center mt="xl">
          <Alert
            icon={<IconUpload size={20} />}
            title="Uploading files..."
            color="violet"
            variant="light"
            w="100%"
            maw={600}
          >
            <Progress value={progress} animated striped mb="md" />
            <Text size="sm" c="dimmed" ta="center">
              Processing {currentFiles.length} file(s) — {progress}% complete
            </Text>
          </Alert>
        </Center>
      )}
    </Container>
  );
}