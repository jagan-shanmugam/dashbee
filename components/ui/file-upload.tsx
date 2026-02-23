"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, FileSpreadsheet, FileJson, File, X, Check, Loader2, AlertTriangle, Plus } from "lucide-react";

export interface UploadedFile {
  name: string;
  type: "csv" | "excel" | "json" | "parquet";
  size: number;
  data: Record<string, unknown>[];
  columns: string[];
  truncated?: boolean;
}

export interface FileUploadProps {
  onFileUploaded: (file: UploadedFile) => void;
  onClear: () => void;
  uploadedFile: UploadedFile | null;
  disabled?: boolean;
}

export interface MultiFileUploadProps {
  onFileUploaded: (file: UploadedFile) => void;
  onRemoveFile: (tableName: string) => void;
  onClearAll: () => void;
  uploadedFiles: Array<{
    tableName: string;
    fileName: string;
    fileType: "csv" | "excel" | "json" | "parquet";
    rowCount: number;
    columns: Array<{ name: string; type: string; nullable: boolean }>;
  }>;
  disabled?: boolean;
}

const ACCEPTED_TYPES = {
  csv: [".csv", "text/csv"],
  excel: [".xlsx", ".xls", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel"],
  json: [".json", "application/json"],
  parquet: [".parquet", "application/octet-stream"],
};

// File size limits in bytes
const FILE_SIZE_LIMITS = {
  csv: 50 * 1024 * 1024,      // 50 MB
  excel: 25 * 1024 * 1024,    // 25 MB
  json: 50 * 1024 * 1024,     // 50 MB
  parquet: 100 * 1024 * 1024, // 100 MB (more efficient format)
};

// Row limits to prevent browser memory issues
const MAX_ROWS = 100000;

function getFileType(file: File): "csv" | "excel" | "json" | "parquet" | null {
  const ext = file.name.toLowerCase().split(".").pop();
  if (ext === "csv" || file.type === "text/csv") return "csv";
  if (ext === "xlsx" || ext === "xls" || file.type.includes("spreadsheet") || file.type.includes("excel")) return "excel";
  if (ext === "json" || file.type === "application/json") return "json";
  if (ext === "parquet") return "parquet";
  return null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type: "csv" | "excel" | "json" | "parquet") {
  if (type === "csv" || type === "excel") return FileSpreadsheet;
  if (type === "parquet") return File;
  return FileJson;
}

/**
 * Hook for file processing logic (shared between single and multi-file upload)
 */
function useFileProcessor(onFileUploaded: (file: UploadedFile) => void) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const processFile = useCallback(async (file: File) => {
    try {
      const fileType = getFileType(file);

      if (!fileType) {
        setError("Unsupported file type. Please upload CSV, Excel, JSON, or Parquet files.");
        return;
      }

      // Check file size limit
      const sizeLimit = FILE_SIZE_LIMITS[fileType];

      if (file.size > sizeLimit) {
        const limitMB = Math.round(sizeLimit / (1024 * 1024));
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
        setError(`File too large (${fileSizeMB} MB). Maximum size for ${fileType.toUpperCase()} files is ${limitMB} MB. Consider using a smaller sample of your data.`);
        return;
      }

      setIsProcessing(true);
      setProcessingStatus("Reading file...");
      setError(null);

      let data: Record<string, unknown>[] = [];
      let columns: string[] = [];

      if (fileType === "csv") {
        setProcessingStatus("Parsing CSV...");
        const Papa = (await import("papaparse")).default;
        const text = await file.text();
        const result = Papa.parse(text, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          preview: MAX_ROWS, // Limit rows during parsing
        });

        if (result.errors.length > 0) {
          throw new Error(`CSV parsing error: ${result.errors[0]?.message || "Unknown error"}`);
        }

        data = result.data as Record<string, unknown>[];
        columns = result.meta.fields || [];
      } else if (fileType === "excel") {
        setProcessingStatus("Parsing Excel...");
        const XLSX = await import("xlsx");
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array", sheetRows: MAX_ROWS + 1 }); // +1 for header
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]!];

        if (!firstSheet) {
          throw new Error("Excel file has no sheets");
        }

        data = XLSX.utils.sheet_to_json(firstSheet) as Record<string, unknown>[];
        if (data.length > 0) {
          columns = Object.keys(data[0]!);
        }
      } else if (fileType === "json") {
        setProcessingStatus("Parsing JSON...");
        const text = await file.text();
        const parsed = JSON.parse(text);

        if (Array.isArray(parsed)) {
          data = parsed;
        } else if (typeof parsed === "object" && parsed !== null) {
          // Check for common wrapper patterns
          const keys = Object.keys(parsed);
          const arrayKey = keys.find(k => Array.isArray(parsed[k]));
          if (arrayKey) {
            data = parsed[arrayKey];
          } else {
            data = [parsed];
          }
        } else {
          throw new Error("JSON must be an array or object");
        }

        if (data.length > 0 && typeof data[0] === "object" && data[0] !== null) {
          columns = Object.keys(data[0] as object);
        }
      } else if (fileType === "parquet") {
        setProcessingStatus("Parsing Parquet...");
        const { parseParquetFile } = await import("@/lib/parquet-parser");
        const result = await parseParquetFile(file);
        data = result.rows;
        columns = result.columns.map(c => c.name);
      }

      if (data.length === 0) {
        throw new Error("File contains no data");
      }

      // Limit rows if necessary
      let truncated = false;
      if (data.length > MAX_ROWS) {
        data = data.slice(0, MAX_ROWS);
        truncated = true;
      }

      setProcessingStatus("Finalizing...");

      onFileUploaded({
        name: file.name,
        type: fileType,
        size: file.size,
        data,
        columns,
        truncated,
      });
    } catch (err) {
      console.error("[FileUpload] Error processing file:", err);
      setError(err instanceof Error ? err.message : "Failed to process file");
    } finally {
      setIsProcessing(false);
      setProcessingStatus("");
    }
  }, [onFileUploaded]);

  return { processFile, isProcessing, processingStatus, error, setError };
}

/**
 * Multi-file upload component with file list
 */
export function MultiFileUpload({
  onFileUploaded,
  onRemoveFile,
  onClearAll,
  uploadedFiles,
  disabled = false,
}: MultiFileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { processFile, isProcessing, processingStatus, error, setError: _setError } = useFileProcessor(onFileUploaded);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled || isProcessing) return;

    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  }, [disabled, isProcessing, processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !isProcessing) {
      setIsDragging(true);
    }
  }, [disabled, isProcessing]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // Reset input so same file can be selected again
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, [processFile]);

  const handleClick = useCallback(() => {
    if (!disabled && !isProcessing) {
      inputRef.current?.click();
    }
  }, [disabled, isProcessing]);

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={[...ACCEPTED_TYPES.csv, ...ACCEPTED_TYPES.excel, ...ACCEPTED_TYPES.json, ...ACCEPTED_TYPES.parquet].join(",")}
        onChange={handleFileSelect}
        style={{ display: "none" }}
      />

      {/* File list */}
      {uploadedFiles.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--foreground)" }}>
              {uploadedFiles.length} file{uploadedFiles.length > 1 ? "s" : ""} loaded
            </span>
            {uploadedFiles.length > 1 && (
              <button
                onClick={onClearAll}
                disabled={disabled}
                style={{
                  padding: "4px 8px",
                  background: "transparent",
                  border: "none",
                  borderRadius: 4,
                  cursor: disabled ? "not-allowed" : "pointer",
                  color: "var(--muted)",
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <X size={12} />
                Clear all
              </button>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {uploadedFiles.map((file) => {
              const FileIcon = getFileIcon(file.fileType);
              return (
                <div
                  key={file.tableName}
                  style={{
                    padding: 12,
                    background: "var(--card)",
                    border: "1px solid var(--success)",
                    borderRadius: "var(--radius)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 6,
                        background: "rgba(22, 163, 74, 0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <FileIcon size={16} style={{ color: "var(--success)" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, fontSize: 13, color: "var(--foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {file.fileName}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>
                        Table: <code style={{ background: "var(--accent)", padding: "0 4px", borderRadius: 2 }}>{file.tableName}</code> • {file.rowCount.toLocaleString()} rows • {file.columns.length} columns
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Check size={14} style={{ color: "var(--success)" }} />
                      <button
                        onClick={() => onRemoveFile(file.tableName)}
                        disabled={disabled}
                        style={{
                          padding: 4,
                          background: "transparent",
                          border: "none",
                          borderRadius: 4,
                          cursor: disabled ? "not-allowed" : "pointer",
                          color: "var(--muted)",
                        }}
                        title="Remove file"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add file area */}
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{
          padding: uploadedFiles.length > 0 ? 16 : 32,
          background: isDragging ? "var(--accent)" : "var(--card)",
          border: `2px dashed ${isDragging ? "var(--foreground)" : error ? "var(--destructive)" : "var(--border)"}`,
          borderRadius: "var(--radius)",
          textAlign: "center",
          cursor: disabled || isProcessing ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
          transition: "all 0.15s ease",
        }}
      >
        {isProcessing ? (
          <>
            <Loader2
              size={uploadedFiles.length > 0 ? 20 : 32}
              style={{
                margin: "0 auto 8px",
                color: "var(--primary)",
                animation: "spin 1s linear infinite",
              }}
            />
            <div style={{ fontSize: 13, color: "var(--foreground)", fontWeight: 500 }}>
              {processingStatus || "Processing file..."}
            </div>
          </>
        ) : (
          <>
            {uploadedFiles.length > 0 ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <Plus size={16} style={{ color: "var(--muted)" }} />
                <span style={{ fontSize: 13, color: "var(--muted)" }}>
                  Add another file
                </span>
              </div>
            ) : (
              <>
                <Upload
                  size={32}
                  style={{ margin: "0 auto 12px", color: "var(--muted)" }}
                />
                <div style={{ fontSize: 14, color: "var(--foreground)", marginBottom: 4 }}>
                  Drop a file here or click to browse
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  Supports CSV, Excel, JSON, and Parquet files
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>
                  Max: CSV/JSON 50MB, Excel 25MB, Parquet 100MB • Up to 100K rows per file
                </div>
              </>
            )}
          </>
        )}
      </div>

      {error && (
        <div
          style={{
            marginTop: 8,
            padding: "8px 12px",
            background: "rgba(220, 38, 38, 0.1)",
            border: "1px solid rgba(220, 38, 38, 0.3)",
            borderRadius: "var(--radius)",
            fontSize: 12,
            color: "var(--destructive)",
          }}
        >
          {error}
        </div>
      )}

      {/* Multi-file info */}
      {uploadedFiles.length > 0 && (
        <div style={{ marginTop: 12, fontSize: 11, color: "var(--muted)", textAlign: "center" }}>
          💡 Multiple files can be joined together using SQL. Each file becomes a table.
        </div>
      )}
    </div>
  );
}

/**
 * Single file upload component (backward compatible)
 */
export function FileUpload({
  onFileUploaded,
  onClear,
  uploadedFile,
  disabled = false,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { processFile, isProcessing, processingStatus, error } = useFileProcessor(onFileUploaded);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled || isProcessing) return;

    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  }, [disabled, isProcessing, processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !isProcessing) {
      setIsDragging(true);
    }
  }, [disabled, isProcessing]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // Reset input so same file can be selected again
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, [processFile]);

  const handleClick = useCallback(() => {
    if (!disabled && !isProcessing) {
      inputRef.current?.click();
    }
  }, [disabled, isProcessing]);

  if (uploadedFile) {
    const FileIcon = uploadedFile.type === "csv" ? FileSpreadsheet :
                     uploadedFile.type === "excel" ? FileSpreadsheet :
                     uploadedFile.type === "parquet" ? File :
                     FileJson;

    return (
      <div
        style={{
          padding: 16,
          background: "var(--card)",
          border: "1px solid var(--success)",
          borderRadius: "var(--radius)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              background: "rgba(22, 163, 74, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FileIcon size={20} style={{ color: "var(--success)" }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500, fontSize: 14, color: "var(--foreground)" }}>
              {uploadedFile.name}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              {formatFileSize(uploadedFile.size)} • {uploadedFile.data.length} rows • {uploadedFile.columns.length} columns
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Check size={16} style={{ color: "var(--success)" }} />
            <button
              onClick={onClear}
              style={{
                padding: 4,
                background: "transparent",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                color: "var(--muted)",
              }}
              title="Remove file"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Column preview */}
        <div style={{ marginTop: 12, fontSize: 12, color: "var(--muted)" }}>
          <div style={{ marginBottom: 4, fontWeight: 500 }}>Columns:</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {uploadedFile.columns.slice(0, 10).map((col) => (
              <span
                key={col}
                style={{
                  padding: "2px 8px",
                  background: "var(--accent)",
                  borderRadius: 4,
                  fontSize: 11,
                }}
              >
                {col}
              </span>
            ))}
            {uploadedFile.columns.length > 10 && (
              <span style={{ fontSize: 11, color: "var(--muted)" }}>
                +{uploadedFile.columns.length - 10} more
              </span>
            )}
          </div>
        </div>

        {/* Truncation warning */}
        {uploadedFile.truncated && (
          <div
            style={{
              marginTop: 12,
              padding: "8px 12px",
              background: "rgba(234, 179, 8, 0.1)",
              border: "1px solid rgba(234, 179, 8, 0.3)",
              borderRadius: "var(--radius)",
              fontSize: 12,
              color: "var(--warning)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <AlertTriangle size={14} />
            <span>
              Data truncated to {MAX_ROWS.toLocaleString()} rows. Original file may contain more rows.
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={[...ACCEPTED_TYPES.csv, ...ACCEPTED_TYPES.excel, ...ACCEPTED_TYPES.json, ...ACCEPTED_TYPES.parquet].join(",")}
        onChange={handleFileSelect}
        style={{ display: "none" }}
      />

      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{
          padding: 32,
          background: isDragging ? "var(--accent)" : "var(--card)",
          border: `2px dashed ${isDragging ? "var(--foreground)" : error ? "var(--destructive)" : "var(--border)"}`,
          borderRadius: "var(--radius)",
          textAlign: "center",
          cursor: disabled || isProcessing ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
          transition: "all 0.15s ease",
        }}
      >
        {isProcessing ? (
          <>
            <Loader2
              size={32}
              style={{
                margin: "0 auto 12px",
                color: "var(--primary)",
                animation: "spin 1s linear infinite",
              }}
            />
            <div style={{ fontSize: 14, color: "var(--foreground)", fontWeight: 500 }}>
              {processingStatus || "Processing file..."}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
              This may take a moment for large files
            </div>
          </>
        ) : (
          <>
            <Upload
              size={32}
              style={{ margin: "0 auto 12px", color: "var(--muted)" }}
            />
            <div style={{ fontSize: 14, color: "var(--foreground)", marginBottom: 4 }}>
              Drop a file here or click to browse
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              Supports CSV, Excel, JSON, and Parquet files
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>
              Max: CSV/JSON 50MB, Excel 25MB, Parquet 100MB • Up to 100K rows
            </div>
          </>
        )}
      </div>

      {error && (
        <div
          style={{
            marginTop: 8,
            padding: "8px 12px",
            background: "rgba(220, 38, 38, 0.1)",
            border: "1px solid rgba(220, 38, 38, 0.3)",
            borderRadius: "var(--radius)",
            fontSize: 12,
            color: "var(--destructive)",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
