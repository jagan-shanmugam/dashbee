"use client";

import { useState } from "react";
import {
  Download,
  FileCode,
  FileSpreadsheet,
  Copy,
  Maximize2,
  Check,
} from "lucide-react";
import { ColorPicker } from "./color-picker";

export interface ChartActionsProps {
  onExportPng: () => Promise<void> | void;
  onExportSvg?: () => void;
  onExportCsv: () => void;
  onCopy: () => Promise<boolean> | boolean;
  onFullscreen: () => void;
  disabled?: boolean;
  /** Current color palette name */
  colorPalette?: string;
  /** Callback when color palette is changed */
  onColorPaletteChange?: (palette: string) => void;
}

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  showSuccess?: boolean;
}

function ActionButton({
  icon,
  label,
  onClick,
  disabled,
  showSuccess,
}: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 28,
        height: 28,
        padding: 0,
        background: "transparent",
        border: "none",
        borderRadius: 4,
        cursor: disabled ? "not-allowed" : "pointer",
        color: showSuccess ? "var(--success)" : "var(--muted)",
        opacity: disabled ? 0.5 : 1,
        transition: "all 0.15s ease",
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = "var(--border)";
          e.currentTarget.style.color = "var(--foreground)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = showSuccess
          ? "var(--success)"
          : "var(--muted)";
      }}
    >
      {icon}
    </button>
  );
}

export function ChartActions({
  onExportPng,
  onExportSvg,
  onExportCsv,
  onCopy,
  onFullscreen,
  disabled = false,
  colorPalette,
  onColorPaletteChange,
}: ChartActionsProps) {
  const [copySuccess, setCopySuccess] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleCopy = async () => {
    if (disabled || isExporting) return;
    setIsExporting(true);
    try {
      const result = await onCopy();
      if (result) {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPng = async () => {
    if (disabled || isExporting) return;
    setIsExporting(true);
    try {
      await onExportPng();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 2,
      }}
    >
      <ActionButton
        icon={<Download size={14} />}
        label="Export PNG"
        onClick={handleExportPng}
        disabled={disabled || isExporting}
      />
      {onExportSvg && (
        <ActionButton
          icon={<FileCode size={14} />}
          label="Export SVG"
          onClick={onExportSvg}
          disabled={disabled || isExporting}
        />
      )}
      <ActionButton
        icon={<FileSpreadsheet size={14} />}
        label="Export CSV"
        onClick={onExportCsv}
        disabled={disabled || isExporting}
      />
      <ActionButton
        icon={copySuccess ? <Check size={14} /> : <Copy size={14} />}
        label={copySuccess ? "Copied!" : "Copy to clipboard"}
        onClick={handleCopy}
        disabled={disabled || isExporting}
        showSuccess={copySuccess}
      />
      {colorPalette && onColorPaletteChange && (
        <ColorPicker
          currentPalette={colorPalette}
          onPaletteChange={onColorPaletteChange}
          disabled={disabled}
        />
      )}
      <ActionButton
        icon={<Maximize2 size={14} />}
        label="Fullscreen"
        onClick={onFullscreen}
        disabled={disabled}
      />
    </div>
  );
}
