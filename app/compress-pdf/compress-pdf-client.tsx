"use client";

import { useState } from "react";
import { Minimize2 } from "lucide-react";
import { toast } from "sonner";
import { PdfToolLayout } from "@/components/pdf/pdf-tool-layout";
import { FileUpload } from "@/components/pdf/file-upload";
import { DownloadButton } from "@/components/pdf/download-button";
import { EmptyState } from "@/components/pdf/empty-state";
import { ProgressBar } from "@/components/pdf/progress-bar";
import { SelectedFile } from "@/components/pdf/selected-file";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { PDF_MIME_TYPE } from "@/lib/constants";
import { downloadPdf, getPdfPageCount } from "@/lib/pdf";
import { formatFileSize } from "@/lib/utils";
import type { CompressLevel, CompressResult } from "@/types/conversion";

const LEVELS: Array<{ value: CompressLevel; label: string; hint: string }> = [
  { value: "low", label: "Low compression / High quality", hint: "Keeps more detail" },
  { value: "medium", label: "Medium", hint: "Balanced size and quality" },
  { value: "high", label: "High compression / Smaller file", hint: "Smaller file, lower quality" },
];

export function CompressPdfClient() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [level, setLevel] = useState<CompressLevel>("medium");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [result, setResult] = useState<CompressResult | null>(null);

  const handleFiles = async (files: File[]) => {
    const next = files[0];
    if (!next) return;
    try {
      const count = await getPdfPageCount(next);
      setFile(next);
      setPageCount(count);
      setResult(null);
      toast.success("PDF loaded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not read this PDF.");
    }
  };

  const compress = async () => {
    if (!file || loading) {
      if (!file) toast.error("Upload a PDF first.");
      return;
    }
    setLoading(true);
    setResult(null);
    setProgress({ current: 0, total: pageCount });
    try {
      const { compressPdf } = await import("@/lib/pdf-compress");
      const next = await compressPdf(file, level, (current, total) => setProgress({ current, total }));
      setResult(next);
      if (next.reduced) {
        toast.success(`Compressed by ${next.reductionPercent}%.`);
      } else {
        toast.message("This PDF could not be reduced further.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not compress this PDF.");
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    if (!result) return;
    const name = file?.name.replace(/\.pdf$/i, "") || "pdf-guru";
    downloadPdf(result.bytes, `${name}-compressed.pdf`);
  };

  return (
    <PdfToolLayout
      title="Compress PDF"
      description="Reduce file size in the browser. We show the real result, even if the file barely changes."
    >
      <div className="space-y-6">
        <FileUpload
          accept="application/pdf,.pdf"
          multiple={false}
          title="Drop a PDF to compress"
          hint="One PDF · up to 50 MB"
          disabled={loading}
          allowedTypes={[PDF_MIME_TYPE]}
          onFiles={handleFiles}
        />
        {!file ? (
          <EmptyState
            icon={<Minimize2 className="h-8 w-8" />}
            title="No PDF selected"
            hint="Upload a document to compress it."
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
                setResult(null);
              }}
            />
            <div className="grid gap-2 max-w-md">
              <Label htmlFor="level">Compression level</Label>
              <NativeSelect
                id="level"
                value={level}
                disabled={loading}
                onChange={(event) => setLevel(event.target.value as CompressLevel)}
              >
                {LEVELS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </NativeSelect>
              <p className="text-xs text-muted-foreground">
                {LEVELS.find((item) => item.value === level)?.hint}
              </p>
            </div>
            {loading && <ProgressBar current={progress.current} total={progress.total} label="Compressing" />}
            <DownloadButton
              label="Compress PDF"
              loadingLabel="Compressing…"
              loading={loading}
              onClick={compress}
            />
          </>
        )}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Result</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Original: {formatFileSize(result.originalSize)}</p>
              <p>Compressed: {formatFileSize(result.compressedSize)}</p>
              <p>
                {result.reduced
                  ? `Reduced by ${result.reductionPercent}%`
                  : "No size reduction. The compressed file is the same size or larger."}
              </p>
              <DownloadButton label="Download compressed PDF" onClick={download} />
            </CardContent>
          </Card>
        )}
      </div>
    </PdfToolLayout>
  );
}
