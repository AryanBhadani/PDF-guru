"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { RotateCcw, WandSparkles } from "lucide-react";
import { toast } from "sonner";
import { PdfToolLayout } from "@/components/pdf/pdf-tool-layout";
import { FileUpload } from "@/components/pdf/file-upload";
import { DownloadButton } from "@/components/pdf/download-button";
import { EmptyState } from "@/components/pdf/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { IMAGE_MIME_TYPES } from "@/lib/constants";
import {
  DEFAULT_CLEAN_OPTIONS,
  cleanCanvas,
  cleanedImageToPdf,
  defaultQuad,
  detectDocumentCorners,
  loadImageToCanvas,
  type CleanMode,
  type CleanOptions,
  type Point,
  type Quad,
} from "@/lib/document-cleaner";
import { downloadPdf } from "@/lib/pdf";
import { useT } from "@/components/i18n/language-provider";

type DragMode = "none" | "crop" | "corner";

export function CleanPdfClient() {
  const t = useT();
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState<HTMLCanvasElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [options, setOptions] = useState<CleanOptions>(DEFAULT_CLEAN_OPTIONS);
  const [corners, setCorners] = useState<Quad | null>(null);
  const [cropStart, setCropStart] = useState<Point | null>(null);
  const [loading, setLoading] = useState(false);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ mode: DragMode; corner?: keyof Quad }>({ mode: "none" });

  const display = useMemo(() => {
    if (!source) return null;
    return cleanCanvas(cloneCanvas(source), {
      ...options,
      corners: options.perspective ? corners ?? undefined : undefined,
    });
  }, [source, options, corners]);

  useEffect(() => {
    if (!display || !previewRef.current) return;
    const canvas = previewRef.current;
    canvas.width = display.width;
    canvas.height = display.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(display, 0, 0);
    if (options.perspective && corners) drawCorners(ctx, corners);
    if (options.crop && !options.perspective) {
      ctx.strokeStyle = "#0d6e60";
      ctx.lineWidth = 2;
      ctx.strokeRect(options.crop.x, options.crop.y, options.crop.width, options.crop.height);
    }
  }, [display, corners, options.crop, options.perspective]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFiles = async (files: File[]) => {
    const next = files[0];
    if (!next) return;
    try {
      const canvas = await loadImageToCanvas(next);
      const detected = detectDocumentCorners(canvas);
      setFile(next);
      setSource(canvas);
      setCorners(detected);
      setOptions({ ...DEFAULT_CLEAN_OPTIONS, corners: detected });
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(next));
      toast.success(t("upload.imageLoaded"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("errors.readImage"));
    }
  };

  const patch = (next: Partial<CleanOptions>) => {
    setOptions((current) => ({ ...current, ...next }));
  };

  const convert = async () => {
    if (!source) {
      toast.error(t("errors.uploadImageFirst"));
      return;
    }
    setLoading(true);
    try {
      const cleaned = cleanCanvas(cloneCanvas(source), {
        ...options,
        corners: options.perspective ? corners ?? undefined : undefined,
      });
      const bytes = await cleanedImageToPdf(cleaned);
      downloadPdf(bytes, "pdf-guru-clean.pdf");
      toast.success(t("success.cleaned"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("errors.processing"));
    } finally {
      setLoading(false);
    }
  };

  const canvasPoint = (event: MouseEvent<HTMLCanvasElement>): Point | null => {
    const canvas = previewRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  };

  return (
    <PdfToolLayout title={t("tools.cleanPdf.pageTitle")} description={t("tools.cleanPdf.pageDesc")}>
      <div className="space-y-6">
        <FileUpload
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          multiple={false}
          title={t("tools.cleanPdf.drop")}
          hint={t("upload.hintImages")}
          disabled={loading}
          allowedTypes={IMAGE_MIME_TYPES}
          onFiles={handleFiles}
        />

        {!file || !source ? (
          <EmptyState
            icon={<WandSparkles className="h-8 w-8" />}
            title={t("tools.cleanPdf.emptyTitle")}
            hint={t("tools.cleanPdf.emptyHint")}
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>{t("common.preview")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-sm text-muted-foreground">{t("tools.cleanPdf.cropHint")}</p>
                <canvas
                  ref={previewRef}
                  className="max-h-[520px] w-full cursor-crosshair rounded-lg border bg-muted object-contain"
                  onMouseDown={(event) => {
                    const point = canvasPoint(event);
                    if (!point || !corners) return;
                    const hit = hitCorner(corners, point);
                    if (options.perspective && hit) {
                      dragRef.current = { mode: "corner", corner: hit };
                      return;
                    }
                    dragRef.current = { mode: "crop" };
                    setCropStart(point);
                    patch({ crop: { x: point.x, y: point.y, width: 1, height: 1 }, perspective: false });
                  }}
                  onMouseMove={(event) => {
                    const point = canvasPoint(event);
                    if (!point) return;
                    if (dragRef.current.mode === "corner" && dragRef.current.corner && corners) {
                      const next = { ...corners, [dragRef.current.corner]: point };
                      setCorners(next);
                      patch({ corners: next });
                    } else if (dragRef.current.mode === "crop" && cropStart) {
                      patch({
                        crop: {
                          x: Math.min(cropStart.x, point.x),
                          y: Math.min(cropStart.y, point.y),
                          width: Math.abs(point.x - cropStart.x),
                          height: Math.abs(point.y - cropStart.y),
                        },
                      });
                    }
                  }}
                  onMouseUp={() => {
                    dragRef.current = { mode: "none" };
                    setCropStart(null);
                  }}
                  onMouseLeave={() => {
                    dragRef.current = { mode: "none" };
                    setCropStart(null);
                  }}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle>{t("common.autoClean")}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={loading}
                  onClick={() => {
                    if (!source) return;
                    const detected = detectDocumentCorners(source);
                    setCorners(detected);
                    setOptions({ ...DEFAULT_CLEAN_OPTIONS, corners: detected });
                  }}
                >
                  <RotateCcw className="h-4 w-4" />
                  {t("common.reset")}
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <SliderField
                  label={t("tools.cleanPdf.brightness")}
                  value={options.brightness}
                  min={-60}
                  max={60}
                  onChange={(brightness) => patch({ brightness })}
                />
                <SliderField
                  label={t("tools.cleanPdf.contrast")}
                  value={options.contrast}
                  min={-60}
                  max={80}
                  onChange={(contrast) => patch({ contrast })}
                />
                <SliderField
                  label={t("tools.cleanPdf.sharpness")}
                  value={options.sharpness}
                  min={0}
                  max={100}
                  onChange={(sharpness) => patch({ sharpness })}
                />
                <div className="grid gap-2">
                  <Label>{t("tools.cleanPdf.mode")}</Label>
                  <NativeSelect
                    value={options.mode}
                    disabled={loading}
                    onChange={(event) => patch({ mode: event.target.value as CleanMode })}
                  >
                    <option value="color">{t("common.original")}</option>
                    <option value="grayscale">{t("tools.cleanPdf.grayscale")}</option>
                    <option value="bw">{t("tools.cleanPdf.bw")}</option>
                  </NativeSelect>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={options.perspective}
                    disabled={loading}
                    onChange={(event) => {
                      const on = event.target.checked;
                      const nextCorners = corners ?? (source ? defaultQuad(source.width, source.height) : undefined);
                      patch({ perspective: on, corners: nextCorners });
                    }}
                  />
                  {t("tools.cleanPdf.perspective")}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={options.cleanup}
                    disabled={loading}
                    onChange={(event) => patch({ cleanup: event.target.checked })}
                  />
                  {t("tools.cleanPdf.cleanup")}
                </label>
                <div className="flex gap-2">
                  <Button variant="outline" disabled={loading} onClick={() => patch({ rotation: options.rotation - 90 })}>
                    {t("common.rotate")} -90
                  </Button>
                  <Button variant="outline" disabled={loading} onClick={() => patch({ rotation: options.rotation + 90 })}>
                    {t("common.rotate")} +90
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <DownloadButton
          label={t("tools.cleanPdf.convert")}
          loadingLabel={t("tools.cleanPdf.converting")}
          loading={loading}
          disabled={!source}
          onClick={convert}
        />
      </div>
    </PdfToolLayout>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between text-sm">
        <Label>{label}</Label>
        <span className="text-muted-foreground">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-primary"
      />
    </div>
  );
}

function cloneCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext("2d");
  if (ctx) ctx.drawImage(source, 0, 0);
  return canvas;
}

function hitCorner(corners: Quad, point: Point): keyof Quad | null {
  const keys: Array<keyof Quad> = ["tl", "tr", "br", "bl"];
  for (const key of keys) {
    if (Math.hypot(corners[key].x - point.x, corners[key].y - point.y) < 18) return key;
  }
  return null;
}

function drawCorners(ctx: CanvasRenderingContext2D, corners: Quad) {
  ctx.strokeStyle = "#0d6e60";
  ctx.fillStyle = "#0d6e60";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(corners.tl.x, corners.tl.y);
  ctx.lineTo(corners.tr.x, corners.tr.y);
  ctx.lineTo(corners.br.x, corners.br.y);
  ctx.lineTo(corners.bl.x, corners.bl.y);
  ctx.closePath();
  ctx.stroke();
  (["tl", "tr", "br", "bl"] as const).forEach((key) => {
    ctx.beginPath();
    ctx.arc(corners[key].x, corners[key].y, 6, 0, Math.PI * 2);
    ctx.fill();
  });
}
