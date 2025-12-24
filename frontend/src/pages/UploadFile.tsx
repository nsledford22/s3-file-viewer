// src/pages/UploadFile.tsx
import { useState, useRef } from 'react';
import {
  IconCloudUpload,
  IconDownload,
  IconX,
  IconCheck,
  IconUpload,
} from '@tabler/icons-react';
import {
  Button,
  Group,
  Text,
  useMantineTheme,
  Container,
  Flex,
  Progress,
  Alert,
  Loader,
} from '@mantine/core';
import { Dropzone, MIME_TYPES } from '@mantine/dropzone';
import { notifications } from '@mantine/notifications';
import classes from './UploadFile.module.css';

const API_BASE_URL = import.meta.env.VITE_API_URL;

export function UploadFile() {
  const theme = useMantineTheme();
  const openRef = useRef<() => void>(null);

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [currentFiles, setCurrentFiles] = useState<File[]>([]);

  const handleUpload = async (files: File[]) => {
    if (files.length === 0) return;

    setUploading(true);
    setProgress(0);
    setCurrentFiles(files);

    let uploadedCount = 0;
    const totalFiles = files.length;

    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch(`${API_BASE_URL}/upload_file/`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || 'Upload failed');
        }

        uploadedCount++;
        setProgress(Math.round((uploadedCount / totalFiles) * 100));

        notifications.show({
          title: 'Success',
          message: `${file.name} uploaded successfully`,
          color: 'teal',
          icon: <IconCheck size={18} />,
        });
      } catch (error: any) {
        notifications.show({
          title: 'Failed',
          message: `${file.name}: ${error.message}`,
          color: 'red',
          icon: <IconX size={18} />,
          autoClose: false,
        });
      }
    }

    setUploading(false);
    setProgress(0);
    setCurrentFiles([]);
  };

  return (
    <Container fluid py="xl" px={{ base: 'md', lg: 'xl' }}>
      <Flex direction="column" align="center" justify="center" gap="xl" mih="60vh">
        <Dropzone
          openRef={openRef}
          onDrop={handleUpload}
          // Removed loading={uploading} → no more blur overlay
          multiple={true}
          className={classes.dropzone}
          radius="md"
          accept={[
            MIME_TYPES.pdf,
            MIME_TYPES.xlsx,
            MIME_TYPES.xls,
            MIME_TYPES.csv,
            'text/csv',
          ]}
          maxSize={50 * 1024 ** 2}
        >
          <div style={{ pointerEvents: 'none' }}>
            <Group justify="center">
              <Dropzone.Accept>
                <IconDownload size={50} color={theme.colors.blue[6]} stroke={1.5} />
              </Dropzone.Accept>
              <Dropzone.Reject>
                <IconX size={50} color={theme.colors.red[6]} stroke={1.5} />
              </Dropzone.Reject>
              <Dropzone.Idle>
                <IconCloudUpload size={50} stroke={1.5} className={classes.icon} />
              </Dropzone.Idle>
            </Group>

            <Text ta="center" fw={700} fz="lg" mt="xl">
              <Dropzone.Accept>Drop files here</Dropzone.Accept>
              <Dropzone.Reject>File type not allowed or too large</Dropzone.Reject>
              <Dropzone.Idle>Upload File(s)</Dropzone.Idle>
            </Text>

            <Text className={classes.description}>
              Drag & drop or click to upload. Accepts <i>.pdf</i>, <i>.xlsx</i>, <i>.xls</i>, and <i>.csv</i> files up to 50MB.
            </Text>
          </div>
        </Dropzone>

        <Button
          size="md"
          radius="xl"
          onClick={() => openRef.current?.()}
          color="violet"
          disabled={uploading}
          leftSection={uploading ? <Loader size="sm" /> : <IconUpload size={18} />}
        >
          {uploading ? 'Uploading...' : 'Select files'}
        </Button>

        {/* Clean, single progress indicator */}
        {uploading && (
          <Alert
            icon={<IconUpload size={20} />}
            title="Uploading files..."
            color="violet"
            variant="light"
            w="100%"
            maw={600}
          >
            <Progress value={progress} animated striped color="violet" mb="md" />
            <Text size="sm" c="dimmed">
              Processing {currentFiles.length} file(s) — {progress}% complete
            </Text>
          </Alert>
        )}
      </Flex>
    </Container>
  );
}