"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ScanText, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { PdfToolLayout } from "@/components/pdf/pdf-tool-layout";
import { FileUpload } from "@/components/pdf/file-upload";
import { DownloadButton } from "@/components/pdf/download-button";
import { EmptyState } from "@/components/pdf/empty-state";
import { ProgressBar } from "@/components/pdf/progress-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IMAGE_MIME_TYPES, MAX_IMAGE_COUNT } from "@/lib/constants";
import { downloadBlob, createId } from "@/lib/utils";
import { useFileQueue } from "@/hooks/use-file-queue";
import type { ImageFileItem } from "@/types/pdf";
import { useT } from "@/components/i18n/language-provider";
import type { ScreenshotToWordResult } from "@/lib/screenshot-to-word";

export function ScreenshotToWordClient() {
  const t = useT();
  const { items, add, remove, clear, move } = useFileQueue<ImageFileItem>();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [result, setResult] = useState<ScreenshotToWordResult | null>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    return () => {
      itemsRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, []);

  const handleFiles = (files: File[]) => {
    if (items.length + files.length > MAX_IMAGE_COUNT) {
      toast.error(t("upload.maxImages", { count: MAX_IMAGE_COUNT }));
      return;
    }
    add(
      files.map((file) => ({
        id: createId(),
        file,
        name: file.name,
        size: file.size,
        previewUrl: URL.createObjectURL(file),
      }))
    );
    setResult(null);
    toast.success(t("upload.addedImages", { count: files.length }));
  };

  const handleClear = () => {
    items.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    clear();
    setResult(null);
  };

  const handleRemove = (id: string) => {
    const item = items.find((row) => row.id === id);
    if (item) URL.revokeObjectURL(item.previewUrl);
    remove(id);
    setResult(null);
  };

  const convert = async () => {
    if (items.length === 0) {
      toast.error(t("errors.uploadImageFirst"));
      return;
    }
    setLoading(true);
    setProgress({ current: 0, total: items.length });
    try {
      const { convertScreenshotsToDocx } = await import("@/lib/screenshot-to-word");
      const next = await convertScreenshotsToDocx(items.map((item) => item.file), (current, total) => {
        setProgress({ current, total });
      });
      setResult(next);
      downloadBlob(next.blob, "pdf-guru-screenshot.docx");
      toast.success(t("success.wordReady"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("errors.conversion"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PdfToolLayout title={t("tools.screenshotToWord.pageTitle")} description={t("tools.screenshotToWord.pageDesc")}>
      <div className="space-y-6">
        <FileUpload
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          title={t("tools.screenshotToWord.drop")}
          hint={t("upload.hintImages")}
          disabled={loading}
          allowedTypes={IMAGE_MIME_TYPES}
          onFiles={handleFiles}
        />

        {items.length === 0 ? (
          <EmptyState
            icon={<ScanText className="h-8 w-8" />}
            title={t("tools.screenshotToWord.emptyTitle")}
            hint={t("tools.screenshotToWord.emptyHint")}
          />
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                {items.length} {t("common.images")}
              </p>
              <Button variant="ghost" size="sm" onClick={handleClear} disabled={loading}>
                <X className="h-4 w-4" />
                {t("common.clearAll")}
              </Button>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item, index) => (
                <li key={item.id} className="overflow-hidden rounded-xl border bg-card">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.previewUrl} alt={item.name} className="h-40 w-full object-cover" />
                  <div className="flex items-center justify-between gap-2 p-3">
                    <p className="truncate text-sm">{item.name}</p>
                    <div className="flex shrink-0">
                      <Button variant="ghost" size="icon" disabled={loading || index === 0} onClick={() => move(item.id, -1)}>
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={loading || index === items.length - 1}
                        onClick={() => move(item.id, 1)}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" disabled={loading} onClick={() => handleRemove(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            {loading && (
              <ProgressBar current={progress.current} total={progress.total || items.length} label={t("tools.screenshotToWord.converting")} />
            )}
            {result && (
              <Card>
                <CardContent className="space-y-2 p-6 text-sm text-muted-foreground">
                  <p>
                    {t("tools.screenshotToWord.summary", {
                      pages: result.pageCount,
                      chars: result.charCount,
                      tables: result.tableCount,
                    })}
                  </p>
                  <p>{t("tools.screenshotToWord.disclaimer")}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <DownloadButton
          label={t("tools.screenshotToWord.convert")}
          loadingLabel={t("tools.screenshotToWord.converting")}
          loading={loading}
          disabled={items.length === 0}
          onClick={convert}
        />
      </div>
    </PdfToolLayout>
  );
}
