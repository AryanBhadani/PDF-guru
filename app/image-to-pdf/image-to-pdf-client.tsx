"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, FileImage, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { PdfToolLayout } from "@/components/pdf/pdf-tool-layout";
import { FileUpload } from "@/components/pdf/file-upload";
import { DownloadButton } from "@/components/pdf/download-button";
import { EmptyState } from "@/components/pdf/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { IMAGE_MIME_TYPES, MAX_IMAGE_COUNT } from "@/lib/constants";
import { downloadPdf } from "@/lib/pdf";
import { createId } from "@/lib/utils";
import { useFileQueue } from "@/hooks/use-file-queue";
import type { ImageFileItem } from "@/types/pdf";
import type {
  ImageFit,
  ImageQualityLevel,
  ImageToPdfOptions,
  MarginPreset,
  PageNumberPosition,
  PageOrientation,
  PageSizeName,
} from "@/types/conversion";

const defaultOptions: ImageToPdfOptions = {
  pageSize: "a4",
  orientation: "portrait",
  customWidthMm: 210,
  customHeightMm: 297,
  margin: "medium",
  customMarginMm: 12,
  fit: "fit",
  quality: "high",
  background: "#ffffff",
  pageNumbers: "none",
};

export function ImageToPdfClient() {
  const { items, add, remove, clear, move } = useFileQueue<ImageFileItem>();
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<ImageToPdfOptions>(defaultOptions);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    return () => {
      itemsRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, []);

  const previewStyle = useMemo(() => {
    const sizes: Record<string, [number, number]> = {
      a4: [210, 297],
      a3: [297, 420],
      a5: [148, 210],
      letter: [216, 279],
      legal: [216, 356],
      custom: [options.customWidthMm, options.customHeightMm],
      original: [210, 297],
    };
    let [w, h] = sizes[options.pageSize] ?? [210, 297];
    if (options.orientation === "landscape") [w, h] = [Math.max(w, h), Math.min(w, h)];
    const maxW = 180;
    const scale = maxW / w;
    return { width: Math.round(w * scale), height: Math.round(h * scale) };
  }, [options.pageSize, options.orientation, options.customWidthMm, options.customHeightMm]);

  const handleFiles = (files: File[]) => {
    if (items.length + files.length > MAX_IMAGE_COUNT) {
      toast.error(`You can add up to ${MAX_IMAGE_COUNT} images.`);
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
    toast.success(`${files.length} image${files.length === 1 ? "" : "s"} added.`);
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
    if (items.length === 0 || loading) {
      if (items.length === 0) toast.error("Upload at least one image.");
      return;
    }
    if (options.pageSize === "custom" && (options.customWidthMm < 50 || options.customHeightMm < 50)) {
      toast.error("Custom page size must be at least 50 mm.");
      return;
    }
    setLoading(true);
    try {
      const { createAdvancedImagePdf } = await import("@/lib/image-to-pdf");
      const bytes = await createAdvancedImagePdf(
        items.map((item) => item.file),
        options
      );
      downloadPdf(bytes, "pdf-guru-images.pdf");
      toast.success("PDF ready.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the PDF.");
    } finally {
      setLoading(false);
    }
  };

  const patch = (partial: Partial<ImageToPdfOptions>) => setOptions((current) => ({ ...current, ...partial }));

  return (
    <PdfToolLayout
      title="Image to PDF"
      description="Advanced photo to PDF with page size, orientation, margins, quality, and page numbers."
    >
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <FileUpload
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            title="Drop images here"
            hint="JPG, PNG, or WEBP · reorder before converting"
            disabled={loading}
            allowedTypes={IMAGE_MIME_TYPES}
            onFiles={handleFiles}
          />
          {items.length === 0 ? (
            <EmptyState
              icon={<FileImage className="h-8 w-8" />}
              title="No images yet"
              hint="Add photos, then customize the PDF layout."
            />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {items.length} image{items.length === 1 ? "" : "s"}
                </p>
                <Button variant="ghost" size="sm" onClick={handleClear} disabled={loading}>
                  <X className="h-4 w-4" />
                  Clear all
                </Button>
              </div>
              <ul className="grid gap-3 sm:grid-cols-2">
                {items.map((item, index) => (
                  <li key={item.id} className="overflow-hidden rounded-xl border bg-card">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.previewUrl} alt={item.name} className="h-32 w-full object-cover" />
                    <div className="flex items-center justify-between gap-2 p-2">
                      <p className="truncate text-xs">{item.name}</p>
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
            </div>
          )}
          <DownloadButton
            label="Create PDF"
            loadingLabel="Creating PDF…"
            loading={loading}
            disabled={items.length === 0}
            onClick={convert}
          />
        </div>
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Layout</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label>Page size</Label>
              <NativeSelect
                value={options.pageSize}
                disabled={loading}
                onChange={(event) => patch({ pageSize: event.target.value as PageSizeName })}
              >
                <option value="a4">A4</option>
                <option value="a3">A3</option>
                <option value="a5">A5</option>
                <option value="letter">Letter</option>
                <option value="legal">Legal</option>
                <option value="custom">Custom</option>
              </NativeSelect>
            </div>
            {options.pageSize === "custom" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Width mm</Label>
                  <Input
                    type="number"
                    min={50}
                    value={options.customWidthMm}
                    disabled={loading}
                    onChange={(event) => patch({ customWidthMm: Number(event.target.value) })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Height mm</Label>
                  <Input
                    type="number"
                    min={50}
                    value={options.customHeightMm}
                    disabled={loading}
                    onChange={(event) => patch({ customHeightMm: Number(event.target.value) })}
                  />
                </div>
              </div>
            )}
            <div className="grid gap-2">
              <Label>Orientation</Label>
              <NativeSelect
                value={options.orientation}
                disabled={loading}
                onChange={(event) => patch({ orientation: event.target.value as PageOrientation })}
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </NativeSelect>
            </div>
            <div className="grid gap-2">
              <Label>Margin</Label>
              <NativeSelect
                value={options.margin}
                disabled={loading}
                onChange={(event) => patch({ margin: event.target.value as MarginPreset })}
              >
                <option value="none">None</option>
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
                <option value="custom">Custom</option>
              </NativeSelect>
            </div>
            {options.margin === "custom" && (
              <div className="grid gap-2">
                <Label>Margin mm</Label>
                <Input
                  type="number"
                  min={0}
                  value={options.customMarginMm}
                  disabled={loading}
                  onChange={(event) => patch({ customMarginMm: Number(event.target.value) })}
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label>Image fit</Label>
              <NativeSelect
                value={options.fit}
                disabled={loading}
                onChange={(event) => patch({ fit: event.target.value as ImageFit })}
              >
                <option value="fit">Fit to page</option>
                <option value="fill">Fill page</option>
                <option value="original">Original size</option>
              </NativeSelect>
            </div>
            <div className="grid gap-2">
              <Label>Image quality</Label>
              <NativeSelect
                value={options.quality}
                disabled={loading}
                onChange={(event) => patch({ quality: event.target.value as ImageQualityLevel })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </NativeSelect>
            </div>
            <div className="grid gap-2">
              <Label>Background</Label>
              <Input
                type="color"
                value={options.background}
                disabled={loading}
                onChange={(event) => patch({ background: event.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Page numbers</Label>
              <NativeSelect
                value={options.pageNumbers}
                disabled={loading}
                onChange={(event) => patch({ pageNumbers: event.target.value as PageNumberPosition })}
              >
                <option value="none">None</option>
                <option value="bottom-center">Bottom center</option>
                <option value="bottom-right">Bottom right</option>
              </NativeSelect>
            </div>
            <div>
              <p className="mb-2 text-xs text-muted-foreground">Page preview</p>
              <div
                className="mx-auto rounded-sm border shadow-sm"
                style={{
                  width: previewStyle.width,
                  height: previewStyle.height,
                  background: options.background,
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </PdfToolLayout>
  );
}
