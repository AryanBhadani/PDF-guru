"use client";

import { useState } from "react";
import { Presentation } from "lucide-react";
import { toast } from "sonner";
import { PdfToolLayout } from "@/components/pdf/pdf-tool-layout";
import { FileUpload } from "@/components/pdf/file-upload";
import { DownloadButton } from "@/components/pdf/download-button";
import { EmptyState } from "@/components/pdf/empty-state";
import { ProgressBar } from "@/components/pdf/progress-bar";
import { SelectedFile } from "@/components/pdf/selected-file";
import { PDF_MIME_TYPE } from "@/lib/constants";
import { getPdfPageCount } from "@/lib/pdf";
import { downloadBlob } from "@/lib/utils";

export function PdfToPptClient() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const handleFiles = async (files: File[]) => {
    const next = files[0];
    if (!next) return;
    try {
      const count = await getPdfPageCount(next);
      setFile(next);
      setPageCount(count);
      setProgress({ current: 0, total: 0 });
      toast.success(`Loaded ${count} page${count === 1 ? "" : "s"}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not read this PDF.");
    }
  };

  const convert = async () => {
    if (!file || loading) {
      if (!file) toast.error("Upload a PDF first.");
      return;
    }
    setLoading(true);
    setProgress({ current: 0, total: pageCount });
    try {
      const { convertPdfToPptx } = await import("@/lib/pdf-to-ppt");
      const blob = await convertPdfToPptx(file, (current, total) => setProgress({ current, total }));
      const name = file.name.replace(/\.pdf$/i, "") || "pdf-guru";
      downloadBlob(blob, `${name}.pptx`);
      toast.success("PowerPoint ready.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not convert this PDF.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PdfToolLayout
      title="PDF to PPT"
      description="Each PDF page becomes a PowerPoint slide. Conversion runs in your browser."
    >
      <div className="space-y-6">
        <FileUpload
          accept="application/pdf,.pdf"
          multiple={false}
          title="Drop a PDF here"
          hint="One PDF · each page becomes a slide"
          disabled={loading}
          allowedTypes={[PDF_MIME_TYPE]}
          onFiles={handleFiles}
        />
        {!file ? (
          <EmptyState
            icon={<Presentation className="h-8 w-8" />}
            title="No PDF selected"
            hint="Upload a document to create a PowerPoint file."
          />
        ) : (
          <>
            <SelectedFile
              name={file.name}
              size={file.size}
              extra={`${pageCount} page${pageCount === 1 ? "" : "s"}`}
              disabled={loading}
              onClear={() => {
                setFile(null);
                setPageCount(0);
              }}
            />
            {loading && (
              <ProgressBar current={progress.current} total={progress.total} label="Creating slides" />
            )}
            <DownloadButton
              label="Convert to PPTX"
              loadingLabel="Creating PowerPoint…"
              loading={loading}
              onClick={convert}
            />
          </>
        )}
      </div>
    </PdfToolLayout>
  );
}
