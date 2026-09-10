"use client";

import { useEffect, useRef, useState } from "react";
import { ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { PdfToolLayout } from "@/components/pdf/pdf-tool-layout";
import { FileUpload } from "@/components/pdf/file-upload";
import { DownloadButton } from "@/components/pdf/download-button";
import { EmptyState } from "@/components/pdf/empty-state";
import { ProgressBar } from "@/components/pdf/progress-bar";
import { SelectedFile } from "@/components/pdf/selected-file";
import { MaskCanvas } from "@/components/masking/mask-canvas";
import { Button } from "@/components/ui/button";
import { DOCUMENT_MIME_TYPES } from "@/lib/constants";
import { downloadPdf, getPdfPageCount } from "@/lib/pdf";
import { downloadBlob } from "@/lib/utils";
import type { MaskRect } from "@/types/masking";

export function MaskDocumentClient() {
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<"pdf" | "image">("image");
  const [pageCount, setPageCount] = useState(1);
  const [pageIndex, setPageIndex] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rects, setRects] = useState<MaskRect[]>([]);
  const [hints, setHints] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const previewUrlRef = useRef<string | null>(null);

  const revokePreview = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  };

  useEffect(() => {
    return () => revokePreview();
  }, []);

  const loadPreview = async (nextFile: File, nextKind: "pdf" | "image", index: number) => {
    revokePreview();
    if (nextKind === "image") {
      const url = URL.createObjectURL(nextFile);
      previewUrlRef.current = url;
      setPreviewUrl(url);
      return;
    }
    const { loadPdfJsDocument, renderPageToCanvas } = await import("@/lib/pdf-render");
    const pdf = await loadPdfJsDocument(nextFile);
    const page = await pdf.getPage(index + 1);
    const canvas = await renderPageToCanvas(page, 1.4);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => (result ? resolve(result) : reject(new Error("Could not preview this page."))), "image/jpeg", 0.85);
    });
    const url = URL.createObjectURL(blob);
    previewUrlRef.current = url;
    setPreviewUrl(url);
    page.cleanup();
    await pdf.destroy();
  };

  const handleFiles = async (files: File[]) => {
    const next = files[0];
    if (!next) return;
    const nextKind =
      next.type === "application/pdf" || next.name.toLowerCase().endsWith(".pdf") ? "pdf" : "image";
    try {
      const count = nextKind === "pdf" ? await getPdfPageCount(next) : 1;
      setFile(next);
      setKind(nextKind);
      setPageCount(count);
      setPageIndex(0);
      setRects([]);
      setHints([]);
      await loadPreview(next, nextKind, 0);
      if (nextKind === "pdf") {
        const { detectSensitiveRects } = await import("@/lib/document-masking");
        const detected = await detectSensitiveRects(next);
        setRects(detected.rects);
        setHints(detected.hints);
        if (detected.rects.length > 0) {
          toast.success(`Suggested ${detected.rects.length} mask area${detected.rects.length === 1 ? "" : "s"}.`);
        } else {
          toast.message("No Aadhaar or PAN text found. Draw boxes manually.");
        }
      } else {
        toast.success("Image loaded. Draw boxes over sensitive areas.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open this file.");
    }
  };

  const changePage = async (nextIndex: number) => {
    if (!file || nextIndex === pageIndex) return;
    setPageIndex(nextIndex);
    try {
      await loadPreview(file, kind, nextIndex);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load this page.");
    }
  };

  const applyMask = async () => {
    if (!file || loading) {
      if (!file) toast.error("Upload a document first.");
      return;
    }
    if (rects.length === 0) {
      toast.error("Add at least one mask area.");
      return;
    }
    setLoading(true);
    setProgress({ current: 0, total: pageCount });
    try {
      const { maskPdfFile, maskImageFile, maskedFileName, sourceKindFromFile } = await import(
        "@/lib/document-masking"
      );
      const sourceKind = sourceKindFromFile(file);
      if (sourceKind === "pdf") {
        const bytes = await maskPdfFile(file, rects, (current, total) => setProgress({ current, total }));
        downloadPdf(bytes, maskedFileName(file, "pdf"));
      } else {
        const blob = await maskImageFile(file, rects);
        downloadBlob(blob, maskedFileName(file, "image"));
      }
      toast.success("Masked file ready. Verify it before sharing.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not mask this document.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PdfToolLayout
      title="Aadhaar / PAN masking"
      description="Draw black boxes over sensitive details. Masking is burned into the exported file."
    >
      <div className="space-y-6">
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          Always verify the masked document before sharing. Redaction is permanent in the download, but you must confirm nothing sensitive remains visible.
        </div>
        <FileUpload
          accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp"
          multiple={false}
          title="Drop a PDF or image"
          hint="PDF, JPG, PNG, or WEBP · processed only on this device"
          disabled={loading}
          allowedTypes={DOCUMENT_MIME_TYPES}
          onFiles={handleFiles}
        />
        {!file || !previewUrl ? (
          <EmptyState
            icon={<ShieldOff className="h-8 w-8" />}
            title="No document selected"
            hint="Upload an ID or PDF, then draw mask boxes."
          />
        ) : (
          <>
            <SelectedFile
              name={file.name}
              size={file.size}
              extra={kind === "pdf" ? `${pageCount} page${pageCount === 1 ? "" : "s"}` : "Image"}
              disabled={loading}
              onClear={() => {
                setFile(null);
                setRects([]);
                setHints([]);
                revokePreview();
                setPreviewUrl(null);
              }}
            />
            {hints.length > 0 && (
              <p className="text-sm text-muted-foreground">{hints.join(" · ")}. Review the suggested boxes.</p>
            )}
            {kind === "pdf" && pageCount > 1 && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  disabled={loading || pageIndex === 0}
                  onClick={() => changePage(pageIndex - 1)}
                >
                  Previous page
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {pageIndex + 1} of {pageCount}
                </span>
                <Button
                  variant="outline"
                  disabled={loading || pageIndex >= pageCount - 1}
                  onClick={() => changePage(pageIndex + 1)}
                >
                  Next page
                </Button>
              </div>
            )}
            <MaskCanvas
              imageUrl={previewUrl}
              pageIndex={pageIndex}
              rects={rects}
              disabled={loading}
              onChange={setRects}
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <p className="text-sm text-muted-foreground">
                {rects.length} mask area{rects.length === 1 ? "" : "s"}. Drag to add. Tap a box to remove it.
              </p>
              <Button variant="outline" disabled={loading || rects.length === 0} onClick={() => setRects([])}>
                Clear masks
              </Button>
            </div>
            {loading && <ProgressBar current={progress.current} total={progress.total} label="Applying redaction" />}
            <DownloadButton
              label="Download masked file"
              loadingLabel="Redacting…"
              loading={loading}
              onClick={applyMask}
            />
          </>
        )}
      </div>
    </PdfToolLayout>
  );
}
