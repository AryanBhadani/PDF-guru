"use client";

import { useEffect, useRef, useState } from "react";
import { ImageDown } from "lucide-react";
import { toast } from "sonner";
import { PdfToolLayout } from "@/components/pdf/pdf-tool-layout";
import { FileUpload } from "@/components/pdf/file-upload";
import { DownloadButton } from "@/components/pdf/download-button";
import { EmptyState } from "@/components/pdf/empty-state";
import { ProgressBar } from "@/components/pdf/progress-bar";
import { SelectedFile } from "@/components/pdf/selected-file";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { PDF_MIME_TYPE } from "@/lib/constants";
import { getPdfPageCount } from "@/lib/pdf";
import { downloadBlob } from "@/lib/utils";
import type { ImageOutputFormat, ImageQualityLevel } from "@/types/conversion";

type Preview = {
  pageNumber: number;
  blob: Blob;
  url: string;
};

export function PdfToImageClient() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [format, setFormat] = useState<ImageOutputFormat>("png");
  const [quality, setQuality] = useState<ImageQualityLevel>("medium");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [previews, setPreviews] = useState<Preview[]>([]);
  const previewsRef = useRef(previews);
  previewsRef.current = previews;

  useEffect(() => {
    return () => {
      previewsRef.current.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, []);

  const clearPreviews = () => {
    previews.forEach((item) => URL.revokeObjectURL(item.url));
    setPreviews([]);
  };

  const handleFiles = async (files: File[]) => {
    const next = files[0];
    if (!next) return;
    try {
      const count = await getPdfPageCount(next);
      clearPreviews();
      setFile(next);
      setPageCount(count);
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
      const { convertPdfToImages } = await import("@/lib/pdf-to-image");
      const pages = await convertPdfToImages(file, {
        format,
        quality,
        onProgress: (current, total) => setProgress({ current, total }),
      });
      clearPreviews();
      setPreviews(
        pages.map((page) => ({
          pageNumber: page.pageNumber,
          blob: page.blob,
          url: URL.createObjectURL(page.blob),
        }))
      );
      toast.success(`${pages.length} image${pages.length === 1 ? "" : "s"} ready.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not convert this PDF.");
    } finally {
      setLoading(false);
    }
  };

  const downloadAll = async () => {
    if (!file || previews.length === 0) return;
    const { zipImages, imageFileName } = await import("@/lib/pdf-to-image");
    const zip = await zipImages(
      previews.map((item) => ({
        name: imageFileName(file.name, item.pageNumber, format),
        blob: item.blob,
      }))
    );
    downloadBlob(zip, `${file.name.replace(/\.pdf$/i, "")}-images.zip`);
  };

  return (
    <PdfToolLayout
      title="PDF to Image"
      description="Export every page as PNG, JPG, or WEBP. Download one image or all of them as a ZIP."
    >
      <div className="space-y-6">
        <FileUpload
          accept="application/pdf,.pdf"
          multiple={false}
          title="Drop a PDF here"
          hint="One PDF · each page becomes an image"
          disabled={loading}
          allowedTypes={[PDF_MIME_TYPE]}
          onFiles={handleFiles}
        />
        {!file ? (
          <EmptyState
            icon={<ImageDown className="h-8 w-8" />}
            title="No PDF selected"
            hint="Upload a document to export page images."
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
                clearPreviews();
              }}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="format">Format</Label>
                <NativeSelect
                  id="format"
                  value={format}
                  disabled={loading}
                  onChange={(event) => setFormat(event.target.value as ImageOutputFormat)}
                >
                  <option value="png">PNG</option>
                  <option value="jpg">JPG</option>
                  <option value="webp">WEBP</option>
                </NativeSelect>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="quality">Quality</Label>
                <NativeSelect
                  id="quality"
                  value={quality}
                  disabled={loading}
                  onChange={(event) => setQuality(event.target.value as ImageQualityLevel)}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </NativeSelect>
              </div>
            </div>
            {loading && <ProgressBar current={progress.current} total={progress.total} label="Rendering pages" />}
            <DownloadButton
              label="Convert pages"
              loadingLabel="Rendering…"
              loading={loading}
              onClick={convert}
            />
          </>
        )}
        {previews.length > 0 && (
          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium">{previews.length} image{previews.length === 1 ? "" : "s"}</p>
              <Button onClick={downloadAll}>Download all as ZIP</Button>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {previews.map((item) => (
                <li key={item.pageNumber} className="overflow-hidden rounded-xl border bg-card">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.url} alt={`Page ${item.pageNumber}`} className="h-48 w-full object-contain bg-muted" />
                  <div className="flex items-center justify-between p-3">
                    <p className="text-sm">Page {item.pageNumber}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        downloadBlob(
                          item.blob,
                          `pdf-guru-page-${item.pageNumber}.${format === "jpg" ? "jpg" : format}`
                        )
                      }
                    >
                      Download
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </PdfToolLayout>
  );
}
