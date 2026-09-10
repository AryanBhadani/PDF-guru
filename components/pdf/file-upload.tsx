"use client";

import { useCallback, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MAX_FILE_SIZE_BYTES } from "@/lib/constants";

type FileUploadProps = {
  accept: string;
  multiple?: boolean;
  disabled?: boolean;
  title: string;
  hint: string;
  onFiles: (files: File[]) => void;
  maxSize?: number;
  allowedTypes?: string[];
};

function isAllowed(file: File, allowedTypes?: string[]): boolean {
  if (!allowedTypes || allowedTypes.length === 0) return true;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();

  return allowedTypes.some((allowed) => {
    const normalized = allowed.toLowerCase();
    if (type && type === normalized) return true;
    if (normalized === "image/jpeg" && (type === "image/jpg" || name.endsWith(".jpg") || name.endsWith(".jpeg"))) {
      return true;
    }
    if (normalized === "image/png" && name.endsWith(".png")) return true;
    if (normalized === "image/webp" && name.endsWith(".webp")) return true;
    if (normalized === "application/pdf" && name.endsWith(".pdf")) return true;
    return false;
  });
}

export function FileUpload({
  accept,
  multiple = true,
  disabled,
  title,
  hint,
  onFiles,
  maxSize = MAX_FILE_SIZE_BYTES,
  allowedTypes,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = useCallback(
    (list: FileList | File[]) => {
      const incoming = Array.from(list);
      if (incoming.length === 0) return;

      const valid: File[] = [];
      for (const file of incoming) {
        if (!isAllowed(file, allowedTypes)) {
          toast.error(`"${file.name}" is not a supported file type.`);
          continue;
        }
        if (file.size > maxSize) {
          toast.error(`"${file.name}" is larger than ${Math.round(maxSize / (1024 * 1024))} MB.`);
          continue;
        }
        if (file.size === 0) {
          toast.error(`"${file.name}" is empty.`);
          continue;
        }
        valid.push(file);
      }

      if (valid.length > 0) onFiles(valid);
    },
    [allowedTypes, maxSize, onFiles]
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
        if (!disabled) handleFiles(event.dataTransfer.files);
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
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        disabled={disabled}
        onChange={(event) => {
          if (event.target.files) handleFiles(event.target.files);
          event.target.value = "";
        }}
      />
    </div>
  );
}
