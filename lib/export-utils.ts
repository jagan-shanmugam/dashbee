import html2canvas from "html2canvas";

/**
 * Export options for PNG export
 */
export interface PngExportOptions {
  /** Scale factor for resolution (1 = 100%, 2 = 200%, etc.). Default: 3 for high quality */
  scale?: number;
  /** Background color (null for transparent). Default: resolves from theme */
  backgroundColor?: string | null;
  /** Whether to use retina scaling on top of scale factor. Default: true */
  useDevicePixelRatio?: boolean;
}

/**
 * Export options for SVG export
 */
export interface SvgExportOptions {
  /** Whether to inline all computed styles. Default: true */
  inlineStyles?: boolean;
  /** Whether to resolve CSS variables to actual values. Default: true */
  resolveCssVariables?: boolean;
  /** Background color to embed. Default: null (transparent) */
  backgroundColor?: string | null;
}

/**
 * Download a file with the given content
 */
function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Get the resolved background color from the current theme
 */
function getThemeBackgroundColor(): string {
  const root = document.documentElement;
  const bgColor = getComputedStyle(root).getPropertyValue("--background").trim();
  // If it's an HSL value like "0 0% 100%", convert to proper CSS
  if (bgColor && !bgColor.startsWith("#") && !bgColor.startsWith("rgb")) {
    return `hsl(${bgColor})`;
  }
  return bgColor || "#ffffff";
}

/**
 * Resolve a CSS variable to its computed value
 */
function resolveCssVariable(value: string, element?: Element): string {
  if (!value.includes("var(")) return value;

  const match = value.match(/var\((--[^,)]+)(?:,\s*([^)]+))?\)/);
  if (!match) return value;

  const [, varName, fallback] = match;
  const root = element || document.documentElement;
  const resolved = getComputedStyle(root).getPropertyValue(varName || "").trim();

  if (resolved) {
    // Handle HSL values
    if (!resolved.startsWith("#") && !resolved.startsWith("rgb") && !resolved.startsWith("hsl")) {
      // Check if it looks like HSL values (e.g., "0 0% 100%")
      if (/^\d/.test(resolved)) {
        return `hsl(${resolved})`;
      }
    }
    return resolved;
  }

  return fallback || value;
}

/**
 * Export an HTML element as PNG image with enhanced quality options
 */
export async function exportToPng(
  element: HTMLElement,
  filename: string,
  options: PngExportOptions = {},
): Promise<void> {
  const {
    scale = 3, // Higher default for better quality
    backgroundColor = getThemeBackgroundColor(),
    useDevicePixelRatio = true,
  } = options;

  // Calculate effective scale
  const devicePixelRatio = useDevicePixelRatio ? window.devicePixelRatio || 1 : 1;
  const effectiveScale = scale * devicePixelRatio;

  const canvas = await html2canvas(element, {
    backgroundColor: backgroundColor,
    scale: effectiveScale,
    logging: false,
    useCORS: true, // Handle cross-origin images
    allowTaint: true,
  });

  canvas.toBlob((blob) => {
    if (blob) {
      downloadFile(blob, filename);
    }
  }, "image/png", 1.0); // Maximum quality
}

/**
 * Recursively inline computed styles on an SVG element and its children
 */
function inlineStylesRecursive(
  originalElement: Element,
  clonedElement: Element,
  resolveVariables: boolean,
): void {
  const computed = getComputedStyle(originalElement);

  // Important SVG style properties to inline
  const svgStyleProps = [
    "fill",
    "stroke",
    "stroke-width",
    "stroke-linecap",
    "stroke-linejoin",
    "stroke-dasharray",
    "stroke-opacity",
    "fill-opacity",
    "opacity",
    "font-family",
    "font-size",
    "font-weight",
    "font-style",
    "text-anchor",
    "dominant-baseline",
    "alignment-baseline",
    "letter-spacing",
    "color",
  ];

  svgStyleProps.forEach((prop) => {
    let value = computed.getPropertyValue(prop);
    if (value && value !== "none" && value !== "normal" && value !== "auto") {
      // Resolve CSS variables if needed
      if (resolveVariables) {
        value = resolveCssVariable(value, originalElement);
      }
      (clonedElement as HTMLElement | SVGElement).style?.setProperty(prop, value);
    }
  });

  // Process children
  const originalChildren = originalElement.children;
  const clonedChildren = clonedElement.children;

  for (let i = 0; i < originalChildren.length; i++) {
    const originalChild = originalChildren[i];
    const clonedChild = clonedChildren[i];
    if (originalChild && clonedChild) {
      inlineStylesRecursive(originalChild, clonedChild, resolveVariables);
    }
  }
}

/**
 * Export an SVG element as SVG file with enhanced quality
 */
export function exportToSvg(
  svgElement: SVGElement,
  filename: string,
  options: SvgExportOptions = {},
): void {
  const {
    inlineStyles = true,
    resolveCssVariables = true,
    backgroundColor = null,
  } = options;

  // Clone the SVG to avoid modifying the original
  const clone = svgElement.cloneNode(true) as SVGElement;

  // Add XML declaration and namespace if not present
  if (!clone.getAttribute("xmlns")) {
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  }
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");

  // Get dimensions from the original SVG
  const width = svgElement.getAttribute("width") || svgElement.getBoundingClientRect().width;
  const height = svgElement.getAttribute("height") || svgElement.getBoundingClientRect().height;

  if (!clone.getAttribute("viewBox") && width && height) {
    clone.setAttribute("viewBox", `0 0 ${width} ${height}`);
  }
  if (width) clone.setAttribute("width", String(width));
  if (height) clone.setAttribute("height", String(height));

  // Add background rectangle if backgroundColor is specified
  if (backgroundColor) {
    const bgRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bgRect.setAttribute("width", "100%");
    bgRect.setAttribute("height", "100%");
    bgRect.setAttribute("fill", backgroundColor);
    clone.insertBefore(bgRect, clone.firstChild);
  }

  // Inline all computed styles recursively
  if (inlineStyles) {
    inlineStylesRecursive(svgElement, clone, resolveCssVariables);
  }

  // Create a style element with base font definitions
  const styleElement = document.createElementNS("http://www.w3.org/2000/svg", "style");
  styleElement.textContent = `
    text { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  `;
  clone.insertBefore(styleElement, clone.firstChild);

  // Serialize with XML declaration
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clone);
  const fullSvg = '<?xml version="1.0" encoding="UTF-8"?>\n' + svgString;

  const blob = new Blob([fullSvg], { type: "image/svg+xml;charset=utf-8" });
  downloadFile(blob, filename);
}

/**
 * Export data as CSV file
 */
export function exportToCsv(
  data: Record<string, unknown>[],
  filename: string,
): void {
  if (!data || data.length === 0) {
    console.warn("No data to export");
    return;
  }

  const firstRow = data[0];
  if (!firstRow) {
    console.warn("No data to export");
    return;
  }

  // Get headers from first row
  const headers = Object.keys(firstRow);

  // Build CSV content
  const csvRows: string[] = [];

  // Add header row
  csvRows.push(headers.map(escapeCSVValue).join(","));

  // Add data rows
  for (const row of data) {
    const values = headers.map((header) => {
      const value = row[header];
      return escapeCSVValue(String(value ?? ""));
    });
    csvRows.push(values.join(","));
  }

  const csvContent = csvRows.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  downloadFile(blob, filename);
}

/**
 * Escape a value for CSV (handle commas, quotes, newlines)
 */
function escapeCSVValue(value: string): string {
  // If value contains comma, quote, or newline, wrap in quotes and escape inner quotes
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Copy an HTML element as image to clipboard with enhanced quality
 */
export async function copyToClipboard(
  element: HTMLElement,
  options: PngExportOptions = {},
): Promise<boolean> {
  try {
    const {
      scale = 3,
      backgroundColor = getThemeBackgroundColor(),
      useDevicePixelRatio = true,
    } = options;

    const devicePixelRatio = useDevicePixelRatio ? window.devicePixelRatio || 1 : 1;
    const effectiveScale = scale * devicePixelRatio;

    const canvas = await html2canvas(element, {
      backgroundColor: backgroundColor,
      scale: effectiveScale,
      logging: false,
      useCORS: true,
      allowTaint: true,
    });

    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        if (blob) {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ "image/png": blob }),
            ]);
            resolve(true);
          } catch (err) {
            console.error("Failed to copy to clipboard:", err);
            resolve(false);
          }
        } else {
          resolve(false);
        }
      }, "image/png", 1.0);
    });
  } catch (err) {
    console.error("Failed to create canvas for clipboard:", err);
    return false;
  }
}

/**
 * Generate a sanitized filename from a title
 */
export function sanitizeFilename(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Export options for full dashboard export
 */
export interface DashboardExportOptions {
  /** Title to include in the export */
  title?: string;
  /** Scale factor for quality */
  scale?: number;
  /** Include timestamp in filename */
  includeTimestamp?: boolean;
  /** Background color */
  backgroundColor?: string;
}

/**
 * Export an entire dashboard container as PNG
 */
export async function exportDashboardToPng(
  dashboardElement: HTMLElement,
  options: DashboardExportOptions = {},
): Promise<void> {
  const {
    title = "dashboard",
    scale = 2,
    includeTimestamp = true,
    backgroundColor = getThemeBackgroundColor(),
  } = options;

  const timestamp = includeTimestamp
    ? `-${new Date().toISOString().slice(0, 10)}`
    : "";
  const filename = `${sanitizeFilename(title)}${timestamp}.png`;

  await exportToPng(dashboardElement, filename, {
    scale,
    backgroundColor,
    useDevicePixelRatio: true,
  });
}

/**
 * Export an entire dashboard container as PDF
 * Note: Requires jspdf to be installed. Import dynamically to avoid bundle size impact.
 */
export async function exportDashboardToPdf(
  dashboardElement: HTMLElement,
  options: DashboardExportOptions = {},
): Promise<void> {
  const {
    title = "dashboard",
    scale = 2,
    includeTimestamp = true,
    backgroundColor = getThemeBackgroundColor(),
  } = options;

  // Dynamically import jspdf to reduce initial bundle size
  const { default: jsPDF } = await import("jspdf");

  const timestamp = includeTimestamp
    ? `-${new Date().toISOString().slice(0, 10)}`
    : "";
  const filename = `${sanitizeFilename(title)}${timestamp}.pdf`;

  // Create canvas from dashboard
  const canvas = await html2canvas(dashboardElement, {
    backgroundColor,
    scale: scale * (window.devicePixelRatio || 1),
    logging: false,
    useCORS: true,
    allowTaint: true,
  });

  // Calculate PDF dimensions (A4 is 210mm x 297mm)
  const imgWidth = 210;
  const pageHeight = 297;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  // Create PDF with appropriate orientation
  const orientation = imgHeight > pageHeight ? "portrait" : "landscape";
  const pdf = new jsPDF({
    orientation,
    unit: "mm",
    format: "a4",
  });

  // Handle multi-page PDFs for tall dashboards
  let heightLeft = imgHeight;
  let position = 0;
  const imgData = canvas.toDataURL("image/png", 1.0);

  // Add first page
  pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  // Add subsequent pages if needed
  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(filename);
}
