"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

export type CloudProvider = "s3" | "gcs";

export interface S3Config {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket?: string;
}

export interface GCSConfig {
  projectId: string;
  keyFile?: string; // JSON key file content (base64 encoded)
  bucket?: string;
}

export interface CloudStorageFile {
  key: string;
  name: string;
  size: number;
  lastModified: Date;
  isFolder: boolean;
}

interface CloudStorageContextValue {
  // Connection state
  provider: CloudProvider | null;
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;

  // S3 config
  s3Config: S3Config | null;
  setS3Config: (config: S3Config | null) => void;

  // GCS config
  gcsConfig: GCSConfig | null;
  setGcsConfig: (config: GCSConfig | null) => void;

  // Current state
  currentBucket: string | null;
  currentPath: string;
  files: CloudStorageFile[];

  // Actions
  connect: (provider: CloudProvider) => Promise<boolean>;
  disconnect: () => void;
  setBucket: (bucket: string) => void;
  navigateTo: (path: string) => void;
  refreshFiles: () => Promise<void>;
}

const CloudStorageContext = createContext<CloudStorageContextValue | null>(null);

interface CloudStorageProviderProps {
  children: ReactNode;
}

export function CloudStorageProvider({ children }: CloudStorageProviderProps) {
  const [provider, setProvider] = useState<CloudProvider | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const [s3Config, setS3Config] = useState<S3Config | null>(null);
  const [gcsConfig, setGcsConfig] = useState<GCSConfig | null>(null);

  const [currentBucket, setCurrentBucket] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState("");
  const [files, setFiles] = useState<CloudStorageFile[]>([]);

  const connect = useCallback(async (selectedProvider: CloudProvider): Promise<boolean> => {
    setIsConnecting(true);
    setConnectionError(null);

    try {
      const config = selectedProvider === "s3" ? s3Config : gcsConfig;
      if (!config) {
        throw new Error(`No configuration provided for ${selectedProvider}`);
      }

      const response = await fetch("/api/cloud-storage/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: selectedProvider, config }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Connection failed");
      }

      const { buckets } = await response.json();

      setProvider(selectedProvider);
      setIsConnected(true);

      // If buckets returned, show them as "folders"
      if (buckets && buckets.length > 0) {
        setFiles(buckets.map((b: { name: string; creationDate?: string }) => ({
          key: b.name,
          name: b.name,
          size: 0,
          lastModified: b.creationDate ? new Date(b.creationDate) : new Date(),
          isFolder: true,
        })));
      }

      return true;
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : "Connection failed");
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [s3Config, gcsConfig]);

  const disconnect = useCallback(() => {
    setProvider(null);
    setIsConnected(false);
    setCurrentBucket(null);
    setCurrentPath("");
    setFiles([]);
    setConnectionError(null);
  }, []);

  const setBucket = useCallback((bucket: string) => {
    setCurrentBucket(bucket);
    setCurrentPath("");
  }, []);

  const navigateTo = useCallback((path: string) => {
    setCurrentPath(path);
  }, []);

  const refreshFiles = useCallback(async () => {
    if (!isConnected || !provider) return;

    const config = provider === "s3" ? s3Config : gcsConfig;
    if (!config) return;

    try {
      const response = await fetch("/api/cloud-storage/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          config,
          bucket: currentBucket,
          prefix: currentPath,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to list files");
      }

      const { files: fileList } = await response.json();
      setFiles(fileList || []);
    } catch (error) {
      console.error("Failed to refresh files:", error);
    }
  }, [isConnected, provider, s3Config, gcsConfig, currentBucket, currentPath]);

  return (
    <CloudStorageContext.Provider
      value={{
        provider,
        isConnected,
        isConnecting,
        connectionError,
        s3Config,
        setS3Config,
        gcsConfig,
        setGcsConfig,
        currentBucket,
        currentPath,
        files,
        connect,
        disconnect,
        setBucket,
        navigateTo,
        refreshFiles,
      }}
    >
      {children}
    </CloudStorageContext.Provider>
  );
}

export function useCloudStorage(): CloudStorageContextValue {
  const context = useContext(CloudStorageContext);
  if (!context) {
    throw new Error("useCloudStorage must be used within a CloudStorageProvider");
  }
  return context;
}

export function useCloudStorageSafe(): CloudStorageContextValue | null {
  return useContext(CloudStorageContext);
}
