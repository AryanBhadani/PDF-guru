"use client";

import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type DownloadButtonProps = {
  label: string;
  loadingLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
};

export function DownloadButton({
  label,
  loadingLabel = "Working…",
  loading,
  disabled,
  onClick,
}: DownloadButtonProps) {
  return (
    <Button size="lg" className="min-h-11 w-full sm:w-auto" disabled={disabled || loading} onClick={onClick}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      {loading ? loadingLabel : label}
    </Button>
  );
}
