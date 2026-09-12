"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eraser,
  Image as ImageIcon,
  Loader2,
  MousePointer,
  Move,
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
import { NativeSelect } from "@/components/ui/select";
import { EmptyState } from "@/components/pdf/empty-state";
import { loadPdfJsDocument } from "@/lib/pdf-render";
import { downloadPdf } from "@/lib/pdf";
import { createId } from "@/lib/utils";
import {
  AddedImageItem,
  AddedTextItem,
  EditorDocEdits,
  EditorTextItem,
  EditorTool,
  TextReplacement,
  WhiteoutItem,
  applyPdfEdits,
  emptyPageEdits,
  extractPageTextItems,
  ocrPageToTextItems,
} from "@/lib/pdf-editor";
import { FontPicker } from "@/components/pdf/font-picker";
import { resolveCssFontFamily } from "@/lib/fonts";
import { useT } from "@/components/i18n/language-provider";

export function PdfEditorClient() {
  const t = useT();

  // File state
  const [file, setFile] = useState<File | null>(null);
  const [originalBytes, setOriginalBytes] = useState<ArrayBuffer | null>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  // View state
  const [zoom, setZoom] = useState(1.0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number }>({ width: 595, height: 842 });
  const [isScannedPage, setIsScannedPage] = useState(false);

  // Active Tool state
  const [activeTool, setActiveTool] = useState<EditorTool>("select");

  // Document Edits (keyed by page number)
  const [edits, setEdits] = useState<EditorDocEdits>({});

  // Detected text items on current page
  const [textItems, setTextItems] = useState<EditorTextItem[]>([]);

  // Selected/editing text item for inline replacement
  const [activeEditingItem, setActiveEditingItem] = useState<{
    item: EditorTextItem;
    replacementText: string;
    fontSize: number;
    fontFamily: string;
    color: string;
  } | null>(null);

  // Selected added item for moving/styling
  const [selectedAddedId, setSelectedAddedId] = useState<string | null>(null);

  // Whiteout drawing state
  const [isDrawingWhiteout, setIsDrawingWhiteout] = useState(false);
  const [whiteoutStart, setWhiteoutStart] = useState<{ x: number; y: number } | null>(null);
  const [whiteoutCurrent, setWhiteoutCurrent] = useState<{ x: number; y: number } | null>(null);

  // Element dragging state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const getPageEdits = useCallback(
    (pageNum: number) => {
      return edits[pageNum] || emptyPageEdits();
    },
    [edits]
  );

  const updateCurrentPageEdits = useCallback(
    (updater: (prev: ReturnType<typeof emptyPageEdits>) => ReturnType<typeof emptyPageEdits>) => {
      setEdits((prev) => {
        const current = prev[currentPage] || emptyPageEdits();
        return {
          ...prev,
          [currentPage]: updater(current),
        };
      });
    },
    [currentPage]
  );

  // Handle PDF file upload
  const handlePdfUpload = async (incomingFile: File) => {
    setLoading(true);
    try {
      const buffer = await incomingFile.arrayBuffer();
      const doc = await loadPdfJsDocument(incomingFile);
      setFile(incomingFile);
      setOriginalBytes(buffer);
      setPdfDoc(doc);
      setPageCount(doc.numPages);
      setCurrentPage(1);
      setEdits({});
      toast.success(t("upload.pdfLoaded"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("errors.readPdf"));
    } finally {
      setLoading(false);
    }
  };

  // Render current page canvas and extract text items
  useEffect(() => {
    if (!pdfDoc) return;
    let isCancelled = false;

    const render = async () => {
      try {
        const page: PDFPageProxy = await pdfDoc.getPage(currentPage);
        if (isCancelled) return;

        const viewport = page.getViewport({ scale: 1 });
        const width = viewport.width;
        const height = viewport.height;
        setPageDimensions({ width, height });

        // Render to canvas at crisp display scale (zoom * devicePixelRatio or 1.5)
        const renderScale = Math.max(1, zoom * (window.devicePixelRatio || 1.5));
        const scaledViewport = page.getViewport({ scale: renderScale });

        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = Math.floor(scaledViewport.width);
          canvas.height = Math.floor(scaledViewport.height);
          canvas.style.width = `${Math.floor(width * zoom)}px`;
          canvas.style.height = `${Math.floor(height * zoom)}px`;

          const ctx = canvas.getContext("2d", { alpha: false });
          if (ctx) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
          }
        }

        // Extract selectable text items
        const items = await extractPageTextItems(page);
        if (!isCancelled) {
          setTextItems(items);
          setIsScannedPage(items.length < 5);
        }
      } catch (err) {
        console.error("Page render error:", err);
      }
    };

    render();

    return () => {
      isCancelled = true;
    };
  }, [pdfDoc, currentPage, zoom]);

  // Coordinate transforms between screen/overlay and PDF coordinates
  const screenToPdfCoords = useCallback(
    (screenX: number, screenY: number, boxHeight = 0) => {
      const pdfX = screenX / zoom;
      const pdfY = pageDimensions.height - screenY / zoom - boxHeight;
      return { x: pdfX, y: pdfY };
    },
    [zoom, pageDimensions.height]
  );

  const pdfToScreenCoords = useCallback(
    (pdfX: number, pdfY: number, boxHeight = 0) => {
      const screenX = pdfX * zoom;
      const screenY = (pageDimensions.height - (pdfY + boxHeight)) * zoom;
      return { x: screenX, y: screenY };
    },
    [zoom, pageDimensions.height]
  );

  // Handle OCR for scanned pages
  const handleRunOcr = async () => {
    if (!canvasRef.current || ocrLoading) return;
    setOcrLoading(true);
    setOcrProgress(0);
    try {
      const ocrItems = await ocrPageToTextItems(canvasRef.current, pageDimensions.height, (pct) => {
        setOcrProgress(pct);
      });
      setTextItems((prev) => [...prev, ...ocrItems]);
      setIsScannedPage(false);
      toast.success(t("tools.pdfEditor.ocrDone"));
    } catch {
      toast.error(t("errors.processing"));
    } finally {
      setOcrLoading(false);
    }
  };

  // Inline text editing handlers
  const handleSelectTextItem = (item: EditorTextItem) => {
    if (activeTool !== "select") return;
    const currentEdits = getPageEdits(currentPage);
    const existingReplacement = currentEdits.replacements.find((r) => r.id === item.id);

    setActiveEditingItem({
      item,
      replacementText: existingReplacement ? existingReplacement.newText : item.text,
      fontSize: existingReplacement ? existingReplacement.fontSize : item.fontSize,
      fontFamily: existingReplacement ? existingReplacement.fontFamily : "auto",
      color: existingReplacement ? existingReplacement.color : item.color || "#000000",
    });
  };

  const handleSaveTextReplacement = () => {
    if (!activeEditingItem) return;
    const { item, replacementText, fontSize, fontFamily, color } = activeEditingItem;

    updateCurrentPageEdits((prev) => {
      const filtered = prev.replacements.filter((r) => r.id !== item.id);
      const newRep: TextReplacement = {
        id: item.id,
        originalText: item.text,
        newText: replacementText,
        x: item.x,
        y: item.y,
        width: Math.max(item.width, replacementText.length * (fontSize * 0.5)),
        height: Math.max(item.height, fontSize * 1.2),
        fontSize,
        fontFamily,
        detectedFontName: item.detectedFontName,
        color,
        isDeleted: false,
      };
      return {
        ...prev,
        replacements: [...filtered, newRep],
      };
    });

    setActiveEditingItem(null);
    toast.success("Text updated");
  };

  const handleDeleteTextItem = () => {
    if (!activeEditingItem) return;
    const { item } = activeEditingItem;

    updateCurrentPageEdits((prev) => {
      const filtered = prev.replacements.filter((r) => r.id !== item.id);
      const deletedRep: TextReplacement = {
        id: item.id,
        originalText: item.text,
        newText: "",
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height,
        fontSize: item.fontSize,
        fontFamily: "auto",
        detectedFontName: item.detectedFontName,
        color: "#000000",
        isDeleted: true,
      };
      return {
        ...prev,
        replacements: [...filtered, deletedRep],
      };
    });

    setActiveEditingItem(null);
    toast.success("Text deleted");
  };

  // Add new text box
  const handleAddText = () => {
    const id = createId();
    // Center in current view
    const initialWidth = 140;
    const initialHeight = 24;
    const initialPdfX = Math.max(20, (pageDimensions.width - initialWidth) / 2);
    const initialPdfY = Math.max(20, (pageDimensions.height - initialHeight) / 2);

    const newItem: AddedTextItem = {
      id,
      text: "New text",
      x: initialPdfX,
      y: initialPdfY,
      width: initialWidth,
      height: initialHeight,
      fontSize: 14,
      fontFamily: "Helvetica",
      color: "#000000",
      bold: false,
      italic: false,
    };

    updateCurrentPageEdits((prev) => ({
      ...prev,
      addedTexts: [...prev.addedTexts, newItem],
    }));

    setSelectedAddedId(id);
    setActiveTool("select");
    toast.success("Added text box");
  };

  // Add new image
  const handleImageSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    const imgFile = files[0];
    event.target.value = "";

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const aspect = img.width / (img.height || 1);
        const targetWidth = Math.min(180, pageDimensions.width * 0.4);
        const targetHeight = targetWidth / aspect;

        const newItem: AddedImageItem = {
          id: createId(),
          dataUrl,
          x: Math.max(20, (pageDimensions.width - targetWidth) / 2),
          y: Math.max(20, (pageDimensions.height - targetHeight) / 2),
          width: targetWidth,
          height: targetHeight,
        };

        updateCurrentPageEdits((prev) => ({
          ...prev,
          addedImages: [...prev.addedImages, newItem],
        }));

        setSelectedAddedId(newItem.id);
        setActiveTool("select");
        toast.success("Image added");
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(imgFile);
  };

  // Whiteout drawing handlers
  const handleOverlayMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool !== "whiteout") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setIsDrawingWhiteout(true);
    setWhiteoutStart({ x, y });
    setWhiteoutCurrent({ x, y });
  };

  const handleOverlayMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawingWhiteout || !whiteoutStart) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setWhiteoutCurrent({ x, y });
  };

  const handleOverlayMouseUp = () => {
    if (!isDrawingWhiteout || !whiteoutStart || !whiteoutCurrent) {
      setIsDrawingWhiteout(false);
      return;
    }

    const minX = Math.min(whiteoutStart.x, whiteoutCurrent.x);
    const maxX = Math.max(whiteoutStart.x, whiteoutCurrent.x);
    const minY = Math.min(whiteoutStart.y, whiteoutCurrent.y);
    const maxY = Math.max(whiteoutStart.y, whiteoutCurrent.y);
    const screenWidth = maxX - minX;
    const screenHeight = maxY - minY;

    if (screenWidth > 5 && screenHeight > 5) {
      const pdfCoords = screenToPdfCoords(minX, minY, screenHeight / zoom);
      const newWhiteout: WhiteoutItem = {
        id: createId(),
        x: pdfCoords.x,
        y: pdfCoords.y,
        width: screenWidth / zoom,
        height: screenHeight / zoom,
        color: "#ffffff",
      };

      updateCurrentPageEdits((prev) => ({
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
  const handleElementDragStart = (id: string, clientX: number, clientY: number, elX: number, elY: number) => {
    setSelectedAddedId(id);
    setDraggingId(id);
    setDragOffset({
      x: clientX - elX,
      y: clientY - elY,
    });
  };

  const handleElementDragMove = (clientX: number, clientY: number) => {
    if (!draggingId || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const screenX = clientX - containerRect.left - dragOffset.x;
    const screenY = clientY - containerRect.top - dragOffset.y;

    updateCurrentPageEdits((prev) => {
      // Check added texts
      const textIndex = prev.addedTexts.findIndex((t) => t.id === draggingId);
      if (textIndex !== -1) {
        const item = prev.addedTexts[textIndex];
        const pdfCoords = screenToPdfCoords(screenX, screenY, item.height);
        const updated = [...prev.addedTexts];
        updated[textIndex] = {
          ...item,
          x: Math.max(0, Math.min(pageDimensions.width - item.width, pdfCoords.x)),
          y: Math.max(0, Math.min(pageDimensions.height - item.height, pdfCoords.y)),
        };
        return { ...prev, addedTexts: updated };
      }

      // Check added images
      const imgIndex = prev.addedImages.findIndex((img) => img.id === draggingId);
      if (imgIndex !== -1) {
        const item = prev.addedImages[imgIndex];
        const pdfCoords = screenToPdfCoords(screenX, screenY, item.height);
        const updated = [...prev.addedImages];
        updated[imgIndex] = {
          ...item,
          x: Math.max(0, Math.min(pageDimensions.width - item.width, pdfCoords.x)),
          y: Math.max(0, Math.min(pageDimensions.height - item.height, pdfCoords.y)),
        };
        return { ...prev, addedImages: updated };
      }

      return prev;
    });
  };

  const handleElementDragEnd = () => {
    setDraggingId(null);
  };

  // Delete an added element
  const handleDeleteAddedItem = (id: string) => {
    updateCurrentPageEdits((prev) => ({
      ...prev,
      addedTexts: prev.addedTexts.filter((t) => t.id !== id),
      addedImages: prev.addedImages.filter((img) => img.id !== id),
      whiteouts: prev.whiteouts.filter((w) => w.id !== id),
    }));
    setSelectedAddedId(null);
    toast.success("Element deleted");
  };

  // Resize an added image
  const handleResizeImage = (id: string, deltaWidth: number) => {
    updateCurrentPageEdits((prev) => {
      const idx = prev.addedImages.findIndex((img) => img.id === id);
      if (idx === -1) return prev;
      const item = prev.addedImages[idx];
      const aspect = item.width / item.height;
      const newWidth = Math.max(30, item.width + deltaWidth);
      const newHeight = newWidth / aspect;
      const updated = [...prev.addedImages];
      updated[idx] = { ...item, width: newWidth, height: newHeight };
      return { ...prev, addedImages: updated };
    });
  };

  // Save and download the final edited PDF
  const handleSaveAndDownload = async () => {
    if (!originalBytes) {
      toast.error(t("errors.uploadPdfFirst"));
      return;
    }
    setSaving(true);
    try {
      const editedBytes = await applyPdfEdits(originalBytes, edits);
      const originalName = file?.name?.replace(/\.[^.]+$/, "") || "document";
      downloadPdf(editedBytes, `${originalName}-edited.pdf`);
      toast.success(t("success.ready"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("errors.conversion"));
    } finally {
      setSaving(false);
    }
  };

  const currentPageEdits = getPageEdits(currentPage);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-10">
      {/* Title Header */}
      <div className="mb-6 animate-fade-in">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("tools.pdfEditor.pageTitle")}</h1>
        <p className="mt-1 text-muted-foreground">{t("tools.pdfEditor.pageDesc")}</p>
      </div>

      {!file ? (
        /* Empty State & Upload Dropzone */
        <div className="space-y-6">
          <div
            role="button"
            tabIndex={0}
            onClick={() => imageInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") imageInputRef.current?.click();
            }}
            className="flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-card p-8 text-center transition-colors hover:border-primary/50"
          >
            <Upload className="mb-3 h-10 w-10 text-primary" />
            <p className="text-base font-medium">{t("tools.pdfEditor.drop")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("upload.hintPdf")}</p>
            <input
              ref={imageInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) handlePdfUpload(e.target.files[0]);
              }}
            />
          </div>
          <EmptyState
            icon={<Type className="h-8 w-8" />}
            title={t("tools.pdfEditor.emptyTitle")}
            hint={t("tools.pdfEditor.emptyHint")}
          />
        </div>
      ) : (
        /* PDF Editor Workspace */
        <div className="space-y-4">
          {/* Main Top Toolbar */}
          <Card className="p-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Tool Selection Group */}
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  type="button"
                  variant={activeTool === "select" ? "default" : "outline"}
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setActiveTool("select")}
                >
                  <MousePointer className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("tools.pdfEditor.selectTool")}</span>
                </Button>

                <Button
                  type="button"
                  variant={activeTool === "add-text" ? "default" : "outline"}
                  size="sm"
                  className="gap-1.5"
                  onClick={handleAddText}
                >
                  <Type className="h-4 w-4" />
                  <span>{t("tools.pdfEditor.addText")}</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => imageInputRef.current?.click()}
                >
                  <ImageIcon className="h-4 w-4" />
                  <span>{t("tools.pdfEditor.addImage")}</span>
                </Button>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                  className="hidden"
                  onChange={handleImageSelected}
                />

                <Button
                  type="button"
                  variant={activeTool === "whiteout" ? "default" : "outline"}
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setActiveTool("whiteout")}
                >
                  <Eraser className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("tools.pdfEditor.whiteout")}</span>
                </Button>

                {isScannedPage && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="gap-1.5 text-amber-800 dark:text-amber-300"
                    disabled={ocrLoading}
                    onClick={handleRunOcr}
                  >
                    {ocrLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>
                          {t("tools.pdfEditor.ocrRunning")} ({ocrProgress}%)
                        </span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 text-amber-500" />
                        <span>{t("tools.pdfEditor.ocrTool")}</span>
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* Navigation & Zoom Group */}
              <div className="flex items-center gap-2">
                {/* Page Navigation */}
                <div className="flex items-center gap-1 text-sm font-medium">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={currentPage <= 1 || loading}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="whitespace-nowrap px-1 text-xs sm:text-sm">
                    {currentPage} / {pageCount}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={currentPage >= pageCount || loading}
                    onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                {/* Zoom */}
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={zoom <= 0.6}
                    onClick={() => setZoom((z) => Math.max(0.5, Math.round((z - 0.15) * 100) / 100))}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="w-11 text-center text-xs font-semibold">{Math.round(zoom * 100)}%</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={zoom >= 2.0}
                    onClick={() => setZoom((z) => Math.min(2.0, Math.round((z + 0.15) * 100) / 100))}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </div>

                {/* Save & Download Action */}
                <Button
                  type="button"
                  size="sm"
                  className="gap-2 bg-primary font-medium text-primary-foreground shadow"
                  disabled={saving || loading}
                  onClick={handleSaveAndDownload}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  <span>{saving ? t("tools.pdfEditor.saving") : t("tools.pdfEditor.save")}</span>
                </Button>
              </div>
            </div>

            {/* Hint bar based on tool */}
            <div className="mt-2 border-t pt-2 text-xs text-muted-foreground">
              {activeTool === "select" && "Click any text on the page to edit or delete it in-place."}
              {activeTool === "add-text" && "Click 'Add Text' above to insert movable text boxes anywhere on the page."}
              {activeTool === "add-image" && "Add images, signatures, or stamps onto your PDF."}
              {activeTool === "whiteout" && "Click and drag across any area on the document to erase/whiteout content."}
            </div>
          </Card>

          {/* Interactive Document Workspace */}
          <div
            className="relative flex justify-center overflow-auto rounded-xl border bg-muted/30 p-4 sm:p-8"
            onMouseMove={(e) => {
              if (draggingId) handleElementDragMove(e.clientX, e.clientY);
            }}
            onMouseUp={() => {
              if (draggingId) handleElementDragEnd();
            }}
          >
            <div
              ref={containerRef}
              className="relative shadow-lg select-none"
              style={{
                width: `${pageDimensions.width * zoom}px`,
                height: `${pageDimensions.height * zoom}px`,
              }}
              onMouseDown={handleOverlayMouseDown}
              onMouseMove={handleOverlayMouseMove}
              onMouseUp={handleOverlayMouseUp}
            >
              {/* Underlying Base PDF Canvas */}
              <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none block" />

              {/* Interactive Editing Layer */}
              <div className="absolute inset-0 overflow-hidden">
                {/* 1. Whiteouts Overlay */}
                {currentPageEdits.whiteouts.map((w) => {
                  const screen = pdfToScreenCoords(w.x, w.y, w.height);
                  return (
                    <div
                      key={w.id}
                      className="group absolute cursor-pointer border border-dashed border-red-300 hover:border-red-500"
                      style={{
                        left: `${screen.x}px`,
                        top: `${screen.y}px`,
                        width: `${w.width * zoom}px`,
                        height: `${w.height * zoom}px`,
                        backgroundColor: w.color || "#ffffff",
                      }}
                    >
                      <button
                        type="button"
                        className="absolute -right-2 -top-2 hidden h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow group-hover:flex"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAddedItem(w.id);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}

                {/* 2. Detected Native & OCR Text Items (Click to Edit) */}
                {textItems.map((item) => {
                  const rep = currentPageEdits.replacements.find((r) => r.id === item.id);
                  const screen = pdfToScreenCoords(item.x, item.y, item.height);
                  const isDeleted = rep?.isDeleted;

                  if (isDeleted) {
                    return (
                      <div
                        key={item.id}
                        className="absolute bg-white"
                        style={{
                          left: `${screen.x - 1}px`,
                          top: `${screen.y - 1}px`,
                          width: `${item.width * zoom + 2}px`,
                          height: `${item.height * zoom + 2}px`,
                        }}
                      />
                    );
                  }

                  return (
                    <div
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      className="group absolute cursor-text rounded-sm transition-colors hover:bg-blue-500/15 hover:ring-1 hover:ring-blue-400"
                      style={{
                        left: `${screen.x}px`,
                        top: `${screen.y}px`,
                        width: `${Math.max(16, (rep?.width || item.width) * zoom)}px`,
                        height: `${Math.max(12, item.height * zoom)}px`,
                      }}
                      onClick={() => handleSelectTextItem(item)}
                    >
                      {/* If edited, render replacement text over background patch */}
                      {rep && (
                        <div
                          className="absolute inset-0 flex items-center bg-white px-0.5"
                          style={{
                            fontSize: `${(rep.fontSize || item.fontSize) * zoom}px`,
                            color: rep.color || "#000000",
                            fontFamily: resolveCssFontFamily(rep.fontFamily, rep.detectedFontName || item.detectedFontName),
                          }}
                        >
                          {rep.newText}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* 3. Added Text Elements */}
                {currentPageEdits.addedTexts.map((added) => {
                  const screen = pdfToScreenCoords(added.x, added.y, added.height);
                  const isSelected = selectedAddedId === added.id;

                  return (
                    <div
                      key={added.id}
                      className={`group absolute rounded border ${
                        isSelected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-transparent hover:border-border hover:bg-black/5"
                      }`}
                      style={{
                        left: `${screen.x}px`,
                        top: `${screen.y}px`,
                        width: `${added.width * zoom}px`,
                        minHeight: `${added.height * zoom}px`,
                      }}
                      onClick={() => setSelectedAddedId(added.id)}
                    >
                      {/* Drag handle */}
                      <div
                        className="absolute -top-3 left-0 cursor-move rounded bg-primary px-1 py-0.5 text-white opacity-0 group-hover:opacity-100"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          handleElementDragStart(added.id, e.clientX, e.clientY, screen.x, screen.y);
                        }}
                      >
                        <Move className="h-3 w-3" />
                      </div>

                      {/* Delete button */}
                      <button
                        type="button"
                        className="absolute -right-2 -top-3 hidden h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow group-hover:flex"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAddedItem(added.id);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>

                      {/* Editable Text Area */}
                      <input
                        type="text"
                        value={added.text}
                        className="w-full bg-transparent p-1 outline-none"
                        style={{
                          fontSize: `${added.fontSize * zoom}px`,
                          color: added.color,
                          fontFamily: resolveCssFontFamily(added.fontFamily),
                          fontWeight: added.bold ? "bold" : "normal",
                          fontStyle: added.italic ? "italic" : "normal",
                        }}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateCurrentPageEdits((prev) => {
                            const updated = prev.addedTexts.map((t) => (t.id === added.id ? { ...t, text: val } : t));
                            return { ...prev, addedTexts: updated };
                          });
                        }}
                      />
                    </div>
                  );
                })}

                {/* 4. Added Images */}
                {currentPageEdits.addedImages.map((img) => {
                  const screen = pdfToScreenCoords(img.x, img.y, img.height);
                  const isSelected = selectedAddedId === img.id;

                  return (
                    <div
                      key={img.id}
                      className={`group absolute rounded border ${
                        isSelected ? "border-primary ring-2 ring-primary" : "border-dashed border-transparent hover:border-primary"
                      }`}
                      style={{
                        left: `${screen.x}px`,
                        top: `${screen.y}px`,
                        width: `${img.width * zoom}px`,
                        height: `${img.height * zoom}px`,
                      }}
                      onClick={() => setSelectedAddedId(img.id)}
                    >
                      {/* Drag handle */}
                      <div
                        className="absolute -top-3 left-0 cursor-move rounded bg-primary px-1 py-0.5 text-white opacity-0 group-hover:opacity-100"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          handleElementDragStart(img.id, e.clientX, e.clientY, screen.x, screen.y);
                        }}
                      >
                        <Move className="h-3 w-3" />
                      </div>

                      {/* Delete button */}
                      <button
                        type="button"
                        className="absolute -right-2 -top-3 hidden h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow group-hover:flex"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAddedItem(img.id);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>

                      {/* Image Preview */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.dataUrl} alt="Added graphic" className="h-full w-full object-contain pointer-events-none" />

                      {/* Resize Corner Handle */}
                      <div
                        className="absolute -bottom-2 -right-2 h-4 w-4 cursor-se-resize rounded-full bg-primary shadow"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          const startX = e.clientX;
                          const onMove = (moveEvt: MouseEvent) => {
                            const diff = (moveEvt.clientX - startX) / zoom;
                            handleResizeImage(img.id, diff);
                          };
                          const onUp = () => {
                            window.removeEventListener("mousemove", onMove);
                            window.removeEventListener("mouseup", onUp);
                          };
                          window.addEventListener("mousemove", onMove);
                          window.addEventListener("mouseup", onUp);
                        }}
                      />
                    </div>
                  );
                })}

                {/* 5. Live Drawing Whiteout Preview */}
                {isDrawingWhiteout && whiteoutStart && whiteoutCurrent && (
                  <div
                    className="absolute border border-dashed border-red-500 bg-white/90"
                    style={{
                      left: `${Math.min(whiteoutStart.x, whiteoutCurrent.x)}px`,
                      top: `${Math.min(whiteoutStart.y, whiteoutCurrent.y)}px`,
                      width: `${Math.abs(whiteoutCurrent.x - whiteoutStart.x)}px`,
                      height: `${Math.abs(whiteoutCurrent.y - whiteoutStart.y)}px`,
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Inline Text Editor Modal / Popover when editing a specific text item */}
          {activeEditingItem && (
            <Card className="fixed bottom-6 left-1/2 z-50 w-11/12 max-w-lg -translate-x-1/2 p-4 shadow-2xl border-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{t("tools.pdfEditor.editTextPrompt")}</p>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setActiveEditingItem(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <Input
                  type="text"
                  value={activeEditingItem.replacementText}
                  autoFocus
                  className="font-medium text-base"
                  onChange={(e) =>
                    setActiveEditingItem({
                      ...activeEditingItem,
                      replacementText: e.target.value,
                    })
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveTextReplacement();
                    if (e.key === "Escape") setActiveEditingItem(null);
                  }}
                />

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">{t("tools.pdfEditor.fontSize")}</Label>
                    <NativeSelect
                      value={activeEditingItem.fontSize}
                      onChange={(e) =>
                        setActiveEditingItem({
                          ...activeEditingItem,
                          fontSize: Number(e.target.value),
                        })
                      }
                    >
                      {[9, 10, 11, 12, 14, 16, 18, 20, 24, 30].map((size) => (
                        <option key={size} value={size}>
                          {size} pt
                        </option>
                      ))}
                    </NativeSelect>
                  </div>

                  <div>
                    <Label className="text-xs mb-1 block">{t("tools.pdfEditor.fontFamily")}</Label>
                    <FontPicker
                      value={activeEditingItem.fontFamily}
                      detectedFontName={activeEditingItem.item.detectedFontName}
                      allowAutoDetect={true}
                      onChange={(fontId) =>
                        setActiveEditingItem({
                          ...activeEditingItem,
                          fontFamily: fontId,
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label className="text-xs">{t("tools.pdfEditor.color")}</Label>
                    <Input
                      type="color"
                      value={activeEditingItem.color}
                      className="h-9 p-1"
                      onChange={(e) =>
                        setActiveEditingItem({
                          ...activeEditingItem,
                          color: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="gap-1.5"
                    onClick={handleDeleteTextItem}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>{t("tools.pdfEditor.deleteElement")}</span>
                  </Button>

                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setActiveEditingItem(null)}>
                      {t("common.cancel")}
                    </Button>
                    <Button type="button" size="sm" className="bg-primary text-white" onClick={handleSaveTextReplacement}>
                      {t("common.save")}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Selected Added Text Properties Bar */}
          {selectedAddedId && (() => {
            const addedItem = currentPageEdits.addedTexts.find((t) => t.id === selectedAddedId);
            if (!addedItem) return null;
            return (
              <Card className="fixed bottom-6 left-1/2 z-40 w-11/12 max-w-2xl -translate-x-1/2 p-3 shadow-2xl border-2 bg-background/95 backdrop-blur">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-primary">Edit Added Text:</span>

                  {/* Font picker */}
                  <div className="w-48">
                    <FontPicker
                      value={addedItem.fontFamily}
                      allowAutoDetect={false}
                      onChange={(fontId) => {
                        updateCurrentPageEdits((prev) => ({
                          ...prev,
                          addedTexts: prev.addedTexts.map((t) => (t.id === selectedAddedId ? { ...t, fontFamily: fontId } : t)),
                        }));
                      }}
                    />
                  </div>

                  {/* Font size */}
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs text-muted-foreground">Size:</Label>
                    <NativeSelect
                      value={addedItem.fontSize}
                      onChange={(e) => {
                        const size = Number(e.target.value);
                        updateCurrentPageEdits((prev) => ({
                          ...prev,
                          addedTexts: prev.addedTexts.map((t) => (t.id === selectedAddedId ? { ...t, fontSize: size } : t)),
                        }));
                      }}
                      className="h-8 text-xs w-20"
                    >
                      {[9, 10, 11, 12, 14, 16, 18, 20, 24, 30, 36, 48].map((size) => (
                        <option key={size} value={size}>
                          {size} pt
                        </option>
                      ))}
                    </NativeSelect>
                  </div>

                  {/* Bold & Italic */}
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant={addedItem.bold ? "default" : "outline"}
                      size="sm"
                      className="h-8 px-2.5 font-bold"
                      onClick={() => {
                        updateCurrentPageEdits((prev) => ({
                          ...prev,
                          addedTexts: prev.addedTexts.map((t) => (t.id === selectedAddedId ? { ...t, bold: !t.bold } : t)),
                        }));
                      }}
                    >
                      B
                    </Button>
                    <Button
                      type="button"
                      variant={addedItem.italic ? "default" : "outline"}
                      size="sm"
                      className="h-8 px-2.5 italic"
                      onClick={() => {
                        updateCurrentPageEdits((prev) => ({
                          ...prev,
                          addedTexts: prev.addedTexts.map((t) => (t.id === selectedAddedId ? { ...t, italic: !t.italic } : t)),
                        }));
                      }}
                    >
                      I
                    </Button>
                  </div>

                  {/* Color */}
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs text-muted-foreground">Color:</Label>
                    <Input
                      type="color"
                      value={addedItem.color}
                      className="h-8 w-10 p-0.5"
                      onChange={(e) => {
                        const col = e.target.value;
                        updateCurrentPageEdits((prev) => ({
                          ...prev,
                          addedTexts: prev.addedTexts.map((t) => (t.id === selectedAddedId ? { ...t, color: col } : t)),
                        }));
                      }}
                    />
                  </div>

                  {/* Done button */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs ml-auto"
                    onClick={() => setSelectedAddedId(null)}
                  >
                    Done
                  </Button>
                </div>
              </Card>
            );
          })()}
        </div>
      )}
    </div>
  );
}
