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
import { useT } from "@/components/i18n/language-provider";

export function MaskDocumentClient() {
  const t = useT();
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
          toast.success(t("tools.maskDocument.hintSuggested", { count: detected.rects.length }));
        } else {
          toast.message(t("tools.maskDocument.hintManual"));
        }
      } else {
        toast.success(t("upload.imageLoaded"));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("errors.readPdf"));
    }
  };

  const changePage = async (nextIndex: number) => {
    if (!file || nextIndex === pageIndex) return;
    setPageIndex(nextIndex);
    try {
      await loadPreview(file, kind, nextIndex);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("errors.readPdf"));
    }
  };

  const applyMask = async () => {
    if (!file || loading) {
      if (!file) toast.error(t("errors.uploadFirst"));
      return;
    }
    if (rects.length === 0) {
      toast.error(t("tools.maskDocument.emptyHint"));
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
      toast.success(t("success.masked"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("errors.processing"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PdfToolLayout title={t("tools.maskDocument.pageTitle")} description={t("tools.maskDocument.pageDesc")}>
      <div className="space-y-6">
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          {t("tools.maskDocument.warning")}
        </div>
        <FileUpload
          accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp"
          multiple={false}
          title={t("upload.dropPdfOrImage")}
          hint={t("upload.hintImages")}
          disabled={loading}
          allowedTypes={DOCUMENT_MIME_TYPES}
          onFiles={handleFiles}
        />
        {!file || !previewUrl ? (
          <EmptyState
            icon={<ShieldOff className="h-8 w-8" />}
            title={t("tools.maskDocument.emptyTitle")}
            hint={t("tools.maskDocument.emptyHint")}
          />
        ) : (
          <>
            <SelectedFile
              name={file.name}
              size={file.size}
              extra={kind === "pdf" ? `${pageCount} ${t("common.pages")}` : t("common.images")}
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
                  {t("common.previous")}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {t("common.page")} {pageIndex + 1} {t("common.of")} {pageCount}
                </span>
                <Button
                  variant="outline"
                  disabled={loading || pageIndex >= pageCount - 1}
                  onClick={() => changePage(pageIndex + 1)}
                >
                  {t("common.next")}
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
                {t("tools.maskDocument.areas", { count: rects.length })}
              </p>
              <Button variant="outline" disabled={loading || rects.length === 0} onClick={() => setRects([])}>
                {t("tools.maskDocument.clearMasks")}
              </Button>
            </div>
            {loading && <ProgressBar current={progress.current} total={progress.total} label={t("tools.maskDocument.redacting")} />}
            <DownloadButton
              label={t("tools.maskDocument.download")}
              loadingLabel={t("tools.maskDocument.redacting")}
              loading={loading}
              onClick={applyMask}
            />
          </>
        )}
      </div>
    </PdfToolLayout>
  );
}
