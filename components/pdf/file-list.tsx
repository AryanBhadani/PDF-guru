"use client";

import { ArrowDown, ArrowUp, FileText, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatFileSize } from "@/lib/utils";

export type ListedFile = {
  id: string;
  name: string;
  size: number;
  extra?: string;
};

type FileListProps = {
  files: ListedFile[];
  onMove: (id: string, direction: -1 | 1) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  disabled?: boolean;
};

export function FileList({ files, onMove, onRemove, onClear, disabled }: FileListProps) {
  if (files.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{files.length} file{files.length === 1 ? "" : "s"}</p>
        <Button variant="ghost" size="sm" onClick={onClear} disabled={disabled}>
          <X className="h-4 w-4" />
          Clear all
        </Button>
      </div>
      <ul className="space-y-2">
        {files.map((file, index) => (
          <li
            key={file.id}
            className="flex items-center gap-3 rounded-lg border bg-card p-3"
          >
            <FileText className="h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(file.size)}
                {file.extra ? ` · ${file.extra}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                disabled={disabled || index === 0}
                aria-label="Move up"
                onClick={() => onMove(file.id, -1)}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                disabled={disabled || index === files.length - 1}
                aria-label="Move down"
                onClick={() => onMove(file.id, 1)}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                disabled={disabled}
                aria-label="Remove file"
                onClick={() => onRemove(file.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
