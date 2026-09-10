"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Images, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { PdfToolLayout } from "@/components/pdf/pdf-tool-layout";
import { FileUpload } from "@/components/pdf/file-upload";
import { DownloadButton } from "@/components/pdf/download-button";
import { EmptyState } from "@/components/pdf/empty-state";
import { Button } from "@/components/ui/button";
import { IMAGE_MIME_TYPES, MAX_IMAGE_COUNT } from "@/lib/constants";
import { imagesToPdf } from "@/lib/image";
import { downloadPdf } from "@/lib/pdf";
import { createId } from "@/lib/utils";
import { useFileQueue } from "@/hooks/use-file-queue";
import type { ImageFileItem } from "@/types/pdf";

export function PhotoToPdfClient() {
  const { items, add, remove, clear, move } = useFileQueue<ImageFileItem>();
  const [loading, setLoading] = useState(false);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    return () => {
      itemsRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, []);

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
    if (items.length === 0) {
      toast.error("Upload at least one image.");
      return;
    }
    setLoading(true);
    try {
      const bytes = await imagesToPdf(items.map((item) => item.file));
      downloadPdf(bytes, "pdf-guru-photos.pdf");
      toast.success("PDF ready. Download started.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not convert images.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PdfToolLayout
      title="Photo to PDF"
      description="Upload images, reorder them, and download one high-quality PDF."
    >
      <div className="space-y-6">
        <FileUpload
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          title="Drop images here"
          hint="JPG, JPEG, PNG, or WEBP · up to 50 MB each"
          disabled={loading}
          allowedTypes={IMAGE_MIME_TYPES}
          onFiles={handleFiles}
        />

        {items.length === 0 ? (
          <EmptyState
            icon={<Images className="h-8 w-8" />}
            title="No images yet"
            hint="Add photos to build your PDF."
          />
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{items.length} image{items.length === 1 ? "" : "s"}</p>
              <Button variant="ghost" size="sm" onClick={handleClear} disabled={loading}>
                <X className="h-4 w-4" />
                Clear all
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
          </div>
        )}

        <DownloadButton
          label="Convert to PDF"
          loadingLabel="Creating PDF…"
          loading={loading}
          disabled={items.length === 0}
          onClick={convert}
        />
      </div>
    </PdfToolLayout>
  );
}
