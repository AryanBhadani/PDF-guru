"use client";

import { useState } from "react";
import { Combine } from "lucide-react";
import { toast } from "sonner";
import { PdfToolLayout } from "@/components/pdf/pdf-tool-layout";
import { FileUpload } from "@/components/pdf/file-upload";
import { FileList } from "@/components/pdf/file-list";
import { DownloadButton } from "@/components/pdf/download-button";
import { EmptyState } from "@/components/pdf/empty-state";
import { MAX_PDF_COUNT, PDF_MIME_TYPE } from "@/lib/constants";
import { downloadPdf, getPdfPageCount, mergePdfs } from "@/lib/pdf";
import { createId, useFileQueue } from "@/hooks/use-file-queue";
import type { PdfFileItem } from "@/types/pdf";

export function MergePdfClient() {
  const { items, add, remove, clear, move } = useFileQueue<PdfFileItem>();
  const [loading, setLoading] = useState(false);

  const handleFiles = async (files: File[]) => {
    if (items.length + files.length > MAX_PDF_COUNT) {
      toast.error(`You can merge up to ${MAX_PDF_COUNT} PDFs.`);
      return;
    }

    const next: PdfFileItem[] = [];
    for (const file of files) {
      try {
        const pageCount = await getPdfPageCount(file);
        next.push({
          id: createId(),
          file,
          name: file.name,
          size: file.size,
          pageCount,
        });
      } catch (error) {
        toast.error(error instanceof Error ? `${file.name}: ${error.message}` : `"${file.name}" could not be read.`);
      }
    }

    if (next.length > 0) {
      add(next);
      toast.success(`${next.length} PDF${next.length === 1 ? "" : "s"} added.`);
    }
  };

  const merge = async () => {
    if (items.length < 1) {
      toast.error("Upload at least one PDF.");
      return;
    }
    setLoading(true);
    try {
      const bytes = await mergePdfs(items.map((item) => item.file));
      downloadPdf(bytes, "pdf-guru-merged.pdf");
      toast.success("Merged PDF ready.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not merge PDFs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PdfToolLayout
      title="Merge PDF"
      description="Upload PDFs, reorder them, and download a single combined file."
    >
      <div className="space-y-6">
        <FileUpload
          accept="application/pdf,.pdf"
          title="Drop PDF files here"
          hint="PDF only · up to 50 MB each"
          disabled={loading}
          allowedTypes={[PDF_MIME_TYPE]}
          onFiles={handleFiles}
        />
        {items.length === 0 ? (
          <EmptyState
            icon={<Combine className="h-8 w-8" />}
            title="No PDFs yet"
            hint="Add two or more files to merge them."
          />
        ) : (
          <FileList
            files={items.map((item) => ({
              id: item.id,
              name: item.name,
              size: item.size,
              extra: item.pageCount ? `${item.pageCount} pages` : undefined,
            }))}
            onMove={move}
            onRemove={remove}
            onClear={clear}
            disabled={loading}
          />
        )}
        <DownloadButton
          label="Merge PDFs"
          loadingLabel="Merging…"
          loading={loading}
          disabled={items.length === 0}
          onClick={merge}
        />
      </div>
    </PdfToolLayout>
  );
}
