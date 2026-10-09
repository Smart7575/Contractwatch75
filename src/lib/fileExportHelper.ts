import { isAppleTouchDevice } from './pdfReportGenerator';

export interface FileExportOptions {
  filename: string;
  content: string | Blob;
  mimeType: string;
  title?: string;
}

export interface FileExportResult {
  success: boolean;
  shared: boolean;
  blob: Blob;
  blobUrl: string;
  rawText?: string;
  isIpad: boolean;
}

/**
 * Universal file export helper that supports Desktop, iPad, and iOS Safari.
 * When sharing on iOS / iPadOS, ONLY pass the file in `files: [file]`.
 * Never pass `title` or `text` alongside `files`, because iOS Safari
 * creates an extra unwanted .txt file containing the title string!
 */
export async function exportFile(options: FileExportOptions): Promise<FileExportResult> {
  const { filename, content, mimeType } = options;
  const isString = typeof content === 'string';
  const blob = isString ? new Blob([content], { type: mimeType }) : content;
  const rawText = isString ? content : undefined;
  const blobUrl = URL.createObjectURL(blob);
  const isIpad = isAppleTouchDevice();

  let shared = false;

  // On iPad / iOS / touch devices: use native Share Sheet if available
  if (isIpad && typeof navigator !== 'undefined' && navigator.canShare) {
    try {
      const file = new File([blob], filename, { type: mimeType });
      if (navigator.canShare({ files: [file] })) {
        // IMPORTANT: Only pass { files: [file] } without title or text
        // Passing title or text causes iOS Safari to export an extra unwanted .txt file!
        await navigator.share({
          files: [file],
        });
        shared = true;
        return { success: true, shared: true, blob, blobUrl, rawText, isIpad };
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User dismissed the iOS share sheet
        return { success: true, shared: false, blob, blobUrl, rawText, isIpad };
      }
      console.warn('Native share failed or dismissed:', err);
    }
  }

  // Desktop or non-iPad trigger: avoid dual-triggering programmatic download on iPad
  if (!isIpad) {
    try {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Keep blob URL alive for at least 2 minutes
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 120000);

      return { success: true, shared: false, blob, blobUrl, rawText, isIpad };
    } catch (err) {
      console.warn('Programmatic download trigger failed:', err);
      return { success: false, shared: false, blob, blobUrl, rawText, isIpad };
    }
  }

  return { success: true, shared: false, blob, blobUrl, rawText, isIpad };
}
