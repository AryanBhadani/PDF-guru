"use client";

import { useCallback, useRef, useState } from "react";
import { Images, Upload } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MAX_FILE_SIZE_BYTES } from "@/lib/constants";
import { isAllowedFile } from "@/lib/file-type";
import { useT } from "@/components/i18n/language-provider";

type FileUploadProps = {
  accept: string;
  multiple?: boolean;
  disabled?: boolean;
  title: string;
  hint: string;
  onFiles: (files: File[]) => void;
  maxSize?: number;
  allowedTypes?: string[];
  showGalleryButton?: boolean;
};

export function FileUpload({
  accept,
  multiple = true,
  disabled,
  title,
  hint,
  onFiles,
  maxSize = MAX_FILE_SIZE_BYTES,
  allowedTypes,
  showGalleryButton = false,
}: FileUploadProps) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = useCallback(
    async (list: FileList | File[]) => {
      const incoming = Array.from(list);
      if (incoming.length === 0) return;

      const valid: File[] = [];
      for (const file of incoming) {
        if (file.size > maxSize) {
          toast.error(
            t("upload.tooLarge", {
              name: file.name,
              mb: Math.round(maxSize / (1024 * 1024)),
            })
          );
          continue;
        }
        if (file.size === 0) {
          toast.error(t("upload.empty", { name: file.name }));
          continue;
        }

        const allowed = await isAllowedFile(file, allowedTypes);
        if (!allowed) {
          toast.error(t("upload.unsupported", { name: file.name }));
          continue;
        }

        valid.push(file);
      }

      if (valid.length > 0) onFiles(valid);
    },
    [allowedTypes, maxSize, onFiles, t]
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        if (!disabled) void handleFiles(event.dataTransfer.files);
      }}
      className={cn(
        "flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors",
        dragging ? "border-primary bg-accent" : "border-border bg-card hover:border-primary/50",
        disabled && "pointer-events-none opacity-60"
      )}
    >
      <Upload className="mb-3 h-8 w-8 text-primary" />
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
      {showGalleryButton && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            galleryInputRef.current?.click();
          }}
          disabled={disabled}
          className="mt-3 flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 disabled:pointer-events-none disabled:opacity-50 transition-colors"
        >
          <Images className="h-4 w-4" />
          Choose from Gallery
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        disabled={disabled}
        onChange={(event) => {
          if (event.target.files) void handleFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        disabled={disabled}
        onChange={(event) => {
          if (event.target.files) void handleFiles(event.target.files);
          event.target.value = "";
        }}
      />
    </div>
  );
}
