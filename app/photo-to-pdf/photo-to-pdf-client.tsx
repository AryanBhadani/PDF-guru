"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Camera, Images, RotateCw, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { PdfToolLayout } from "@/components/pdf/pdf-tool-layout";
import { FileUpload } from "@/components/pdf/file-upload";
import { DownloadButton } from "@/components/pdf/download-button";
import { EmptyState } from "@/components/pdf/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { IMAGE_MIME_TYPES, MAX_IMAGE_COUNT } from "@/lib/constants";
import { imagesToPdf, validateImageFile } from "@/lib/image";
import { downloadPdf } from "@/lib/pdf";
import { createId } from "@/lib/utils";
import { useFileQueue } from "@/hooks/use-file-queue";
import type { ImageFileItem } from "@/types/pdf";
import type { PhotoPdfQuality } from "@/types/conversion";
import { useT } from "@/components/i18n/language-provider";
import { CameraScannerModal } from "@/components/scanner/camera-scanner-modal";

export function PhotoToPdfClient() {
  const t = useT();
  const { items, add, remove, clear, move, rotate } = useFileQueue<ImageFileItem>();
  const [loading, setLoading] = useState(false);
  const [quality, setQuality] = useState<PhotoPdfQuality>("medium");
  const [scannerOpen, setScannerOpen] = useState(false);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      itemsRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, []);

  const processFiles = async (files: File[], isCamera = false) => {
    if (files.length === 0) return;
    if (items.length + files.length > MAX_IMAGE_COUNT) {
      toast.error(t("upload.maxImages", { count: MAX_IMAGE_COUNT }));
      return;
    }

    const validNewItems: ImageFileItem[] = [];

    for (const file of files) {
      const result = await validateImageFile(file);
      if (!result.valid) {
        toast.error(result.error || t("tools.photoToPdf.decodeFailed", { name: file.name }));
        continue;
      }

      validNewItems.push({
        id: createId(),
        file,
        name: file.name || (isCamera ? `Photo-${Date.now()}.jpg` : "image.jpg"),
        size: file.size,
        previewUrl: URL.createObjectURL(file),
      });
    }

    if (validNewItems.length > 0) {
      add(validNewItems);
      toast.success(t("upload.addedImages", { count: validNewItems.length }));
    }
  };

  const handleFiles = (files: File[]) => {
    void processFiles(files, false);
  };

  const handleTakePhotoClick = async () => {
    if (loading) return;
    if (
      typeof navigator !== "undefined" &&
      "mediaDevices" in navigator &&
      typeof navigator.mediaDevices.getUserMedia === "function"
    ) {
      try {
        if ("permissions" in navigator && typeof navigator.permissions?.query === "function") {
          const status = await navigator.permissions.query({ name: "camera" as PermissionName }).catch(() => null);
          if (status?.state === "denied") {
            toast.error(t("tools.photoToPdf.cameraDenied"));
            return;
          }
        }
      } catch {
        // Permissions API query unsupported
      }
      setScannerOpen(true);
      return;
    }

    try {
      cameraInputRef.current?.click();
    } catch {
      toast.error(t("tools.photoToPdf.cameraDenied"));
    }
  };

  const handleScannerComplete = (scannedFiles: File[]) => {
    void processFiles(scannedFiles, true);
  };

  const handleCameraCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    const incoming = Array.from(files);
    event.target.value = "";
    void processFiles(incoming, true);
  };

  const handleClear = () => {
    items.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    clear();
  };

  const handleRemove = (id: string) => {
    const item = items.find((row) => row.id === id);
    if (item) URL.revokeObjectURL(item.previewUrl);
    remove(id);
  };

  const convert = async () => {
    if (items.length === 0) {
      toast.error(t("errors.uploadImageFirst"));
      return;
    }
    setLoading(true);
    try {
      const bytes = await imagesToPdf(
        items.map((item) => ({
          file: item.file,
          rotation: item.rotation || 0,
        })),
        { quality },
        (failedFile) => {
          toast.error(t("tools.photoToPdf.decodeFailed", { name: failedFile.name }));
        }
      );
      downloadPdf(bytes, "pdf-guru-photos.pdf");
      toast.success(t("success.ready"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("errors.conversion"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PdfToolLayout title={t("tools.photoToPdf.pageTitle")} description={t("tools.photoToPdf.pageDesc")}>
      <div className="space-y-6">
        <div className="space-y-3">
          <FileUpload
            accept="image/*,.jpg,.jpeg,.png,.webp,.heic,.heif,.jfif"
            title={t("upload.dropImages")}
            hint={t("upload.hintImages")}
            disabled={loading}
            allowedTypes={IMAGE_MIME_TYPES}
            onFiles={handleFiles}
            showGalleryButton={true}
          />
          <div className="flex items-center justify-center">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-11 w-full gap-2 font-medium sm:w-auto"
              disabled={loading}
              onClick={handleTakePhotoClick}
            >
              <Camera className="h-5 w-5 text-primary" />
              {t("tools.photoToPdf.takePhoto")}
            </Button>
          </div>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            disabled={loading}
            onChange={handleCameraCapture}
          />
          <CameraScannerModal
            isOpen={scannerOpen}
            onClose={() => setScannerOpen(false)}
            onComplete={handleScannerComplete}
            onFallbackToFile={() => cameraInputRef.current?.click()}
          />
        </div>

        {items.length === 0 ? (
          <EmptyState
            icon={<Images className="h-8 w-8" />}
            title={t("tools.photoToPdf.emptyTitle")}
            hint={t("tools.photoToPdf.emptyHint")}
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
              {items.map((item, index) => {
                const rotation = (item.rotation || 0) % 360;
                return (
                  <li
                    key={item.id}
                    className="group relative overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:shadow-md"
                  >
                    {/* Centered square inner box prevents overflow and distortion when rotated 90/180/270 */}
                    <div className="relative flex h-40 w-full items-center justify-center overflow-hidden bg-muted/40 p-2 sm:h-44">
                      <div className="relative flex h-36 w-36 items-center justify-center sm:h-40 sm:w-40">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.previewUrl}
                          alt={item.name}
                          style={{
                            transform: `rotate(${rotation}deg)`,
                            transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                          }}
                          className="max-h-full max-w-full object-contain select-none pointer-events-none drop-shadow-sm"
                        />
                      </div>

                      {/* Quick-rotate overlay button for mobile and desktop */}
                      <button
                        type="button"
                        onClick={() => rotate(item.id)}
                        disabled={loading}
                        className="absolute top-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm shadow-md transition-transform hover:scale-110 active:scale-95 hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 touch-manipulation"
                        aria-label={`Rotate ${item.name} 90 degrees clockwise`}
                        title={t("common.rotate") || "Rotate 90°"}
                      >
                        <RotateCw className="h-4 w-4" />
                      </button>

                      {/* Rotation angle badge when rotated */}
                      {rotation > 0 && (
                        <span className="absolute bottom-2 left-2 rounded-md bg-black/65 px-1.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm shadow">
                          {rotation}°
                        </span>
                      )}

                      {/* Page sequence badge */}
                      <span className="absolute top-2 left-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-medium text-white/90 backdrop-blur-sm">
                        #{index + 1}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 p-3">
                      <p className="truncate text-sm font-medium" title={item.name}>
                        {item.name}
                      </p>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary hover:bg-primary/10"
                          aria-label={`Rotate ${item.name} 90 degrees clockwise`}
                          title={`${t("common.rotate") || "Rotate"} (${rotation}°)`}
                          disabled={loading}
                          onClick={() => rotate(item.id)}
                        >
                          <RotateCw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label="Move up"
                          disabled={loading || index === 0}
                          onClick={() => move(item.id, -1)}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label="Move down"
                          disabled={loading || index === items.length - 1}
                          onClick={() => move(item.id, 1)}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Remove image"
                          disabled={loading}
                          onClick={() => handleRemove(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            <Card>
              <CardContent className="grid gap-2 p-4 sm:max-w-xs">
                <Label htmlFor="photo-quality">{t("tools.photoToPdf.quality")}</Label>
                <NativeSelect
                  id="photo-quality"
                  value={quality}
                  disabled={loading}
                  onChange={(event) => setQuality(event.target.value as PhotoPdfQuality)}
                >
                  <option value="low">{t("tools.photoToPdf.qualityLow")}</option>
                  <option value="medium">{t("tools.photoToPdf.qualityMedium")}</option>
                  <option value="high">{t("tools.photoToPdf.qualityHigh")}</option>
                  <option value="original">{t("tools.photoToPdf.qualityOriginal")}</option>
                </NativeSelect>
              </CardContent>
            </Card>
          </div>
        )}

        <DownloadButton
          label={t("tools.photoToPdf.convert")}
          loadingLabel={t("tools.photoToPdf.converting")}
          loading={loading}
          disabled={items.length === 0}
          onClick={convert}
        />
      </div>
    </PdfToolLayout>
  );
}
