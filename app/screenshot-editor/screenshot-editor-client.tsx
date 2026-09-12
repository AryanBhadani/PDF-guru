"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Download,
  Eraser,
  Loader2,
  MousePointer,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Type,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/pdf/empty-state";
import { createId } from "@/lib/utils";
import { downloadPdf } from "@/lib/pdf";
import { useT } from "@/components/i18n/language-provider";
import {
  AddedScreenshotText,
  ModifiedScreenshotText,
  ScreenshotPageData,
  ScreenshotTextItem,
  ScreenshotWhiteout,
  exportScreenshotsToPdf,
  runOcrOnScreenshot,
} from "@/lib/screenshot-editor";
import { FontPicker } from "@/components/pdf/font-picker";
import { resolveCssFontFamily } from "@/lib/fonts";

type EditorTool = "select" | "addText" | "eraser";

export function ScreenshotEditorClient() {
  const t = useT();

  // Pages state
  const [pages, setPages] = useState<ScreenshotPageData[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  // View state
  const [zoom, setZoom] = useState(1.0);
  const [exporting, setExporting] = useState(false);
  const [activeTool, setActiveTool] = useState<EditorTool>("select");

  // Editing state for detected text popover
  const [activeEditingItem, setActiveEditingItem] = useState<{
    item: ScreenshotTextItem;
    replacementText: string;
    fontSize: number;
    color: string;
    bgColor: string;
    fontFamily: string;
  } | null>(null);

  // Selected added item for dragging / properties
  const [selectedAddedId, setSelectedAddedId] = useState<string | null>(null);

  // Whiteout drag state
  const [isDrawingWhiteout, setIsDrawingWhiteout] = useState(false);
  const [whiteoutStart, setWhiteoutStart] = useState<{ x: number; y: number } | null>(null);
  const [whiteoutCurrent, setWhiteoutCurrent] = useState<{ x: number; y: number } | null>(null);

  // Element drag state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addFileInputRef = useRef<HTMLInputElement>(null);

  const currentPage = pages[currentPageIndex] || null;

  // Helper to update current page state
  const updateCurrentPage = useCallback(
    (updater: (prev: ScreenshotPageData) => ScreenshotPageData) => {
      setPages((prevPages) => {
        if (!prevPages[currentPageIndex]) return prevPages;
        const updated = [...prevPages];
        updated[currentPageIndex] = updater(prevPages[currentPageIndex]);
        return updated;
      });
    },
    [currentPageIndex]
  );

  // File loading helper
  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newPages: ScreenshotPageData[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) continue;

      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
        img.onerror = reject;
        img.src = dataUrl;
      });

      newPages.push({
        id: createId(),
        file,
        name: file.name,
        dataUrl,
        width: dimensions.width,
        height: dimensions.height,
        ocrStatus: "idle",
        ocrProgress: 0,
        detectedTexts: [],
        modifiedTexts: {},
        deletedTextIds: [],
        addedTexts: [],
        whiteouts: [],
      });
    }

    if (newPages.length === 0) {
      toast.error("Please select valid image files (PNG, JPG, or WEBP).");
      return;
    }

    setPages((prev) => {
      const combined = [...prev, ...newPages];
      return combined;
    });

    toast.success(`Loaded ${newPages.length} screenshot(s)`);
  };

  // Run OCR on current page canvas
  const runOcrForCurrentPage = useCallback(
    async (canvasToScan?: HTMLCanvasElement) => {
      const canvas = canvasToScan || canvasRef.current;
      if (!canvas || !currentPage) return;

      updateCurrentPage((prev) => ({ ...prev, ocrStatus: "loading", ocrProgress: 5 }));

      try {
        const detected = await runOcrOnScreenshot(canvas, (percent) => {
          updateCurrentPage((prev) => ({ ...prev, ocrProgress: Math.round(percent) }));
        });

        updateCurrentPage((prev) => ({
          ...prev,
          ocrStatus: "done",
          ocrProgress: 100,
          detectedTexts: detected,
        }));

        if (detected.length > 0) {
          toast.success(`Detected ${detected.length} text items`);
        }
      } catch (err) {
        console.error("OCR scan error:", err);
        updateCurrentPage((prev) => ({ ...prev, ocrStatus: "error" }));
        toast.error("Could not run OCR on this screenshot.");
      }
    },
    [currentPage, updateCurrentPage]
  );

  // Render current screenshot onto the background canvas
  useEffect(() => {
    if (!currentPage || !canvasRef.current) return;

    const canvas = canvasRef.current;
    canvas.width = currentPage.width;
    canvas.height = currentPage.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.src = currentPage.dataUrl;
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // If OCR hasn't run yet for this page, run it automatically
      if (currentPage.ocrStatus === "idle") {
        runOcrForCurrentPage(canvas);
      }
    };
  }, [currentPage, runOcrForCurrentPage]);

  // Coordinate conversions
  const screenToImageCoords = useCallback(
    (screenX: number, screenY: number) => {
      return {
        x: Math.round(screenX / zoom),
        y: Math.round(screenY / zoom),
      };
    },
    [zoom]
  );

  // Background canvas click (for Add Text or deselecting)
  const handleViewportClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool === "addText" && containerRef.current && currentPage) {
      const rect = containerRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      const imgCoords = screenToImageCoords(clickX, clickY);

      const newText: AddedScreenshotText = {
        id: createId(),
        text: "New Text",
        x: Math.max(0, Math.min(currentPage.width - 150, imgCoords.x)),
        y: Math.max(0, Math.min(currentPage.height - 40, imgCoords.y)),
        width: 150,
        height: 36,
        fontSize: 16,
        color: "#000000",
        bgColor: "#ffffff",
        fontFamily: "arial",
      };

      updateCurrentPage((prev) => ({
        ...prev,
        addedTexts: [...prev.addedTexts, newText],
      }));

      setSelectedAddedId(newText.id);
      setActiveTool("select");
      toast.success("Added text element");
    } else {
      // Clicked on empty space: close inline edit popover
      if (e.target === containerRef.current || (e.target as HTMLElement).tagName === "CANVAS") {
        setActiveEditingItem(null);
        setSelectedAddedId(null);
      }
    }
  };

  // Inline edit popover trigger
  const handleDetectedItemClick = (item: ScreenshotTextItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeTool !== "select") return;

    const existingMod = currentPage?.modifiedTexts[item.id];
    setActiveEditingItem({
      item,
      replacementText: existingMod ? existingMod.newText : item.text,
      fontSize: existingMod ? existingMod.fontSize : item.fontSize,
      color: existingMod ? existingMod.color : item.color,
      bgColor: existingMod ? existingMod.bgColor : item.bgColor,
      fontFamily: existingMod?.fontFamily || "auto",
    });
  };

  const handleSaveDetectedEdit = () => {
    if (!activeEditingItem || !currentPage) return;

    const { item, replacementText, fontSize, color, bgColor, fontFamily } = activeEditingItem;

    if (replacementText === item.text && fontSize === item.fontSize && color === item.color) {
      // No change from original, remove from modified if present
      updateCurrentPage((prev) => {
        const nextMods = { ...prev.modifiedTexts };
        delete nextMods[item.id];
        return { ...prev, modifiedTexts: nextMods };
      });
    } else {
      const mod: ModifiedScreenshotText = {
        id: item.id,
        originalText: item.text,
        newText: replacementText,
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height,
        fontSize,
        color,
        bgColor,
        fontFamily,
        detectedFontName: item.detectedFontName,
      };

      updateCurrentPage((prev) => ({
        ...prev,
        modifiedTexts: { ...prev.modifiedTexts, [item.id]: mod },
        deletedTextIds: prev.deletedTextIds.filter((id) => id !== item.id),
      }));
    }

    setActiveEditingItem(null);
    toast.success("Text updated");
  };

  const handleDeleteDetectedItem = (item: ScreenshotTextItem) => {
    if (!currentPage) return;

    updateCurrentPage((prev) => {
      const nextMods = { ...prev.modifiedTexts };
      delete nextMods[item.id];
      return {
        ...prev,
        modifiedTexts: nextMods,
        deletedTextIds: [...prev.deletedTextIds.filter((id) => id !== item.id), item.id],
      };
    });

    setActiveEditingItem(null);
    toast.success("Text deleted");
  };

  const handleRestoreDetectedItem = (item: ScreenshotTextItem) => {
    if (!currentPage) return;

    updateCurrentPage((prev) => {
      const nextMods = { ...prev.modifiedTexts };
      delete nextMods[item.id];
      return {
        ...prev,
        modifiedTexts: nextMods,
        deletedTextIds: prev.deletedTextIds.filter((id) => id !== item.id),
      };
    });

    setActiveEditingItem(null);
    toast.success("Restored original text");
  };

  // Whiteout drawing
  const handleWhiteoutMouseDown = (e: React.MouseEvent) => {
    if (activeTool !== "eraser" || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setIsDrawingWhiteout(true);
    setWhiteoutStart({ x, y });
    setWhiteoutCurrent({ x, y });
  };

  const handleWhiteoutMouseMove = (e: React.MouseEvent) => {
    if (!isDrawingWhiteout || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setWhiteoutCurrent({ x, y });
  };

  const handleWhiteoutMouseUp = () => {
    if (!isDrawingWhiteout || !whiteoutStart || !whiteoutCurrent || !currentPage) {
      setIsDrawingWhiteout(false);
      setWhiteoutStart(null);
      setWhiteoutCurrent(null);
      return;
    }

    const minX = Math.min(whiteoutStart.x, whiteoutCurrent.x);
    const maxX = Math.max(whiteoutStart.x, whiteoutCurrent.x);
    const minY = Math.min(whiteoutStart.y, whiteoutCurrent.y);
    const maxY = Math.max(whiteoutStart.y, whiteoutCurrent.y);
    const screenWidth = maxX - minX;
    const screenHeight = maxY - minY;

    if (screenWidth > 5 && screenHeight > 5) {
      const imgCoords = screenToImageCoords(minX, minY);
      const newWhiteout: ScreenshotWhiteout = {
        id: createId(),
        x: imgCoords.x,
        y: imgCoords.y,
        width: Math.round(screenWidth / zoom),
        height: Math.round(screenHeight / zoom),
        color: "#ffffff",
      };

      updateCurrentPage((prev) => ({
        ...prev,
        whiteouts: [...prev.whiteouts, newWhiteout],
      }));
      toast.success("Erased area");
    }

    setIsDrawingWhiteout(false);
    setWhiteoutStart(null);
    setWhiteoutCurrent(null);
  };

  // Dragging added elements
  const handleDragStart = (id: string, clientX: number, clientY: number, elX: number, elY: number) => {
    setSelectedAddedId(id);
    setDraggingId(id);
    setDragOffset({
      x: clientX - elX * zoom,
      y: clientY - elY * zoom,
    });
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!draggingId || !containerRef.current || !currentPage) return;
    const rect = containerRef.current.getBoundingClientRect();
    const screenX = clientX - rect.left - dragOffset.x;
    const screenY = clientY - rect.top - dragOffset.y;

    const imgX = Math.max(0, Math.min(currentPage.width - 50, Math.round(screenX / zoom)));
    const imgY = Math.max(0, Math.min(currentPage.height - 30, Math.round(screenY / zoom)));

    updateCurrentPage((prev) => {
      const textIndex = prev.addedTexts.findIndex((t) => t.id === draggingId);
      if (textIndex !== -1) {
        const updated = [...prev.addedTexts];
        updated[textIndex] = { ...updated[textIndex], x: imgX, y: imgY };
        return { ...prev, addedTexts: updated };
      }
      return prev;
    });
  };

  const handleDragEnd = () => {
    setDraggingId(null);
  };

  // Export to PDF (Download PDF only)
  const handleExportPdf = async () => {
    if (pages.length === 0 || exporting) return;

    setExporting(true);
    try {
      const pdfBytes = await exportScreenshotsToPdf(pages);
      downloadPdf(pdfBytes, "screenshot-edit.pdf");
      toast.success("PDF downloaded successfully!");
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error("Failed to generate PDF.");
    } finally {
      setExporting(false);
    }
  };

  // Page navigation and deletion
  const handleDeleteCurrentPage = () => {
    if (pages.length === 0) return;
    setPages((prev) => prev.filter((_, idx) => idx !== currentPageIndex));
    setCurrentPageIndex((prev) => Math.max(0, Math.min(prev, pages.length - 2)));
    toast.success("Screenshot removed");
  };

  const handleMovePage = (direction: -1 | 1) => {
    const target = currentPageIndex + direction;
    if (target < 0 || target >= pages.length) return;

    setPages((prev) => {
      const updated = [...prev];
      const temp = updated[currentPageIndex];
      updated[currentPageIndex] = updated[target];
      updated[target] = temp;
      return updated;
    });
    setCurrentPageIndex(target);
  };

  // Render empty state if no screenshot uploaded
  if (pages.length === 0) {
    return (
      <div className="container max-w-4xl py-10 space-y-6">
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
          }}
          className="flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-card p-8 text-center transition-colors hover:border-primary/50"
        >
          <Upload className="mb-3 h-10 w-10 text-primary" />
          <p className="text-base font-medium">{t("tools.screenshotEditor.drop")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("tools.screenshotEditor.emptyHint")}</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            multiple
            className="hidden"
            onChange={(e) => handleFilesSelected(e.target.files)}
          />
        </div>
        <EmptyState
          icon={<Type className="h-8 w-8" />}
          title={t("tools.screenshotEditor.emptyTitle")}
          hint={t("tools.screenshotEditor.emptyHint")}
        />
      </div>
    );
  }

  return (
    <div
      className="flex flex-col min-h-[calc(100vh-4rem)] bg-muted/20"
      onMouseMove={(e) => {
        handleWhiteoutMouseMove(e);
        if (draggingId) handleDragMove(e.clientX, e.clientY);
      }}
      onMouseUp={() => {
        handleWhiteoutMouseUp();
        if (draggingId) handleDragEnd();
      }}
      onTouchMove={(e) => {
        if (draggingId && e.touches[0]) {
          handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
        }
      }}
      onTouchEnd={() => {
        if (draggingId) handleDragEnd();
      }}
    >
      {/* Hidden file input for adding more screenshots */}
      <input
        ref={addFileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        multiple
        className="hidden"
        onChange={(e) => handleFilesSelected(e.target.files)}
      />

      {/* Top Toolbar */}
      <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-2 border-b bg-background/95 px-4 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-sm">
        {/* Left: Tools */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <Button
            variant={activeTool === "select" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTool("select")}
            className="gap-1.5 text-xs h-8"
          >
            <MousePointer className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Select & Edit</span>
          </Button>

          <Button
            variant={activeTool === "addText" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTool("addText")}
            className="gap-1.5 text-xs h-8"
          >
            <Type className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Add Text</span>
          </Button>

          <Button
            variant={activeTool === "eraser" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTool("eraser")}
            className="gap-1.5 text-xs h-8"
          >
            <Eraser className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Eraser</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => runOcrForCurrentPage()}
            disabled={currentPage?.ocrStatus === "loading"}
            className="gap-1.5 text-xs h-8"
            title="Re-run OCR on this screenshot"
          >
            {currentPage?.ocrStatus === "loading" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            )}
            <span className="hidden md:inline">Scan OCR</span>
          </Button>
        </div>

        {/* Center: Pagination / Multi-screenshot Navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={currentPageIndex === 0}
            onClick={() => setCurrentPageIndex((prev) => prev - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
            {currentPageIndex + 1} / {pages.length}
          </span>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={currentPageIndex === pages.length - 1}
            onClick={() => setCurrentPageIndex((prev) => prev + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => addFileInputRef.current?.click()}
            className="gap-1 text-xs h-8"
            title="Add more screenshots"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Add</span>
          </Button>

          {pages.length > 1 && (
            <>
              <div className="hidden md:flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={currentPageIndex === 0}
                  onClick={() => handleMovePage(-1)}
                  title="Move Screenshot Left"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={currentPageIndex === pages.length - 1}
                  onClick={() => handleMovePage(1)}
                  title="Move Screenshot Right"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                onClick={handleDeleteCurrentPage}
                title="Delete current screenshot"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>

        {/* Right: Zoom & Export PDF */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.15).toFixed(2))))}
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs text-muted-foreground min-w-[3rem] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setZoom((z) => Math.min(2.5, Number((z + 0.15).toFixed(2))))}
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
          </div>

          <Button
            variant="default"
            size="sm"
            onClick={handleExportPdf}
            disabled={exporting}
            className="gap-1.5 text-xs h-8 font-medium bg-primary hover:bg-primary/90"
          >
            {exporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Download PDF
          </Button>
        </div>
      </div>

      {/* OCR Status Banner if scanning */}
      {currentPage?.ocrStatus === "loading" && (
        <div className="bg-primary/10 border-b border-primary/20 px-4 py-1.5 flex items-center justify-center gap-2 text-xs text-primary font-medium">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Detecting text in screenshot… ({currentPage.ocrProgress}%)</span>
        </div>
      )}

      {/* Main Viewport Workspace */}
      <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
        {currentPage && (
          <div
            ref={containerRef}
            onClick={handleViewportClick}
            onMouseDown={handleWhiteoutMouseDown}
            className="relative shadow-xl rounded border bg-background overflow-visible select-none transition-transform duration-75"
            style={{
              width: currentPage.width * zoom,
              height: currentPage.height * zoom,
              cursor:
                activeTool === "addText"
                  ? "crosshair"
                  : activeTool === "eraser"
                  ? "crosshair"
                  : "default",
            }}
          >
            {/* Base Screenshot Canvas */}
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 pointer-events-none rounded"
              style={{
                width: currentPage.width * zoom,
                height: currentPage.height * zoom,
              }}
            />

            {/* Deleted Text Masks */}
            {currentPage.deletedTextIds.map((delId) => {
              const item = currentPage.detectedTexts.find((t) => t.id === delId);
              if (!item) return null;
              return (
                <div
                  key={`del-${item.id}`}
                  className="absolute pointer-events-none transition-opacity"
                  style={{
                    left: (item.x - 2) * zoom,
                    top: (item.y - 2) * zoom,
                    width: (item.width + 4) * zoom,
                    height: (item.height + 4) * zoom,
                    backgroundColor: item.bgColor || "#ffffff",
                  }}
                />
              );
            })}

            {/* Modified Text Elements (Mask + Replacement Text) */}
            {Object.values(currentPage.modifiedTexts).map((mod) => (
              <div
                key={`mod-${mod.id}`}
                onClick={(e) => {
                  const original = currentPage.detectedTexts.find((t) => t.id === mod.id);
                  if (original) handleDetectedItemClick(original, e);
                }}
                className="absolute cursor-pointer group"
                style={{
                  left: (mod.x - 2) * zoom,
                  top: (mod.y - 2) * zoom,
                  width: Math.max((mod.width + 4) * zoom, 20),
                  height: (mod.height + 4) * zoom,
                  backgroundColor: mod.bgColor || "#ffffff",
                }}
              >
                <span
                  style={{
                    fontSize: `${mod.fontSize * zoom}px`,
                    color: mod.color || "#000000",
                    fontFamily: resolveCssFontFamily(mod.fontFamily, mod.detectedFontName),
                    lineHeight: 1.1,
                    display: "block",
                    paddingLeft: `${2 * zoom}px`,
                  }}
                >
                  {mod.newText}
                </span>
                <span className="absolute inset-0 border border-primary/50 opacity-0 group-hover:opacity-100 rounded-sm" />
              </div>
            ))}

            {/* Detected OCR Text Items (interactive boxes when untouched) */}
            {currentPage.detectedTexts.map((item) => {
              const isModified = Boolean(currentPage.modifiedTexts[item.id]);
              const isDeleted = currentPage.deletedTextIds.includes(item.id);
              if (isModified || isDeleted) return null;

              return (
                <div
                  key={item.id}
                  onClick={(e) => handleDetectedItemClick(item, e)}
                  title="Click to edit text"
                  className="absolute cursor-pointer border border-transparent hover:border-primary/60 hover:bg-primary/10 rounded-sm transition-colors"
                  style={{
                    left: item.x * zoom,
                    top: item.y * zoom,
                    width: item.width * zoom,
                    height: item.height * zoom,
                  }}
                />
              );
            })}

            {/* Whiteout / Eraser Rectangles */}
            {currentPage.whiteouts.map((w) => (
              <div
                key={w.id}
                className="absolute pointer-events-none"
                style={{
                  left: w.x * zoom,
                  top: w.y * zoom,
                  width: w.width * zoom,
                  height: w.height * zoom,
                  backgroundColor: w.color || "#ffffff",
                }}
              />
            ))}

            {/* Added Text Elements */}
            {currentPage.addedTexts.map((added) => {
              const isSelected = selectedAddedId === added.id;
              return (
                <div
                  key={added.id}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    handleDragStart(added.id, e.clientX, e.clientY, added.x, added.y);
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    if (e.touches[0]) {
                      handleDragStart(added.id, e.touches[0].clientX, e.touches[0].clientY, added.x, added.y);
                    }
                  }}
                  className={`absolute cursor-move select-none p-1 rounded transition-shadow ${
                    isSelected ? "ring-2 ring-primary bg-background/90" : "hover:ring-1 hover:ring-primary/40"
                  }`}
                  style={{
                    left: added.x * zoom,
                    top: added.y * zoom,
                    width: added.width * zoom,
                    height: added.height * zoom,
                    backgroundColor: added.bgColor || "transparent",
                  }}
                >
                  <span
                    style={{
                      fontSize: `${added.fontSize * zoom}px`,
                      color: added.color || "#000000",
                      fontFamily: resolveCssFontFamily(added.fontFamily),
                      fontWeight: added.bold ? "bold" : "normal",
                      fontStyle: added.italic ? "italic" : "normal",
                      lineHeight: 1.1,
                      display: "block",
                    }}
                  >
                    {added.text}
                  </span>

                  {isSelected && (
                    <div className="absolute -top-7 right-0 flex items-center gap-1 bg-background border rounded shadow-md px-1.5 py-0.5 z-20">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateCurrentPage((prev) => ({
                            ...prev,
                            addedTexts: prev.addedTexts.filter((t) => t.id !== added.id),
                          }));
                          setSelectedAddedId(null);
                        }}
                        className="text-destructive hover:text-destructive/80 p-0.5"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* In-progress Whiteout marquee rectangle */}
            {isDrawingWhiteout && whiteoutStart && whiteoutCurrent && (
              <div
                className="absolute border border-dashed border-red-500 bg-red-500/20 pointer-events-none"
                style={{
                  left: Math.min(whiteoutStart.x, whiteoutCurrent.x),
                  top: Math.min(whiteoutStart.y, whiteoutCurrent.y),
                  width: Math.abs(whiteoutCurrent.x - whiteoutStart.x),
                  height: Math.abs(whiteoutCurrent.y - whiteoutStart.y),
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Inline Text Editing Modal / Popover */}
      {activeEditingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <Card className="w-full max-w-md p-5 shadow-2xl space-y-4 bg-background border animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Type className="h-4 w-4 text-primary" />
                Edit Text
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setActiveEditingItem(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Original text preview */}
            <div className="text-xs text-muted-foreground bg-muted/40 p-2 rounded">
              <span className="font-medium">Original: </span>
              <span className="italic">{activeEditingItem.item.text}</span>
            </div>

            {/* Text Input */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Replacement Text</Label>
              <Input
                value={activeEditingItem.replacementText}
                onChange={(e) =>
                  setActiveEditingItem((prev) =>
                    prev ? { ...prev, replacementText: e.target.value } : null
                  )
                }
                autoFocus
                placeholder="Type new text…"
                className="text-sm"
              />
            </div>

            {/* Font and Color Settings */}
            <div className="space-y-2">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Font</Label>
                <FontPicker
                  value={activeEditingItem.fontFamily}
                  detectedFontName={activeEditingItem.item.detectedFontName}
                  allowAutoDetect={true}
                  onChange={(fontId) =>
                    setActiveEditingItem((prev) =>
                      prev ? { ...prev, fontFamily: fontId } : null
                    )
                  }
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Size (px)</Label>
                  <Input
                    type="number"
                    min="8"
                    max="120"
                    value={activeEditingItem.fontSize}
                    onChange={(e) =>
                      setActiveEditingItem((prev) =>
                        prev ? { ...prev, fontSize: Number(e.target.value) || 12 } : null
                      )
                    }
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Text Color</Label>
                  <div className="flex items-center gap-1.5 h-8 border rounded px-1.5 bg-background">
                    <input
                      type="color"
                      value={activeEditingItem.color}
                      onChange={(e) =>
                        setActiveEditingItem((prev) =>
                          prev ? { ...prev, color: e.target.value } : null
                        )
                      }
                      className="h-5 w-6 cursor-pointer border-0 bg-transparent p-0"
                    />
                    <span className="text-[11px] font-mono">{activeEditingItem.color}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Mask Color</Label>
                  <div className="flex items-center gap-1.5 h-8 border rounded px-1.5 bg-background">
                    <input
                      type="color"
                      value={activeEditingItem.bgColor}
                      onChange={(e) =>
                        setActiveEditingItem((prev) =>
                          prev ? { ...prev, bgColor: e.target.value } : null
                        )
                      }
                      className="h-5 w-6 cursor-pointer border-0 bg-transparent p-0"
                    />
                    <span className="text-[11px] font-mono">{activeEditingItem.bgColor}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteDetectedItem(activeEditingItem.item)}
                  className="h-8 text-xs text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Delete
                </Button>

                {currentPage?.modifiedTexts[activeEditingItem.item.id] && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRestoreDetectedItem(activeEditingItem.item)}
                    className="h-8 text-xs"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Restore
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveEditingItem(null)}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveDetectedEdit}
                  className="h-8 text-xs font-medium"
                >
                  Apply Edit
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Selected Added Item Properties Bar */}
      {selectedAddedId && currentPage && (
        <div className="sticky bottom-0 z-20 border-t bg-background/95 px-4 py-2 flex flex-wrap items-center justify-between gap-3 shadow-lg">
          {(() => {
            const item = currentPage.addedTexts.find((t) => t.id === selectedAddedId);
            if (!item) return null;
            return (
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <span className="text-xs font-semibold text-primary">Edit Added Text:</span>
                <Input
                  value={item.text}
                  onChange={(e) => {
                    const text = e.target.value;
                    updateCurrentPage((prev) => {
                      const idx = prev.addedTexts.findIndex((t) => t.id === selectedAddedId);
                      if (idx === -1) return prev;
                      const updated = [...prev.addedTexts];
                      updated[idx] = { ...updated[idx], text };
                      return { ...prev, addedTexts: updated };
                    });
                  }}
                  className="h-7 text-xs max-w-[200px]"
                />

                <div className="w-44">
                  <FontPicker
                    value={item.fontFamily}
                    allowAutoDetect={false}
                    onChange={(fontId) => {
                      updateCurrentPage((prev) => {
                        const idx = prev.addedTexts.findIndex((t) => t.id === selectedAddedId);
                        if (idx === -1) return prev;
                        const updated = [...prev.addedTexts];
                        updated[idx] = { ...updated[idx], fontFamily: fontId };
                        return { ...prev, addedTexts: updated };
                      });
                    }}
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <Label className="text-[11px] text-muted-foreground">Size:</Label>
                  <Input
                    type="number"
                    min="8"
                    max="100"
                    value={item.fontSize}
                    onChange={(e) => {
                      const fontSize = Number(e.target.value) || 14;
                      updateCurrentPage((prev) => {
                        const idx = prev.addedTexts.findIndex((t) => t.id === selectedAddedId);
                        if (idx === -1) return prev;
                        const updated = [...prev.addedTexts];
                        updated[idx] = { ...updated[idx], fontSize };
                        return { ...prev, addedTexts: updated };
                      });
                    }}
                    className="h-7 w-16 text-xs"
                  />
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant={item.bold ? "default" : "outline"}
                    size="sm"
                    className="h-7 px-2 font-bold text-xs"
                    onClick={() => {
                      updateCurrentPage((prev) => {
                        const idx = prev.addedTexts.findIndex((t) => t.id === selectedAddedId);
                        if (idx === -1) return prev;
                        const updated = [...prev.addedTexts];
                        updated[idx] = { ...updated[idx], bold: !updated[idx].bold };
                        return { ...prev, addedTexts: updated };
                      });
                    }}
                  >
                    B
                  </Button>
                  <Button
                    type="button"
                    variant={item.italic ? "default" : "outline"}
                    size="sm"
                    className="h-7 px-2 italic text-xs"
                    onClick={() => {
                      updateCurrentPage((prev) => {
                        const idx = prev.addedTexts.findIndex((t) => t.id === selectedAddedId);
                        if (idx === -1) return prev;
                        const updated = [...prev.addedTexts];
                        updated[idx] = { ...updated[idx], italic: !updated[idx].italic };
                        return { ...prev, addedTexts: updated };
                      });
                    }}
                  >
                    I
                  </Button>
                </div>

                <div className="flex items-center gap-1.5">
                  <Label className="text-[11px] text-muted-foreground">Color:</Label>
                  <input
                    type="color"
                    value={item.color}
                    onChange={(e) => {
                      const color = e.target.value;
                      updateCurrentPage((prev) => {
                        const idx = prev.addedTexts.findIndex((t) => t.id === selectedAddedId);
                        if (idx === -1) return prev;
                        const updated = [...prev.addedTexts];
                        updated[idx] = { ...updated[idx], color };
                        return { ...prev, addedTexts: updated };
                      });
                    }}
                    className="h-6 w-8 cursor-pointer rounded border"
                  />
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedAddedId(null)}
                  className="h-7 text-xs ml-auto"
                >
                  Done
                </Button>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
