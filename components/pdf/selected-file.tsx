import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatFileSize } from "@/lib/utils";

type SelectedFileProps = {
  name: string;
  size: number;
  pageCount?: number;
  extra?: string;
  onClear?: () => void;
  disabled?: boolean;
};

export function SelectedFile({
  name,
  size,
  pageCount,
  extra,
  onClear,
  disabled,
}: SelectedFileProps) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border bg-card p-4">
      <div className="flex min-w-0 items-start gap-3">
        <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary" />

        <div className="min-w-0">
          <p className="truncate font-medium">{name}</p>

          <p className="text-sm text-muted-foreground">
            {formatFileSize(size)}
            {pageCount !== undefined ? ` · ${pageCount} page${pageCount === 1 ? "" : "s"}` : ""}
            {extra ? ` · ${extra}` : ""}
          </p>
        </div>
      </div>

      {onClear && (
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={onClear}
        >
          Remove
        </Button>
      )}
    </div>
  );
}