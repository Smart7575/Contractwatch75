import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
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

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error || new Error('Failed to encode blob'));
    reader.readAsDataURL(blob);
  });
}

function isShareCancellation(err: any): boolean {
  const name = String(err?.name || '').toLowerCase();
  const msg = String(err?.message || '').toLowerCase();
  return name === 'aborterror' || msg.includes('cancel') || msg.includes('dismiss');
}

/**
 * Share an existing Blob via Capacitor Filesystem + Share on native iOS/Android,
 * or Web Share API on iPad/iOS Safari.
 */
export async function shareExistingBlob(
  blob: Blob,
  filename: string,
  mimeType: string
): Promise<'shared' | 'cancelled' | 'unsupported'> {
  if (Capacitor.isNativePlatform()) {
    try {
      const base64Data = await blobToBase64(blob);
      await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Cache,
      });
      const { uri } = await Filesystem.getUri({
        directory: Directory.Cache,
        path: filename,
      });
      await Share.share({
        files: [uri],
      });
      return 'shared';
    } catch (err: any) {
      if (isShareCancellation(err)) {
        return 'cancelled';
      }
      console.warn('Capacitor native file share failed:', err);
      return 'unsupported';
    }
  }

  if (typeof navigator !== 'undefined' && navigator.canShare) {
    try {
      const file = new File([blob], filename, { type: mimeType });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] });
        return 'shared';
      }
    } catch (err: any) {
      if (isShareCancellation(err)) {
        return 'cancelled';
      }
      console.warn('Web Share API failed:', err);
    }
  }

  return 'unsupported';
}

/**
 * Universal file export helper that supports Capacitor Native (Filesystem + Share),
 * iPad / iOS Safari (Web Share API), and Desktop (<a download>).
 */
export async function exportFile(options: FileExportOptions): Promise<FileExportResult> {
  const { filename, content, mimeType } = options;
  const isString = typeof content === 'string';
  const blob = isString ? new Blob([content], { type: mimeType }) : content;
  const rawText = isString ? content : undefined;
  const blobUrl = URL.createObjectURL(blob);
  const isNative = Capacitor.isNativePlatform();
  const isIpad = isAppleTouchDevice() || isNative;

  if (isNative) {
    try {
      if (isString) {
        await Filesystem.writeFile({
          path: filename,
          data: content,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });
      } else {
        const base64Data = await blobToBase64(blob);
        await Filesystem.writeFile({
          path: filename,
          data: base64Data,
          directory: Directory.Cache,
        });
      }
      const { uri } = await Filesystem.getUri({
        directory: Directory.Cache,
        path: filename,
      });
      await Share.share({
        files: [uri],
      });
      return { success: true, shared: true, blob, blobUrl, rawText, isIpad: true };
    } catch (err: any) {
      if (isShareCancellation(err)) {
        return { success: true, shared: false, blob, blobUrl, rawText, isIpad: true };
      }
      console.warn('Capacitor export failed:', err);
      return { success: false, shared: false, blob, blobUrl, rawText, isIpad: true };
    }
  }

  // On iPad / iOS / touch devices: use native Web Share Sheet if available
  if (isIpad && typeof navigator !== 'undefined' && navigator.canShare) {
    try {
      const file = new File([blob], filename, { type: mimeType });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
        });
        return { success: true, shared: true, blob, blobUrl, rawText, isIpad };
      }
    } catch (err: any) {
      if (isShareCancellation(err)) {
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
