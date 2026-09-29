import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function createId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export type SaveFileRequest = {
  id: string;
  blob: Blob;
  suggestedName: string;
  resolve: (saved: boolean) => void;
};

type SaveFileListener = (request: SaveFileRequest) => void;

let saveFileListener: SaveFileListener | null = null;

export function registerSaveFileListener(listener: SaveFileListener | null) {
  saveFileListener = listener;
}

/**
 * Splits a full filename into base name and preserved extension.
 * e.g. "document.pdf" -> { baseName: "document", extension: ".pdf" }
 */
export function splitFileName(fullName: string): { baseName: string; extension: string } {
  const lastDotIndex = fullName.lastIndexOf(".");
  if (lastDotIndex <= 0 || lastDotIndex === fullName.length - 1) {
    return { baseName: fullName, extension: "" };
  }
  return {
    baseName: fullName.substring(0, lastDotIndex),
    extension: fullName.substring(lastDotIndex),
  };
}

/**
 * Sanitizes a filename, removing illegal characters across Windows/Android/macOS.
 */
export function sanitizeFileName(name: string): string {
  return name
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/[\x00-\x1f\x80-\x9f]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .trim();
}

/**
 * Builds the final filename with guaranteed extension preservation and duplicate extension prevention.
 */
export function buildFinalFileName(userBaseName: string, originalExtension: string): string {
  let cleanBase = sanitizeFileName(userBaseName);
  if (!cleanBase) {
    cleanBase = "file";
  }

  if (!originalExtension) {
    return cleanBase;
  }

  const ext = originalExtension.startsWith(".") ? originalExtension : `.${originalExtension}`;
  const extRegex = new RegExp(`${ext.replace(".", "\\.")}$`, "i");

  if (extRegex.test(cleanBase)) {
    return cleanBase;
  }

  return `${cleanBase}${ext}`;
}

/**
 * Triggers native browser download via anchor tag with 100% byte fidelity.
 */
export function saveBlobNative(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Universal download trigger. Intercepts download with the shared "Save File" dialog.
 * Returns Promise<boolean> resolving to true if saved, false if cancelled.
 */
export function downloadBlob(blob: Blob, filename: string): Promise<boolean> {
  if (saveFileListener) {
    return new Promise<boolean>((resolve) => {
      saveFileListener!({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        blob,
        suggestedName: filename,
        resolve,
      });
    });
  }

  // Fallback for headless environments or before modal mounts
  saveBlobNative(blob, filename);
  return Promise.resolve(true);
}

export function todayIsoDate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}
