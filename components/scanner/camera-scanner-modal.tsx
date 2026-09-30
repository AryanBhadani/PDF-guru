"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  ArrowLeft,
  Camera,
  Check,
  CreditCard,
  FileText,
  Images,
  Maximize2,
  RotateCw,
  Sparkles,
  SwitchCamera,
  Trash2,
  Zap,
  ZapOff,
  ChevronLeft,
  ChevronRight,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useT } from "@/components/i18n/language-provider";
import {
  type Point,
  type Quad,
  type ScannerMode,
  type ScannerFilterType,
  detectDocumentQuad,
  smoothQuad,
  getDefaultQuad,
  warpPerspective,
  applyScannerFilter,
  canvasToJpegFile,
  distance,
} from "@/lib/scanner-cv";

export type ScannedPageItem = {
  id: string;
  name: string;
  rawCanvas: HTMLCanvasElement;
  warpedCanvas: HTMLCanvasElement;
  filteredCanvas: HTMLCanvasElement;
  previewUrl: string;
  filter: ScannerFilterType;
  quad: Quad;
  mode: ScannerMode;
};

interface CameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (files: File[]) => void;
  onFallbackToFile: () => void;
}

export function CameraScannerModal({
  isOpen,
  onClose,
  onComplete,
  onFallbackToFile,
}: CameraScannerModalProps) {
  const t = useT();

  // Mode and view state
  const [mode, setMode] = useState<ScannerMode>("docs");
  const [idCardStep, setIdCardStep] = useState<"front" | "back">("front");
  const [viewState, setViewState] = useState<"camera" | "adjust" | "tray">("camera");

  // Camera stream state
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Capture & adjustment state
  const [capturedRawCanvas, setCapturedRawCanvas] = useState<HTMLCanvasElement | null>(null);
  const [editingQuad, setEditingQuad] = useState<Quad | null>(null);
  const [detectedQuad, setDetectedQuad] = useState<Quad | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<ScannerFilterType>("document");
  const [draggedCorner, setDraggedCorner] = useState<keyof Quad | null>(null);
  const [loupePoint, setLoupePoint] = useState<Point | null>(null);

  // Multi-page session tray
  const [pages, setPages] = useState<ScannedPageItem[]>([]);
  const [activeEditingPageIndex, setActiveEditingPageIndex] = useState<number | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);

  // DOM Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const adjustCanvasRef = useRef<HTMLCanvasElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const prevQuadRef = useRef<Quad | null>(null);
  const lostFramesRef = useRef(0);

  // Lock body scroll on mobile and desktop while scanner modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      const originalTouchAction = document.body.style.touchAction;
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.touchAction = originalTouchAction;
      };
    }
  }, [isOpen]);

  // Clean up ObjectURLs when pages change or unmount
  useEffect(() => {
    return () => {
      pages.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
  }, [pages]);

  // Clean up camera stream
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setTorchEnabled(false);
    setTorchAvailable(false);
  }, []);

  // Initialize camera
  const startCamera = useCallback(async () => {
    stopStream();
    setCameraError(null);

    if (
      typeof navigator === "undefined" ||
      !("mediaDevices" in navigator) ||
      typeof navigator.mediaDevices.getUserMedia !== "function"
    ) {
      setCameraError(t("tools.photoToPdf.cameraDenied"));
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      // Check torch capability
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const capabilities = (videoTrack.getCapabilities?.() || {}) as any;
        setTorchAvailable(Boolean(capabilities?.torch));
      }
    } catch (err) {
      console.warn("Camera start error:", err);
      setCameraError(t("tools.photoToPdf.cameraDenied"));
    }
  }, [facingMode, stopStream, t]);

  // Start or stop camera based on modal open state and view
  useEffect(() => {
    if (!isOpen) {
      stopStream();
      return;
    }

    if (viewState === "camera") {
      void startCamera();
    } else {
      stopStream();
    }

    return () => {
      stopStream();
    };
  }, [isOpen, viewState, startCamera, stopStream]);

  // Toggle Torch/Flash
  const toggleTorch = async () => {
    if (!streamRef.current || !torchAvailable) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const nextTorch = !torchEnabled;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (track as any).applyConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setTorchEnabled(nextTorch);
    } catch (err) {
      console.warn("Failed to toggle torch:", err);
      toast.error("Could not toggle flash/torch on this camera.");
    }
  };

  // Flip Camera
  const switchFacingMode = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  // Real-time Document Edge Detection Loop
  useEffect(() => {
    if (!isOpen || viewState !== "camera") return;

    let isActive = true;

    const renderLoop = () => {
      if (!isActive) return;

      const video = videoRef.current;
      const canvas = overlayCanvasRef.current;

      if (video && canvas && video.readyState >= 2 && video.videoWidth > 0) {
        const vw = video.videoWidth;
        const vh = video.videoHeight;

        if (canvas.width !== vw || canvas.height !== vh) {
          canvas.width = vw;
          canvas.height = vh;
        }

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, vw, vh);

          // Run real-time 4-corner detection with tracking hysteresis
          const result = detectDocumentQuad(video, mode);
          let smoothed: Quad;
          let isDetected = false;

          if (result.detected) {
            lostFramesRef.current = 0;
            smoothed = smoothQuad(result.quad, prevQuadRef.current);
            prevQuadRef.current = smoothed;
            isDetected = true;
          } else if (prevQuadRef.current && lostFramesRef.current < 12) {
            // Hysteresis: retain tracked quad across momentary blurs / hand tremors
            lostFramesRef.current += 1;
            smoothed = prevQuadRef.current;
            isDetected = true;
          } else {
            const defQuad = getDefaultQuad(vw, vh, mode);
            smoothed = smoothQuad(defQuad, prevQuadRef.current, 0.15);
            prevQuadRef.current = smoothed;
            isDetected = false;
          }

          // Render quadrilateral overlay
          ctx.save();

          // Semi-transparent glowing fill
          ctx.beginPath();
          ctx.moveTo(smoothed.tl.x, smoothed.tl.y);
          ctx.lineTo(smoothed.tr.x, smoothed.tr.y);
          ctx.lineTo(smoothed.br.x, smoothed.br.y);
          ctx.lineTo(smoothed.bl.x, smoothed.bl.y);
          ctx.closePath();

          ctx.fillStyle = isDetected
            ? "rgba(59, 130, 246, 0.18)" // Soft blue
            : "rgba(255, 255, 255, 0.08)";
          ctx.fill();

          // Stroke border
          ctx.lineWidth = Math.max(3, Math.round(vw / 300));
          ctx.strokeStyle = isDetected ? "#38bdf8" : "rgba(255, 255, 255, 0.6)";
          ctx.lineJoin = "round";
          ctx.shadowColor = isDetected ? "#0284c7" : "transparent";
          ctx.shadowBlur = 10;
          ctx.stroke();

          // Draw corner anchor reticles
          const cornerRadius = Math.max(8, Math.round(vw / 90));
          const corners = [smoothed.tl, smoothed.tr, smoothed.br, smoothed.bl];
          corners.forEach((pt) => {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, cornerRadius, 0, 2 * Math.PI);
            ctx.fillStyle = "#ffffff";
            ctx.fill();
            ctx.lineWidth = 3;
            ctx.strokeStyle = "#0284c7";
            ctx.stroke();
          });

          // In ID Card Mode, render ID card frame guide & badge
          if (mode === "idcard") {
            const cardQuad = getDefaultQuad(vw, vh, "idcard");
            ctx.save();
            ctx.setLineDash([8, 6]);
            ctx.lineWidth = 2;
            ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
            ctx.strokeRect(
              cardQuad.tl.x,
              cardQuad.tl.y,
              cardQuad.tr.x - cardQuad.tl.x,
              cardQuad.bl.y - cardQuad.tl.y
            );
            ctx.restore();
          }

          ctx.restore();
        }
      }

      animationFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animationFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      isActive = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isOpen, viewState, mode]);

  // Capture High-Resolution Frame from Video
  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;

    const vw = video.videoWidth;
    const vh = video.videoHeight;

    const captureCanvas = document.createElement("canvas");
    captureCanvas.width = vw;
    captureCanvas.height = vh;
    const ctx = captureCanvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, vw, vh);

    // Detect quad on captured frame with fallback to stable tracked quad
    const result = detectDocumentQuad(captureCanvas, mode);
    const finalQuad = result.detected
      ? result.quad
      : (prevQuadRef.current && lostFramesRef.current < 12)
      ? prevQuadRef.current
      : getDefaultQuad(vw, vh, mode);

    setCapturedRawCanvas(captureCanvas);
    setDetectedQuad(finalQuad);
    setEditingQuad({ ...finalQuad });
    setSelectedFilter("document");
    setActiveEditingPageIndex(null);
    setViewState("adjust");
  };

  // Import Image from Gallery / File Storage with EXIF orientation handling
  const handleGalleryImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const first = files[0];
    e.target.value = "";

    try {
      const { imageToCanvas } = await import("@/lib/image");
      const canvas = await imageToCanvas(first);

      const result = detectDocumentQuad(canvas, mode);
      const finalQuad = result.detected ? result.quad : getDefaultQuad(canvas.width, canvas.height, mode);

      setCapturedRawCanvas(canvas);
      setDetectedQuad(finalQuad);
      setEditingQuad({ ...finalQuad });
      setSelectedFilter("document");
      setActiveEditingPageIndex(null);
      setViewState("adjust");
      toast.success("Image imported for scanning!");
    } catch {
      toast.error("Failed to load image from gallery.");
    }
  };

  // Render Adjust/Review Screen Canvas
  useEffect(() => {
    if (viewState !== "adjust" || !capturedRawCanvas || !editingQuad) return;

    const canvas = adjustCanvasRef.current;
    if (!canvas) return;

    const displayW = canvas.clientWidth || 360;
    const displayH = canvas.clientHeight || 480;

    const rawW = capturedRawCanvas.width;
    const rawH = capturedRawCanvas.height;

    // Scale canvas to match client resolution for crisp drawing
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    canvas.width = displayW * dpr;
    canvas.height = displayH * dpr;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    // Compute fit-contain scale
    const scale = Math.min(displayW / rawW, displayH / rawH);
    const offsetX = (displayW - rawW * scale) / 2;
    const offsetY = (displayH - rawH * scale) / 2;

    // Draw raw image
    ctx.drawImage(capturedRawCanvas, offsetX, offsetY, rawW * scale, rawH * scale);

    // Draw semi-dark overlay outside document quad
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.fillRect(0, 0, displayW, displayH);

    // Cut out quad
    const q = editingQuad;
    const toScreen = (p: Point): Point => ({
      x: offsetX + p.x * scale,
      y: offsetY + p.y * scale,
    });

    const sTL = toScreen(q.tl);
    const sTR = toScreen(q.tr);
    const sBR = toScreen(q.br);
    const sBL = toScreen(q.bl);

    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.moveTo(sTL.x, sTL.y);
    ctx.lineTo(sTR.x, sTR.y);
    ctx.lineTo(sBR.x, sBR.y);
    ctx.lineTo(sBL.x, sBL.y);
    ctx.closePath();
    ctx.fill();

    ctx.globalCompositeOperation = "source-over";

    // Draw quad glowing boundary
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#38bdf8";
    ctx.stroke();

    // Draw 4 interactive corner pins
    const corners: Array<{ key: keyof Quad; pt: Point }> = [
      { key: "tl", pt: sTL },
      { key: "tr", pt: sTR },
      { key: "br", pt: sBR },
      { key: "bl", pt: sBL },
    ];

    corners.forEach(({ key, pt }) => {
      const isCurrent = draggedCorner === key;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, isCurrent ? 14 : 10, 0, 2 * Math.PI);
      ctx.fillStyle = isCurrent ? "#38bdf8" : "#ffffff";
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#0284c7";
      ctx.stroke();
    });

    // Draw Loupe / Magnifier when dragging a corner
    if (draggedCorner && loupePoint) {
      const cornerRaw = q[draggedCorner];
      const loupeRadius = 55;
      const loupeZoom = 2.2;

      // Position loupe offset from finger or in top corner
      let lx = toScreen(cornerRaw).x;
      let ly = toScreen(cornerRaw).y - 80;

      if (ly < loupeRadius + 10) ly = toScreen(cornerRaw).y + 80;
      if (lx < loupeRadius + 10) lx = loupeRadius + 10;
      if (lx > displayW - loupeRadius - 10) lx = displayW - loupeRadius - 10;

      ctx.save();
      ctx.beginPath();
      ctx.arc(lx, ly, loupeRadius, 0, 2 * Math.PI);
      ctx.clip();

      // Clear loupe area and draw zoomed raw image
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(lx - loupeRadius, ly - loupeRadius, loupeRadius * 2, loupeRadius * 2);

      const srcSize = (loupeRadius * 2) / (scale * loupeZoom);
      ctx.drawImage(
        capturedRawCanvas,
        cornerRaw.x - srcSize / 2,
        cornerRaw.y - srcSize / 2,
        srcSize,
        srcSize,
        lx - loupeRadius,
        ly - loupeRadius,
        loupeRadius * 2,
        loupeRadius * 2
      );

      // Loupe crosshair
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(lx - 15, ly);
      ctx.lineTo(lx + 15, ly);
      ctx.moveTo(lx, ly - 15);
      ctx.lineTo(lx, ly + 15);
      ctx.stroke();

      // Loupe outer ring
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      ctx.arc(lx, ly, loupeRadius, 0, 2 * Math.PI);
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }, [viewState, capturedRawCanvas, editingQuad, draggedCorner, loupePoint]);

  // Pointer interactions for dragging 4 corners
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!capturedRawCanvas || !editingQuad) return;
    const canvas = adjustCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const displayW = canvas.clientWidth || 360;
    const displayH = canvas.clientHeight || 480;
    const rawW = capturedRawCanvas.width;
    const rawH = capturedRawCanvas.height;

    const scale = Math.min(displayW / rawW, displayH / rawH);
    const offsetX = (displayW - rawW * scale) / 2;
    const offsetY = (displayH - rawH * scale) / 2;

    const toScreen = (p: Point): Point => ({
      x: offsetX + p.x * scale,
      y: offsetY + p.y * scale,
    });

    // Check closest corner within touch target radius (44px)
    const corners: Array<keyof Quad> = ["tl", "tr", "br", "bl"];
    let closestKey: keyof Quad | null = null;
    let minDist = 48; // Touch tolerance

    for (const key of corners) {
      const sp = toScreen(editingQuad[key]);
      const d = distance(sp, { x: clientX, y: clientY });
      if (d < minDist) {
        minDist = d;
        closestKey = key;
      }
    }

    if (closestKey) {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setDraggedCorner(closestKey);
      setLoupePoint({ x: clientX, y: clientY });
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!draggedCorner || !capturedRawCanvas || !editingQuad) return;
    const canvas = adjustCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const displayW = canvas.clientWidth || 360;
    const displayH = canvas.clientHeight || 480;
    const rawW = capturedRawCanvas.width;
    const rawH = capturedRawCanvas.height;

    const scale = Math.min(displayW / rawW, displayH / rawH);
    const offsetX = (displayW - rawW * scale) / 2;
    const offsetY = (displayH - rawH * scale) / 2;

    // Map screen coordinates back to raw image coordinates
    const rawX = Math.max(0, Math.min(rawW, Math.round((clientX - offsetX) / scale)));
    const rawY = Math.max(0, Math.min(rawH, Math.round((clientY - offsetY) / scale)));

    setEditingQuad((prev) => (prev ? { ...prev, [draggedCorner]: { x: rawX, y: rawY } } : null));
    setLoupePoint({ x: clientX, y: clientY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (draggedCorner) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      setDraggedCorner(null);
      setLoupePoint(null);
    }
  };

  // Reset to auto-detected corners
  const handleAutoDetect = () => {
    if (detectedQuad) {
      setEditingQuad({ ...detectedQuad });
      toast.info(t("tools.photoToPdf.autoDetect"));
    }
  };

  // Select full image
  const handleFullImage = () => {
    if (capturedRawCanvas) {
      const w = capturedRawCanvas.width;
      const h = capturedRawCanvas.height;
      setEditingQuad({
        tl: { x: 0, y: 0 },
        tr: { x: w, y: 0 },
        br: { x: w, y: h },
        bl: { x: 0, y: h },
      });
      toast.info(t("tools.photoToPdf.fullPage"));
    }
  };

  // Rotate captured raw image and boundary quad 90 degrees clockwise
  const handleRotateCaptured = () => {
    if (!capturedRawCanvas || !editingQuad) return;
    const oldW = capturedRawCanvas.width;
    const oldH = capturedRawCanvas.height;

    const newCanvas = document.createElement("canvas");
    newCanvas.width = oldH;
    newCanvas.height = oldW;
    const ctx = newCanvas.getContext("2d");
    if (!ctx) return;
    ctx.translate(oldH / 2, oldW / 2);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(capturedRawCanvas, -oldW / 2, -oldH / 2);

    // Rotate points 90 deg clockwise: (x, y) -> (oldH - y, x)
    const rotPt = (p: Point): Point => ({
      x: Math.max(0, Math.min(oldH, Math.round(oldH - p.y))),
      y: Math.max(0, Math.min(oldW, Math.round(p.x))),
    });

    const newQuad: Quad = {
      tl: rotPt(editingQuad.bl),
      tr: rotPt(editingQuad.tl),
      br: rotPt(editingQuad.tr),
      bl: rotPt(editingQuad.br),
    };

    setCapturedRawCanvas(newCanvas);
    setEditingQuad(newQuad);
    if (detectedQuad) {
      setDetectedQuad({
        tl: rotPt(detectedQuad.bl),
        tr: rotPt(detectedQuad.tl),
        br: rotPt(detectedQuad.tr),
        bl: rotPt(detectedQuad.br),
      });
    }
  };

  // Retake current frame
  const handleRetake = () => {
    setCapturedRawCanvas(null);
    setEditingQuad(null);
    setDetectedQuad(null);
    setViewState("camera");
  };

  // Keep Scan and Add to Session
  const handleKeepScan = () => {
    if (!capturedRawCanvas || !editingQuad) return;

    // 1. Perspective Homography Warp
    const warped = warpPerspective(capturedRawCanvas, editingQuad, mode);

    // 2. Apply chosen Document Filter
    const filtered = applyScannerFilter(warped, selectedFilter);

    // 3. Create preview data URL
    const previewUrl = filtered.toDataURL("image/jpeg", 0.7);

    // Determine page naming
    let pageName = `Page-${pages.length + 1}.jpg`;
    if (mode === "idcard") {
      pageName = idCardStep === "front" ? "ID-Card-Front.jpg" : "ID-Card-Back.jpg";
    }

    const newPage: ScannedPageItem = {
      id: `scan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: pageName,
      rawCanvas: capturedRawCanvas,
      warpedCanvas: warped,
      filteredCanvas: filtered,
      previewUrl,
      filter: selectedFilter,
      quad: editingQuad,
      mode,
    };

    if (activeEditingPageIndex !== null) {
      // Replace existing page
      setPages((prev) => {
        const next = [...prev];
        URL.revokeObjectURL(next[activeEditingPageIndex].previewUrl);
        next[activeEditingPageIndex] = newPage;
        return next;
      });
      setActiveEditingPageIndex(null);
      setViewState("camera");
      toast.success("Page updated!");
    } else {
      // Append new page
      setPages((prev) => [...prev, newPage]);

      // Check ID Card mode 2-step transition
      if (mode === "idcard") {
        if (idCardStep === "front") {
          setIdCardStep("back");
          toast.success(t("tools.photoToPdf.frontCaptured"), { duration: 4000 });
          setCapturedRawCanvas(null);
          setEditingQuad(null);
          setViewState("camera");
        } else {
          setIdCardStep("front");
          toast.success("ID Card front & back captured!");
          setCapturedRawCanvas(null);
          setEditingQuad(null);
          setViewState("camera");
        }
      } else {
        toast.success(`Page ${pages.length + 1} added!`);
        setCapturedRawCanvas(null);
        setEditingQuad(null);
        setViewState("camera");
      }
    }
  };

  // Re-edit existing page
  const handleEditPage = (index: number) => {
    const page = pages[index];
    if (!page) return;
    setActiveEditingPageIndex(index);
    setCapturedRawCanvas(page.rawCanvas);
    setEditingQuad({ ...page.quad });
    setSelectedFilter(page.filter);
    setViewState("adjust");
  };

  // Delete page
  const handleDeletePage = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setPages((prev) => {
      const page = prev.find((p) => p.id === id);
      if (page) URL.revokeObjectURL(page.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  // Move page position
  const handleMovePage = (index: number, direction: -1 | 1, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setPages((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.splice(target, 0, item);
      return copy;
    });
  };

  // Rotate a scanned page 90 degrees clockwise in the tray
  const handleRotatePage = (index: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setPages((prev) => {
      const page = prev[index];
      if (!page) return prev;

      const rotateCanvas90 = (src: HTMLCanvasElement): HTMLCanvasElement => {
        const dst = document.createElement("canvas");
        dst.width = src.height;
        dst.height = src.width;
        const ctx = dst.getContext("2d");
        if (ctx) {
          ctx.translate(dst.width / 2, dst.height / 2);
          ctx.rotate(Math.PI / 2);
          ctx.drawImage(src, -src.width / 2, -src.height / 2);
        }
        return dst;
      };

      const newWarped = rotateCanvas90(page.warpedCanvas);
      const newFiltered = rotateCanvas90(page.filteredCanvas);
      const newPreviewUrl = newFiltered.toDataURL("image/jpeg", 0.7);

      URL.revokeObjectURL(page.previewUrl);

      const next = [...prev];
      next[index] = {
        ...page,
        warpedCanvas: newWarped,
        filteredCanvas: newFiltered,
        previewUrl: newPreviewUrl,
      };
      return next;
    });
  };

  // Finalize scanning and output files
  const handleDone = async () => {
    if (pages.length === 0) {
      onClose();
      return;
    }

    setIsFinishing(true);
    try {
      const files: File[] = [];
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const file = await canvasToJpegFile(page.filteredCanvas, page.name, 0.92);
        files.push(file);
      }
      onComplete(files);
      onClose();
    } catch (err) {
      console.error("Failed to export scanned pages:", err);
      toast.error("Could not export scanned pages.");
    } finally {
      setIsFinishing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex h-[100dvh] max-h-dvh w-full flex-col bg-black text-white select-none overflow-hidden overscroll-none touch-none">
      {/* Hidden Gallery Picker Input */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleGalleryImport}
      />

      {/* ================= TOP NAVIGATION BAR ================= */}
      <header className="flex h-14 shrink-0 items-center justify-between px-4 z-20 bg-black/70 backdrop-blur-md pt-[max(env(safe-area-inset-top),0.25rem)]">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20"
          onClick={viewState === "adjust" ? handleRetake : onClose}
          aria-label="Back"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>

        {/* Title / Step Indicator */}
        <div className="flex flex-col items-center">
          <span className="text-sm font-semibold tracking-wide">
            {mode === "idcard"
              ? `${t("tools.photoToPdf.modeIdCard")}: ${
                  idCardStep === "front"
                    ? t("tools.photoToPdf.idCardFront")
                    : t("tools.photoToPdf.idCardBack")
                }`
              : t("tools.photoToPdf.scanDoc")}
          </span>
          {viewState === "camera" && mode === "idcard" && (
            <span className="text-[11px] text-sky-400">
              {idCardStep === "front"
                ? t("tools.photoToPdf.scanFrontHint")
                : t("tools.photoToPdf.scanBackHint")}
            </span>
          )}
        </div>

        {/* Top-Right Quick Controls */}
        <div className="flex items-center gap-1">
          {viewState === "camera" && torchAvailable && (
            <Button
              variant="ghost"
              size="icon"
              className={
                torchEnabled
                  ? "text-amber-400 hover:bg-white/20"
                  : "text-white/80 hover:bg-white/20"
              }
              onClick={toggleTorch}
              aria-label={torchEnabled ? t("tools.photoToPdf.torchOff") : t("tools.photoToPdf.torchOn")}
            >
              {torchEnabled ? <Zap className="h-5 w-5 fill-amber-400" /> : <ZapOff className="h-5 w-5" />}
            </Button>
          )}

          {viewState === "camera" && (
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={switchFacingMode}
              aria-label={t("tools.photoToPdf.switchCamera")}
            >
              <SwitchCamera className="h-5 w-5" />
            </Button>
          )}
        </div>
      </header>

      {/* ================= VIEWPORT AREA ================= */}
      <main className="relative flex-1 overflow-hidden flex items-center justify-center bg-black w-full min-h-0">
        {/* Camera Permission / Error Fallback */}
        {cameraError ? (
          <div className="flex flex-col items-center max-w-sm px-6 text-center space-y-4">
            <div className="rounded-full bg-red-500/20 p-4 text-red-400">
              <Camera className="h-10 w-10" />
            </div>
            <p className="text-sm text-neutral-300">{cameraError}</p>
            <div className="flex flex-col gap-2 w-full">
              <Button
                variant="default"
                className="bg-primary hover:bg-primary/90 text-white"
                onClick={() => void startCamera()}
              >
                <RotateCw className="mr-2 h-4 w-4" /> Try Camera Again
              </Button>
              <Button
                variant="outline"
                className="border-neutral-700 text-white hover:bg-neutral-800"
                onClick={() => {
                  onClose();
                  onFallbackToFile();
                }}
              >
                Upload from Gallery / Files
              </Button>
            </div>
          </div>
        ) : viewState === "camera" ? (
          /* Live Camera Viewfinder */
          <div className="relative h-full w-full flex items-center justify-center">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="h-full w-full object-cover"
            />
            {/* Real-time document quad overlay */}
            <canvas
              ref={overlayCanvasRef}
              className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            />
          </div>
        ) : (
          /* Review / Adjust Corners Canvas */
          <div className="relative h-full w-full flex items-center justify-center p-2">
            <canvas
              ref={adjustCanvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="h-full w-full touch-none object-contain rounded-lg"
            />
          </div>
        )}
      </main>

      {/* ================= BOTTOM CONTROLS & TRAY ================= */}
      <footer className="shrink-0 bg-neutral-950/95 border-t border-neutral-800/80 px-4 pt-2.5 pb-[max(env(safe-area-inset-bottom),1.25rem)] flex flex-col gap-3">
        {viewState === "camera" ? (
          <>
            {/* Mode Switcher: Docs vs ID Card */}
            <div className="flex items-center justify-center">
              <div className="flex rounded-full bg-neutral-900 p-1 border border-neutral-800">
                <button
                  type="button"
                  onClick={() => {
                    setMode("docs");
                    setIdCardStep("front");
                  }}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    mode === "docs"
                      ? "bg-primary text-primary-foreground shadow"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  {t("tools.photoToPdf.modeDocs")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("idcard");
                    setIdCardStep("front");
                  }}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    mode === "idcard"
                      ? "bg-primary text-primary-foreground shadow"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  {t("tools.photoToPdf.modeIdCard")}
                </button>
              </div>
            </div>

            {/* Shutter Bar */}
            <div className="flex items-center justify-between px-2">
              {/* Thumbnail Session Stack or Gallery Import */}
              <div className="w-16 flex items-center justify-start">
                {pages.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setViewState("tray")}
                    className="relative group block rounded-lg overflow-hidden border border-neutral-700 h-12 w-12 bg-neutral-900"
                    aria-label="View scanned pages"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={pages[pages.length - 1].previewUrl}
                      alt="Thumbnail"
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute bottom-0 right-0 bg-primary text-[10px] font-bold px-1 rounded-tl">
                      {pages.length}
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="relative flex flex-col items-center justify-center rounded-xl border border-neutral-700 h-12 w-12 bg-neutral-900/90 text-neutral-300 hover:text-white hover:border-neutral-500 transition-colors"
                    title="Import from Gallery"
                    aria-label="Import from Gallery"
                  >
                    <Images className="h-5 w-5" />
                    <span className="text-[9px] mt-0.5 leading-none">Gallery</span>
                  </button>
                )}
              </div>

              {/* Large 64px+ Shutter Capture Button (74px outer diameter) */}
              <button
                type="button"
                onClick={handleCapture}
                className="group relative flex h-[74px] w-[74px] shrink-0 items-center justify-center rounded-full border-4 border-white/80 p-1 transition-transform active:scale-95 shadow-xl"
                aria-label="Take Photo"
              >
                <div className="h-[58px] w-[58px] rounded-full bg-white transition-all group-hover:bg-neutral-200 group-active:scale-90 shadow-md" />
              </button>

              {/* Done Button */}
              <div className="w-16 flex items-center justify-end">
                {pages.length > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                    onClick={handleDone}
                    disabled={isFinishing}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    {isFinishing ? "..." : pages.length}
                  </Button>
                )}
              </div>
            </div>
          </>
        ) : viewState === "adjust" ? (
          <>
            {/* Filter Selection Chips */}
            <div className="flex items-center justify-center gap-2 overflow-x-auto py-1">
              {(
                [
                  { key: "original", label: t("tools.photoToPdf.filterOriginal") },
                  { key: "document", label: t("tools.photoToPdf.filterDoc") },
                  { key: "grayscale", label: t("tools.photoToPdf.filterGrayscale") },
                  { key: "bw", label: t("tools.photoToPdf.filterBw") },
                  { key: "color", label: t("tools.photoToPdf.filterColor") },
                ] as const
              ).map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setSelectedFilter(f.key)}
                  className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedFilter === f.key
                      ? "bg-sky-500 text-white shadow"
                      : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Corner Adjust Quick Buttons & Keep Scan */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 border-neutral-700 bg-neutral-900 text-neutral-200 hover:bg-neutral-800 text-xs"
                  onClick={handleAutoDetect}
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1 text-sky-400" />
                  {t("tools.photoToPdf.autoDetect")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 border-neutral-700 bg-neutral-900 text-neutral-200 hover:bg-neutral-800 text-xs"
                  onClick={handleFullImage}
                >
                  <Maximize2 className="h-3.5 w-3.5 mr-1" />
                  {t("tools.photoToPdf.fullPage")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 border-neutral-700 bg-neutral-900 text-neutral-200 hover:bg-neutral-800 text-xs"
                  onClick={handleRotateCaptured}
                  title={t("common.rotate") || "Rotate 90°"}
                >
                  <RotateCw className="h-3.5 w-3.5 mr-1 text-sky-400" />
                  {t("common.rotate") || "Rotate"}
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-neutral-300 hover:bg-neutral-800 text-xs"
                  onClick={handleRetake}
                >
                  {t("tools.photoToPdf.retake")}
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="h-8 bg-primary hover:bg-primary/90 text-white font-medium text-xs px-4"
                  onClick={handleKeepScan}
                >
                  <Check className="h-3.5 w-3.5 mr-1" />
                  {t("tools.photoToPdf.keepScan")}
                </Button>
              </div>
            </div>
          </>
        ) : (
          /* Multi-Page Tray / Review Carousel */
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-neutral-300">
              <span className="font-semibold flex items-center gap-1">
                <Layers className="h-4 w-4" />
                Scanned Pages ({pages.length})
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-sky-400 hover:bg-neutral-800"
                onClick={() => setViewState("camera")}
              >
                + Scan Another Page
              </Button>
            </div>

            {/* Thumbnail Carousel */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {pages.map((p, idx) => (
                <div
                  key={p.id}
                  onClick={() => handleEditPage(idx)}
                  className="relative shrink-0 rounded-lg overflow-hidden border border-neutral-700 bg-neutral-900 w-24 cursor-pointer hover:border-sky-500 transition-colors"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.previewUrl}
                    alt={p.name}
                    className="h-28 w-full object-cover"
                  />
                  <div className="p-1.5 flex items-center justify-between text-[11px] bg-neutral-950/80">
                    <span className="truncate max-w-[42px] font-medium">{p.name}</span>
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={(e) => handleRotatePage(idx, e)}
                        className="text-neutral-400 hover:text-sky-400 p-0.5"
                        aria-label="Rotate page 90 degrees"
                        title="Rotate 90°"
                      >
                        <RotateCw className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeletePage(p.id, e)}
                        className="text-neutral-400 hover:text-red-400 p-0.5"
                        aria-label="Delete page"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Reorder buttons */}
                  <div className="absolute top-1 right-1 flex flex-col gap-1 bg-black/60 rounded p-0.5">
                    {idx > 0 && (
                      <button
                        type="button"
                        onClick={(e) => handleMovePage(idx, -1, e)}
                        className="text-white hover:text-sky-300"
                        aria-label="Move left"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {idx < pages.length - 1 && (
                      <button
                        type="button"
                        onClick={(e) => handleMovePage(idx, 1, e)}
                        className="text-white hover:text-sky-300"
                        aria-label="Move right"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-1">
              <Button
                variant="outline"
                size="sm"
                className="border-neutral-700 text-neutral-300 hover:bg-neutral-800"
                onClick={() => setViewState("camera")}
              >
                Back to Camera
              </Button>
              <Button
                variant="default"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-5"
                onClick={handleDone}
                disabled={isFinishing}
              >
                <Check className="h-4 w-4 mr-1" />
                Done ({pages.length})
              </Button>
            </div>
          </div>
        )}
      </footer>
    </div>
  );
}
