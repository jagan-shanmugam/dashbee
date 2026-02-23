"use client";

import { useState, useEffect } from "react";
import {
  Cloud,
  Folder,
  FileText,
  ChevronRight,
  ArrowLeft,
  RefreshCw,
  X,
  Check,
  AlertCircle,
  Download,
} from "lucide-react";
import {
  useCloudStorage,
  type CloudProvider,
  type S3Config,
  type GCSConfig,
} from "@/lib/cloud-storage-context";

interface CloudStorageBrowserProps {
  onFileSelect: (fileName: string, fileData: ArrayBuffer) => void;
  onClose: () => void;
}

/**
 * Cloud Storage Browser
 *
 * Allows users to browse S3 or GCS buckets and select Parquet files
 * to load into the dashboard generator.
 */
export function CloudStorageBrowser({ onFileSelect, onClose }: CloudStorageBrowserProps) {
  const {
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
  } = useCloudStorage();

  const [selectedProvider, setSelectedProvider] = useState<CloudProvider>("s3");
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // S3 form state
  const [s3Form, setS3Form] = useState<S3Config>({
    accessKeyId: "",
    secretAccessKey: "",
    region: "us-east-1",
  });

  // GCS form state
  const [gcsForm, setGcsForm] = useState<GCSConfig>({
    projectId: "",
    keyFile: "",
  });

  // Refresh files when bucket or path changes
  useEffect(() => {
    if (isConnected && currentBucket) {
      refreshFiles();
    }
  }, [isConnected, currentBucket, currentPath, refreshFiles]);

  const handleConnect = async () => {
    if (selectedProvider === "s3") {
      setS3Config(s3Form);
    } else {
      setGcsConfig(gcsForm);
    }

    // Small delay to ensure config is set
    setTimeout(async () => {
      await connect(selectedProvider);
    }, 100);
  };

  const handleFileClick = async (file: { key: string; name: string; isFolder: boolean }) => {
    if (file.isFolder) {
      if (!currentBucket) {
        // This is a bucket
        setBucket(file.key);
      } else {
        // This is a folder within a bucket
        navigateTo(file.key);
      }
    } else if (file.name.toLowerCase().endsWith(".parquet")) {
      // Download and load the parquet file
      setIsDownloading(true);
      setDownloadError(null);

      try {
        const config = provider === "s3" ? s3Config : gcsConfig;

        const response = await fetch("/api/cloud-storage/download", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider,
            config,
            bucket: currentBucket,
            key: file.key,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Download failed");
        }

        const { fileName, data } = await response.json();

        // Convert base64 to ArrayBuffer
        const binaryString = atob(data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        onFileSelect(fileName, bytes.buffer);
        onClose();
      } catch (error) {
        setDownloadError(error instanceof Error ? error.message : "Download failed");
      } finally {
        setIsDownloading(false);
      }
    }
  };

  const handleBack = () => {
    if (currentPath) {
      // Go up one folder
      const parts = currentPath.split("/").filter(Boolean);
      parts.pop();
      navigateTo(parts.length > 0 ? parts.join("/") + "/" : "");
    } else if (currentBucket) {
      // Go back to bucket list
      setBucket("");
      navigateTo("");
      refreshFiles();
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return "-";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Connection form
  if (!isConnected) {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}
      >
        <div
          style={{
            background: "var(--card)",
            borderRadius: "var(--radius)",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            width: "90%",
            maxWidth: 500,
            maxHeight: "80vh",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "16px 20px",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Cloud size={20} />
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
                Connect to Cloud Storage
              </h2>
            </div>
            <button
              onClick={onClose}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                background: "transparent",
                border: "none",
                borderRadius: "var(--radius)",
                color: "var(--muted)",
                cursor: "pointer",
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Provider selection */}
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--muted)", marginBottom: 8 }}>
              Cloud Provider
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {(["s3", "gcs"] as CloudProvider[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedProvider(p)}
                  style={{
                    flex: 1,
                    padding: "10px 16px",
                    background: selectedProvider === p ? "var(--accent)" : "transparent",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    fontSize: 14,
                    fontWeight: 500,
                    color: "var(--foreground)",
                    cursor: "pointer",
                  }}
                >
                  {p === "s3" ? "Amazon S3" : "Google Cloud Storage"}
                </button>
              ))}
            </div>
          </div>

          {/* S3 configuration */}
          {selectedProvider === "s3" && (
            <div style={{ padding: "16px 20px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--muted)", marginBottom: 6 }}>
                    Access Key ID
                  </label>
                  <input
                    type="text"
                    value={s3Form.accessKeyId}
                    onChange={(e) => setS3Form({ ...s3Form, accessKeyId: e.target.value })}
                    placeholder="AKIAIOSFODNN7EXAMPLE"
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      background: "var(--background)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius)",
                      fontSize: 14,
                      color: "var(--foreground)",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--muted)", marginBottom: 6 }}>
                    Secret Access Key
                  </label>
                  <input
                    type="password"
                    value={s3Form.secretAccessKey}
                    onChange={(e) => setS3Form({ ...s3Form, secretAccessKey: e.target.value })}
                    placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      background: "var(--background)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius)",
                      fontSize: 14,
                      color: "var(--foreground)",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--muted)", marginBottom: 6 }}>
                    Region
                  </label>
                  <select
                    value={s3Form.region}
                    onChange={(e) => setS3Form({ ...s3Form, region: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      background: "var(--background)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius)",
                      fontSize: 14,
                      color: "var(--foreground)",
                    }}
                  >
                    <option value="us-east-1">US East (N. Virginia)</option>
                    <option value="us-east-2">US East (Ohio)</option>
                    <option value="us-west-1">US West (N. California)</option>
                    <option value="us-west-2">US West (Oregon)</option>
                    <option value="eu-west-1">EU (Ireland)</option>
                    <option value="eu-west-2">EU (London)</option>
                    <option value="eu-central-1">EU (Frankfurt)</option>
                    <option value="ap-northeast-1">Asia Pacific (Tokyo)</option>
                    <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* GCS configuration */}
          {selectedProvider === "gcs" && (
            <div style={{ padding: "16px 20px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--muted)", marginBottom: 6 }}>
                    Project ID
                  </label>
                  <input
                    type="text"
                    value={gcsForm.projectId}
                    onChange={(e) => setGcsForm({ ...gcsForm, projectId: e.target.value })}
                    placeholder="my-project-123456"
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      background: "var(--background)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius)",
                      fontSize: 14,
                      color: "var(--foreground)",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--muted)", marginBottom: 6 }}>
                    Service Account Key (JSON) - Optional
                  </label>
                  <textarea
                    value={gcsForm.keyFile ? atob(gcsForm.keyFile) : ""}
                    onChange={(e) => setGcsForm({ ...gcsForm, keyFile: btoa(e.target.value) })}
                    placeholder="Paste your service account JSON key here..."
                    rows={4}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      background: "var(--background)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius)",
                      fontSize: 12,
                      fontFamily: "monospace",
                      color: "var(--foreground)",
                      resize: "vertical",
                    }}
                  />
                  <p style={{ margin: "8px 0 0 0", fontSize: 11, color: "var(--muted)" }}>
                    Leave empty to use default credentials from environment
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error message */}
          {connectionError && (
            <div
              style={{
                padding: "12px 20px",
                background: "rgba(239, 68, 68, 0.1)",
                borderTop: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "var(--destructive)",
                fontSize: 13,
              }}
            >
              <AlertCircle size={16} />
              {connectionError}
            </div>
          )}

          {/* Footer */}
          <div
            style={{
              padding: "16px 20px",
              borderTop: "1px solid var(--border)",
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
            }}
          >
            <button
              onClick={onClose}
              style={{
                padding: "10px 16px",
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                fontSize: 14,
                color: "var(--foreground)",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              style={{
                padding: "10px 20px",
                background: "var(--foreground)",
                color: "var(--background)",
                border: "none",
                borderRadius: "var(--radius)",
                fontSize: 14,
                fontWeight: 500,
                cursor: isConnecting ? "wait" : "pointer",
                opacity: isConnecting ? 0.7 : 1,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {isConnecting && <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} />}
              {isConnecting ? "Connecting..." : "Connect"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // File browser
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: "var(--card)",
          borderRadius: "var(--radius)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          width: "90%",
          maxWidth: 700,
          maxHeight: "80vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 20px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Cloud size={20} />
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
              {provider === "s3" ? "Amazon S3" : "Google Cloud Storage"}
            </h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={disconnect}
              style={{
                padding: "6px 12px",
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                fontSize: 12,
                color: "var(--muted)",
                cursor: "pointer",
              }}
            >
              Disconnect
            </button>
            <button
              onClick={onClose}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                background: "transparent",
                border: "none",
                borderRadius: "var(--radius)",
                color: "var(--muted)",
                cursor: "pointer",
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Breadcrumb */}
        <div
          style={{
            padding: "12px 20px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "var(--accent)",
          }}
        >
          {(currentBucket || currentPath) && (
            <button
              onClick={handleBack}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 28,
                height: 28,
                background: "var(--background)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                color: "var(--foreground)",
                cursor: "pointer",
              }}
            >
              <ArrowLeft size={14} />
            </button>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
            <span style={{ color: "var(--muted)" }}>
              {currentBucket ? (
                <>
                  <span style={{ color: "var(--foreground)", fontWeight: 500 }}>{currentBucket}</span>
                  {currentPath && (
                    <>
                      <ChevronRight size={14} style={{ margin: "0 4px", verticalAlign: "middle" }} />
                      <span>{currentPath}</span>
                    </>
                  )}
                </>
              ) : (
                "Select a bucket"
              )}
            </span>
          </div>
          <button
            onClick={refreshFiles}
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              background: "transparent",
              border: "none",
              color: "var(--muted)",
              cursor: "pointer",
            }}
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* File list */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {files.length === 0 ? (
            <div
              style={{
                padding: 40,
                textAlign: "center",
                color: "var(--muted)",
              }}
            >
              <p style={{ margin: 0, fontSize: 14 }}>No files found</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {files.map((file) => {
                const isParquet = file.name.toLowerCase().endsWith(".parquet");
                const isClickable = file.isFolder || isParquet;

                return (
                  <button
                    key={file.key}
                    onClick={() => isClickable && handleFileClick(file)}
                    disabled={!isClickable}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 20px",
                      background: "transparent",
                      border: "none",
                      borderBottom: "1px solid var(--border)",
                      textAlign: "left",
                      cursor: isClickable ? "pointer" : "default",
                      opacity: isClickable ? 1 : 0.5,
                    }}
                  >
                    {file.isFolder ? (
                      <Folder size={18} style={{ color: "var(--primary)" }} />
                    ) : (
                      <FileText size={18} style={{ color: isParquet ? "var(--success)" : "var(--muted)" }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: "var(--foreground)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {file.name}
                      </div>
                      {!file.isFolder && (
                        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                          {formatSize(file.size)}
                        </div>
                      )}
                    </div>
                    {file.isFolder && (
                      <ChevronRight size={16} style={{ color: "var(--muted)" }} />
                    )}
                    {isParquet && !file.isFolder && (
                      <Download size={16} style={{ color: "var(--success)" }} />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Download error */}
        {downloadError && (
          <div
            style={{
              padding: "12px 20px",
              background: "rgba(239, 68, 68, 0.1)",
              borderTop: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "var(--destructive)",
              fontSize: 13,
            }}
          >
            <AlertCircle size={16} />
            {downloadError}
          </div>
        )}

        {/* Downloading indicator */}
        {isDownloading && (
          <div
            style={{
              padding: "12px 20px",
              background: "var(--accent)",
              borderTop: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
            }}
          >
            <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} />
            Downloading file...
          </div>
        )}

        {/* Footer info */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid var(--border)",
            fontSize: 12,
            color: "var(--muted)",
          }}
        >
          <Check size={12} style={{ verticalAlign: "middle", marginRight: 6, color: "var(--success)" }} />
          Click on a <strong>.parquet</strong> file to load it
        </div>
      </div>
    </div>
  );
}
