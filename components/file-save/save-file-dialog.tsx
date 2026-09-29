"use client";

import { useEffect, useRef, useState } from "react";
import {
  Download,
  FileText,
  FileSpreadsheet,
  FileArchive,
  Image as ImageIcon,
  Presentation,
  File as FileGeneric,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useT } from "@/components/i18n/language-provider";
import {
  type SaveFileRequest,
  registerSaveFileListener,
  splitFileName,
  buildFinalFileName,
  saveBlobNative,
  formatFileSize,
} from "@/lib/utils";

type FileFormatMeta = {
  label: string;
  badgeClass: string;
  icon: React.ComponentType<{ className?: string }>;
};

function getFileFormatMeta(ext: string, mimeType: string): FileFormatMeta {
  const cleanExt = ext.toLowerCase();

  if (cleanExt === ".pdf" || mimeType.includes("pdf")) {
    return {
      label: "PDF Document",
      badgeClass: "text-red-500 bg-red-500/10 border-red-500/20",
      icon: FileText,
    };
  }

  if (cleanExt === ".xlsx" || cleanExt === ".xls" || mimeType.includes("spreadsheet") || mimeType.includes("excel")) {
    return {
      label: "Excel Spreadsheet",
      badgeClass: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
      icon: FileSpreadsheet,
    };
  }

  if (cleanExt === ".docx" || cleanExt === ".doc" || mimeType.includes("word") || mimeType.includes("officedocument.wordprocessingml")) {
    return {
      label: "Word Document",
      badgeClass: "text-blue-500 bg-blue-500/10 border-blue-500/20",
      icon: FileText,
    };
  }

  if (cleanExt === ".pptx" || cleanExt === ".ppt" || mimeType.includes("presentation") || mimeType.includes("powerpoint")) {
    return {
      label: "PowerPoint Presentation",
      badgeClass: "text-amber-500 bg-amber-500/10 border-amber-500/20",
      icon: Presentation,
    };
  }

  if (cleanExt === ".zip" || mimeType.includes("zip") || mimeType.includes("archive")) {
    return {
      label: "ZIP Archive",
      badgeClass: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20",
      icon: FileArchive,
    };
  }

  if (
    cleanExt === ".png" ||
    cleanExt === ".jpg" ||
    cleanExt === ".jpeg" ||
    cleanExt === ".webp" ||
    mimeType.startsWith("image/")
  ) {
    return {
      label: "Image",
      badgeClass: "text-purple-500 bg-purple-500/10 border-purple-500/20",
      icon: ImageIcon,
    };
  }

  return {
    label: "File",
    badgeClass: "text-primary bg-primary/10 border-primary/20",
    icon: FileGeneric,
  };
}

export function SaveFileDialog() {
  const t = useT();
  const [request, setRequest] = useState<SaveFileRequest | null>(null);
  const [userBaseName, setUserBaseName] = useState("");
  const [extension, setExtension] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Register listener for download interceptor
  useEffect(() => {
    registerSaveFileListener((req) => {
      setRequest(req);
    });

    return () => {
      registerSaveFileListener(null);
    };
  }, []);

  // When a new download request arrives, extract initial name and pre-select text
  useEffect(() => {
    if (request) {
      const { baseName, extension: ext } = splitFileName(request.suggestedName);
      setUserBaseName(baseName);
      setExtension(ext);

      // Focus and select the text for fast rename
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [request]);

  const computedFinalName = buildFinalFileName(userBaseName, extension);

  const handleSave = () => {
    if (!request) return;
    const finalName = buildFinalFileName(userBaseName, extension);

    try {
      saveBlobNative(request.blob, finalName);
      toast.success(t("success.downloaded"));
      request.resolve(true);
    } catch (err) {
      console.error("Download failed:", err);
      toast.error("Download failed to start.");
      request.resolve(false);
    } finally {
      setRequest(null);
    }
  };

  const handleCancel = () => {
    if (!request) return;
    request.resolve(false);
    setRequest(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  if (!request) return null;

  const meta = getFileFormatMeta(extension, request.blob.type);
  const IconComponent = meta.icon;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={handleCancel}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-slide-in text-card-foreground"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={handleCancel}
          className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header with Type Icon */}
        <div className="flex items-center gap-3.5 mb-4">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${meta.badgeClass}`}>
            <IconComponent className="h-6 w-6" />
          </div>
          <div>
            <h2 id="save-dialog-title" className="text-lg font-semibold tracking-tight leading-snug">
              {t("saveDialog.title")}
            </h2>
            <p className="text-xs text-muted-foreground leading-normal">
              {t("saveDialog.subtitle")}
            </p>
          </div>
        </div>

        {/* File Meta Pill */}
        <div className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2 text-xs mb-4">
          <span className="font-medium text-foreground">{meta.label}</span>
          <span className="text-muted-foreground font-mono">{formatFileSize(request.blob.size)}</span>
        </div>

        {/* Filename Input */}
        <div className="space-y-2 mb-5">
          <Label htmlFor="save-file-name-input" className="text-xs font-medium text-foreground">
            {t("saveDialog.fileNameLabel")}
          </Label>
          <div className="flex items-center rounded-lg border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent px-3 py-1.5 transition-shadow">
            <input
              id="save-file-name-input"
              ref={inputRef}
              type="text"
              value={userBaseName}
              onChange={(e) => setUserBaseName(e.target.value)}
              placeholder="filename"
              className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground min-w-0"
              autoComplete="off"
              spellCheck={false}
            />
            {extension && (
              <span className="ml-2 shrink-0 select-none rounded bg-muted px-2 py-0.5 text-xs font-mono font-medium text-muted-foreground">
                {extension}
              </span>
            )}
          </div>

          {/* Live Preview */}
          <p className="text-[11px] text-muted-foreground truncate">
            {t("saveDialog.previewLabel")}: <span className="font-semibold text-foreground">{computedFinalName}</span>
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-1">
          <Button type="button" variant="outline" size="sm" onClick={handleCancel} className="min-w-20">
            {t("saveDialog.cancel")}
          </Button>
          <Button type="button" variant="default" size="sm" onClick={handleSave} className="min-w-24 gap-1.5">
            <Download className="h-4 w-4" />
            {t("saveDialog.save")}
          </Button>
        </div>
      </div>
    </div>
  );
}
