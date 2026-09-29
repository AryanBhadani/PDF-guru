/**
 * Lightweight, high-performance client-side Computer Vision module for document scanning.
 * Provides real-time 4-corner detection, projective homography perspective rectification,
 * and adaptive document filters (Original, Auto/Document, Grayscale, B&W, Color).
 */

export type Point = { x: number; y: number };

export type Quad = {
  tl: Point;
  tr: Point;
  br: Point;
  bl: Point;
};

export type ScannerMode = "docs" | "idcard";

export type ScannerFilterType = "original" | "document" | "grayscale" | "bw" | "color";

export type DetectionResult = {
  quad: Quad;
  confidence: number;
  detected: boolean;
};

/**
 * Calculates Euclidean distance between two 2D points.
 */
export function distance(p1: Point, p2: Point): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.hypot(dx, dy);
}

/**
 * Calculates quadrilateral area using Shoelace formula.
 */
export function quadArea(q: Quad): number {
  return (
    0.5 *
    Math.abs(
      q.tl.x * q.tr.y -
        q.tr.x * q.tl.y +
        (q.tr.x * q.br.y - q.br.x * q.tr.y) +
        (q.br.x * q.bl.y - q.bl.x * q.br.y) +
        (q.bl.x * q.tl.y - q.tl.x * q.bl.y)
    )
  );
}

/**
 * Checks whether the given 4 points form a strictly convex quadrilateral in clockwise order.
 */
export function isConvex(q: Quad): boolean {
  const points = [q.tl, q.tr, q.br, q.bl];
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % 4];
    const p3 = points[(i + 2) % 4];
    const cross = (p2.x - p1.x) * (p3.y - p2.y) - (p2.y - p1.y) * (p3.x - p2.x);
    if (Math.abs(cross) > 1e-4) {
      const currentSign = cross > 0 ? 1 : -1;
      if (sign === 0) {
        sign = currentSign;
      } else if (sign !== currentSign) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Generates an aesthetic default guide quad when document edges are not clearly detected.
 */
export function getDefaultQuad(width: number, height: number, mode: ScannerMode = "docs"): Quad {
  if (mode === "idcard") {
    // ISO/IEC 7810 ID-1 standard ratio: 85.60 mm x 53.98 mm = ~1.5858
    const cardRatio = 1.5858;
    let cardW = width * 0.84;
    let cardH = cardW / cardRatio;
    if (cardH > height * 0.72) {
      cardH = height * 0.72;
      cardW = cardH * cardRatio;
    }
    const x1 = Math.round((width - cardW) / 2);
    const y1 = Math.round((height - cardH) / 2);
    const x2 = Math.round(x1 + cardW);
    const y2 = Math.round(y1 + cardH);
    return {
      tl: { x: x1, y: y1 },
      tr: { x: x2, y: y1 },
      br: { x: x2, y: y2 },
      bl: { x: x1, y: y2 },
    };
  }

  // Docs mode: 8% margin centered
  const marginX = Math.round(width * 0.08);
  const marginY = Math.round(height * 0.08);
  return {
    tl: { x: marginX, y: marginY },
    tr: { x: width - marginX, y: marginY },
    br: { x: width - marginX, y: height - marginY },
    bl: { x: marginX, y: height - marginY },
  };
}

/**
 * Smooths quadrilateral corners across video frames using Exponential Moving Average (EMA).
 * Adapts alpha dynamically: subtle for micro-jitter/hand tremor, responsive for large camera moves.
 */
export function smoothQuad(current: Quad, previous: Quad | null, alpha = 0.35): Quad {
  if (!previous) return current;

  let effectiveAlpha = alpha;
  if (alpha === 0.35) {
    const dTL = distance(previous.tl, current.tl);
    const dTR = distance(previous.tr, current.tr);
    const dBR = distance(previous.br, current.br);
    const dBL = distance(previous.bl, current.bl);
    const maxDelta = Math.max(dTL, dTR, dBR, dBL);

    if (maxDelta < 6) {
      effectiveAlpha = 0.2;
    } else if (maxDelta > 24) {
      effectiveAlpha = 0.6;
    }
  }

  const lerp = (a: number, b: number) => Math.round(a * (1 - effectiveAlpha) + b * effectiveAlpha);
  return {
    tl: { x: lerp(previous.tl.x, current.tl.x), y: lerp(previous.tl.y, current.tl.y) },
    tr: { x: lerp(previous.tr.x, current.tr.x), y: lerp(previous.tr.y, current.tr.y) },
    br: { x: lerp(previous.br.x, current.br.x), y: lerp(previous.br.y, current.br.y) },
    bl: { x: lerp(previous.bl.x, current.bl.x), y: lerp(previous.bl.y, current.bl.y) },
  };
}

/**
 * Internal downsampled buffer for fast real-time frame analysis.
 */
let sharedProcCanvas: HTMLCanvasElement | null = null;

function getProcessingCanvas(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  if (!sharedProcCanvas) {
    sharedProcCanvas = document.createElement("canvas");
  }
  if (sharedProcCanvas.width !== width || sharedProcCanvas.height !== height) {
    sharedProcCanvas.width = width;
    sharedProcCanvas.height = height;
  }
  const ctx = sharedProcCanvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not acquire 2D context");
  return { canvas: sharedProcCanvas, ctx };
}

/**
 * Detects 4 document corners in a live video frame or image canvas.
 * Highly optimized for 30+ FPS by downsampling to ~320px width.
 */
export function detectDocumentQuad(
  source: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement,
  mode: ScannerMode = "docs"
): DetectionResult {
  const srcWidth = "videoWidth" in source ? source.videoWidth : source.width;
  const srcHeight = "videoHeight" in source ? source.videoHeight : source.height;

  if (!srcWidth || !srcHeight || srcWidth < 10 || srcHeight < 10) {
    const defaultQuad = getDefaultQuad(srcWidth || 300, srcHeight || 400, mode);
    return { quad: defaultQuad, confidence: 0, detected: false };
  }

  // Downsample to ~320px width for fast 30fps CV analysis
  const targetWidth = 320;
  const scale = targetWidth / srcWidth;
  const targetHeight = Math.max(10, Math.round(srcHeight * scale));

  let ctx: CanvasRenderingContext2D;
  try {
    const proc = getProcessingCanvas(targetWidth, targetHeight);
    ctx = proc.ctx;
  } catch {
    return { quad: getDefaultQuad(srcWidth, srcHeight, mode), confidence: 0, detected: false };
  }

  ctx.drawImage(source, 0, 0, targetWidth, targetHeight);
  const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
  const data = imgData.data;
  const totalPixels = targetWidth * targetHeight;

  // 1. Compute grayscale and histogram
  const gray = new Uint8Array(totalPixels);
  const hist = new Int32Array(256);
  for (let i = 0; i < totalPixels; i++) {
    const idx = i << 2;
    // Fast integer luminance: (2*R + 5*G + 1*B) >> 3
    const lum = (data[idx] * 2 + data[idx + 1] * 5 + data[idx + 2]) >> 3;
    gray[i] = lum;
    hist[lum]++;
  }

  // 2. Compute dynamic contrast percentiles and background estimation from frame corners
  const corner1 = gray[2 * targetWidth + 2];
  const corner2 = gray[2 * targetWidth + (targetWidth - 3)];
  const corner3 = gray[(targetHeight - 3) * targetWidth + 2];
  const corner4 = gray[(targetHeight - 3) * targetWidth + (targetWidth - 3)];
  const estimatedBgLum = (corner1 + corner2 + corner3 + corner4) >> 2;

  // 10th and 90th percentile luminance for adaptive sensitivity
  let p10 = 0;
  let p90 = 255;
  let acc = 0;
  const count10 = totalPixels * 0.1;
  const count90 = totalPixels * 0.9;
  for (let t = 0; t < 256; t++) {
    acc += hist[t];
    if (acc >= count10 && p10 === 0) p10 = t;
    if (acc >= count90) {
      p90 = t;
      break;
    }
  }
  const dynamicRange = Math.max(20, p90 - p10);
  const minEdgeDiff = Math.max(12, Math.min(32, Math.round(dynamicRange * 0.16)));

  // 3. Otsu thresholding for document paper separation
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];
  let sumB = 0;
  let wB = 0;
  let maxVar = 0;
  let otsuThreshold = 128;

  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = totalPixels - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const varBetween = wB * wF * (mB - mF) * (mB - mF);
    if (varBetween > maxVar) {
      maxVar = varBetween;
      otsuThreshold = t;
    }
  }

  // 4. Perimeter Boundary Ray-Casting with Notebook Ruling Suppression & Step Persistence
  // Sample along 48 radial lines emanating from frame center to find document perimeter
  const cx = targetWidth >> 1;
  const cy = targetHeight >> 1;
  const centerLum = gray[cy * targetWidth + cx];
  const isDocumentLighter = centerLum >= otsuThreshold;

  const boundaryPoints: Point[] = [];
  const NUM_RAYS = 48;
  const maxR = Math.hypot(cx, cy);

  for (let r = 0; r < NUM_RAYS; r++) {
    const angle = (r * 2 * Math.PI) / NUM_RAYS;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    let lastVal = centerLum;
    let edgeFound = false;

    // Step outward from center
    for (let step = 8; step < maxR; step += 4) {
      const px = Math.round(cx + cos * step);
      const py = Math.round(cy + sin * step);
      if (px <= 2 || px >= targetWidth - 3 || py <= 2 || py >= targetHeight - 3) {
        break;
      }

      const idx = py * targetWidth + px;
      const val = gray[idx];

      // Check contrast gradient against center and previous sample
      const diff = Math.abs(val - lastVal);
      const crossedOtsu = isDocumentLighter
        ? val < otsuThreshold - 12 || val <= estimatedBgLum + 10
        : val > otsuThreshold + 12 || val >= estimatedBgLum - 10;

      if (diff > minEdgeDiff || crossedOtsu) {
        // Look-ahead verification to suppress notebook lines, handwriting, or text strokes
        // Notebook rulings are thin (1-2 samples); a real document edge remains persistent.
        const aheadStep1 = step + 6;
        const aheadStep2 = step + 12;
        const ax1 = Math.round(cx + cos * aheadStep1);
        const ay1 = Math.round(cy + sin * aheadStep1);
        const ax2 = Math.round(cx + cos * aheadStep2);
        const ay2 = Math.round(cy + sin * aheadStep2);

        let isImpulse = false;
        if (
          ax1 > 2 &&
          ax1 < targetWidth - 3 &&
          ay1 > 2 &&
          ay1 < targetHeight - 3 &&
          ax2 > 2 &&
          ax2 < targetWidth - 3 &&
          ay2 > 2 &&
          ay2 < targetHeight - 3
        ) {
          const val1 = gray[ay1 * targetWidth + ax1];
          const val2 = gray[ay2 * targetWidth + ax2];
          // If the signal bounces back towards center luminance, it is internal ink/ruling
          if (
            Math.abs(val1 - centerLum) < minEdgeDiff &&
            Math.abs(val2 - centerLum) < minEdgeDiff
          ) {
            isImpulse = true;
          }
        }

        if (!isImpulse) {
          boundaryPoints.push({ x: px, y: py });
          edgeFound = true;
          break;
        }
      }
      lastVal = val;
    }

    if (!edgeFound) {
      // Fallback edge point near border
      const px = Math.max(4, Math.min(targetWidth - 5, Math.round(cx + cos * (maxR * 0.85))));
      const py = Math.max(4, Math.min(targetHeight - 5, Math.round(cy + sin * (maxR * 0.85))));
      boundaryPoints.push({ x: px, y: py });
    }
  }

  // 5. Extract 4 candidate corners from boundary points
  if (boundaryPoints.length < 4) {
    return { quad: getDefaultQuad(srcWidth, srcHeight, mode), confidence: 0, detected: false };
  }

  // Determine centroid and principal orientation angle to support tilted documents
  let sumX = 0;
  let sumY = 0;
  for (const p of boundaryPoints) {
    sumX += p.x;
    sumY += p.y;
  }
  const centroidX = sumX / boundaryPoints.length;
  const centroidY = sumY / boundaryPoints.length;

  let m20 = 0;
  let m02 = 0;
  let m11 = 0;
  for (const p of boundaryPoints) {
    const dx = p.x - centroidX;
    const dy = p.y - centroidY;
    m20 += dx * dx;
    m02 += dy * dy;
    m11 += dx * dy;
  }

  let theta = 0.5 * Math.atan2(2 * m11, m20 - m02);
  if (theta > Math.PI / 4) theta -= Math.PI / 2;
  if (theta < -Math.PI / 4) theta += Math.PI / 2;
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);

  // Project boundary points onto document-aligned coordinate frame
  let tl = boundaryPoints[0];
  let tr = boundaryPoints[0];
  let br = boundaryPoints[0];
  let bl = boundaryPoints[0];

  let minSum = Infinity;
  let maxSum = -Infinity;
  let minDiff = Infinity;
  let maxDiff = -Infinity;

  for (const p of boundaryPoints) {
    const dx = p.x - centroidX;
    const dy = p.y - centroidY;
    const rx = dx * cosT + dy * sinT;
    const ry = -dx * sinT + dy * cosT;

    const sumVal = rx + ry;
    const diffVal = rx - ry;

    if (sumVal < minSum) {
      minSum = sumVal;
      tl = p;
    }
    if (sumVal > maxSum) {
      maxSum = sumVal;
      br = p;
    }
    if (diffVal > maxDiff) {
      maxDiff = diffVal;
      tr = p;
    }
    if (diffVal < minDiff) {
      minDiff = diffVal;
      bl = p;
    }
  }

  // Scale back to source resolution
  const invScale = 1 / scale;
  const detectedQuad: Quad = {
    tl: { x: Math.max(0, Math.min(srcWidth, Math.round(tl.x * invScale))), y: Math.max(0, Math.min(srcHeight, Math.round(tl.y * invScale))) },
    tr: { x: Math.max(0, Math.min(srcWidth, Math.round(tr.x * invScale))), y: Math.max(0, Math.min(srcHeight, Math.round(tr.y * invScale))) },
    br: { x: Math.max(0, Math.min(srcWidth, Math.round(br.x * invScale))), y: Math.max(0, Math.min(srcHeight, Math.round(br.y * invScale))) },
    bl: { x: Math.max(0, Math.min(srcWidth, Math.round(bl.x * invScale))), y: Math.max(0, Math.min(srcHeight, Math.round(bl.y * invScale))) },
  };

  // 5. Validate quad geometry
  const area = quadArea(detectedQuad);
  const totalFrameArea = srcWidth * srcHeight;
  const areaRatio = area / totalFrameArea;

  const validConvex = isConvex(detectedQuad);
  const validArea = areaRatio >= 0.15 && areaRatio <= 0.95;

  if (validConvex && validArea) {
    if (mode === "idcard") {
      const topW = distance(detectedQuad.tl, detectedQuad.tr);
      const leftH = distance(detectedQuad.tl, detectedQuad.bl);
      const ratio = topW / Math.max(1, leftH);
      if (ratio < 0.8 || ratio > 2.8) {
        return { quad: getDefaultQuad(srcWidth, srcHeight, mode), confidence: 0.3, detected: false };
      }
    }
    const confidence = Math.min(1, Math.max(0.4, areaRatio * 1.5));
    return { quad: detectedQuad, confidence, detected: true };
  }

  return { quad: getDefaultQuad(srcWidth, srcHeight, mode), confidence: 0.2, detected: false };
}

/**
 * Performs closed-form projective homography warp transformation.
 * Takes 4 source quad points and rectifies the enclosed image onto a flat destination canvas.
 * Uses sub-pixel bilinear interpolation for crisp text and sharp lines.
 */
export function warpPerspective(
  sourceCanvas: HTMLCanvasElement,
  quad: Quad,
  mode: ScannerMode = "docs"
): HTMLCanvasElement {
  const srcWidth = sourceCanvas.width;
  const srcHeight = sourceCanvas.height;

  // Calculate rectified destination dimensions
  const topW = distance(quad.tl, quad.tr);
  const botW = distance(quad.bl, quad.br);
  const leftH = distance(quad.tl, quad.bl);
  const rightH = distance(quad.tr, quad.br);

  let destWidth = Math.max(topW, botW);
  let destHeight = Math.max(leftH, rightH);

  if (mode === "idcard") {
    // Snap to standard ID Card aspect ratio (~1.5858)
    const cardRatio = 1.5858;
    if (destWidth >= destHeight) {
      destHeight = Math.round(destWidth / cardRatio);
    } else {
      destWidth = Math.round(destHeight * cardRatio);
    }
  }

  // Prevent browser canvas memory overflow on oversized mobile captures
  const MAX_SIDE = 2560;
  const maxDim = Math.max(destWidth, destHeight);
  if (maxDim > MAX_SIDE) {
    const s = MAX_SIDE / maxDim;
    destWidth = Math.round(destWidth * s);
    destHeight = Math.round(destHeight * s);
  }

  destWidth = Math.max(20, Math.round(destWidth));
  destHeight = Math.max(20, Math.round(destHeight));

  // Destination canvas
  const destCanvas = document.createElement("canvas");
  destCanvas.width = destWidth;
  destCanvas.height = destHeight;

  const destCtx = destCanvas.getContext("2d", { willReadFrequently: true });
  const srcCtx = sourceCanvas.getContext("2d", { willReadFrequently: true });

  if (!destCtx || !srcCtx) {
    throw new Error("Failed to get 2D rendering context for perspective warp");
  }

  // Full Page optimization: when quad covers the full canvas, directly render without warp artifacts
  const isFullPage =
    quad.tl.x <= 2 &&
    quad.tl.y <= 2 &&
    Math.abs(quad.tr.x - srcWidth) <= 2 &&
    quad.tr.y <= 2 &&
    Math.abs(quad.br.x - srcWidth) <= 2 &&
    Math.abs(quad.br.y - srcHeight) <= 2 &&
    quad.bl.x <= 2 &&
    Math.abs(quad.bl.y - srcHeight) <= 2;

  if (isFullPage) {
    destCtx.drawImage(sourceCanvas, 0, 0, destWidth, destHeight);
    return destCanvas;
  }

  const srcImageData = srcCtx.getImageData(0, 0, srcWidth, srcHeight);
  const srcData = srcImageData.data;
  const destImageData = destCtx.createImageData(destWidth, destHeight);
  const destData = destImageData.data;

  // Paul Heckbert's Projective Mapping from Rectangle [0, W] x [0, H] to Quad
  const x0 = quad.tl.x;
  const y0 = quad.tl.y;
  const x1 = quad.tr.x;
  const y1 = quad.tr.y;
  const x2 = quad.br.x;
  const y2 = quad.br.y;
  const x3 = quad.bl.x;
  const y3 = quad.bl.y;

  const dx1 = x1 - x2;
  const dx2 = x3 - x2;
  const sx = x0 - x1 + x2 - x3;

  const dy1 = y1 - y2;
  const dy2 = y3 - y2;
  const sy = y0 - y1 + y2 - y3;

  let a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number;

  const det = dx1 * dy2 - dx2 * dy1;

  if (Math.abs(det) < 1e-7 || (sx === 0 && sy === 0)) {
    // Affine transformation
    a = x1 - x0;
    b = x2 - x1;
    c = x0;
    d = y1 - y0;
    e = y2 - y1;
    f = y0;
    g = 0;
    h = 0;
  } else {
    g = (sx * dy2 - sy * dx2) / det;
    h = (dx1 * sy - dy1 * sx) / det;
    a = x1 - x0 + g * x1;
    b = x3 - x0 + h * x3;
    c = x0;
    d = y1 - y0 + g * y1;
    e = y3 - y0 + h * y3;
    f = y0;
  }

  const invW = 1 / destWidth;
  const invH = 1 / destHeight;
  const srcW1 = srcWidth - 1;
  const srcH1 = srcHeight - 1;

  // Fast pixel loop with bilinear interpolation
  for (let y = 0; y < destHeight; y++) {
    const v = y * invH;
    const destRowOffset = y * destWidth;

    for (let x = 0; x < destWidth; x++) {
      const u = x * invW;
      const denom = g * u + h * v + 1;
      const srcX = (a * u + b * v + c) / denom;
      const srcY = (d * u + e * v + f) / denom;

      const destIdx = (destRowOffset + x) << 2;

      if (srcX >= 0 && srcX <= srcW1 && srcY >= 0 && srcY <= srcH1) {
        const xFloor = Math.floor(srcX);
        const yFloor = Math.floor(srcY);
        const xCeil = Math.min(srcW1, xFloor + 1);
        const yCeil = Math.min(srcH1, yFloor + 1);

        const fx = srcX - xFloor;
        const fy = srcY - yFloor;
        const fx1 = 1 - fx;
        const fy1 = 1 - fy;

        const w00 = fx1 * fy1;
        const w10 = fx * fy1;
        const w01 = fx1 * fy;
        const w11 = fx * fy;

        const idx00 = (yFloor * srcWidth + xFloor) << 2;
        const idx10 = (yFloor * srcWidth + xCeil) << 2;
        const idx01 = (yCeil * srcWidth + xFloor) << 2;
        const idx11 = (yCeil * srcWidth + xCeil) << 2;

        destData[destIdx] = Math.round(
          srcData[idx00] * w00 + srcData[idx10] * w10 + srcData[idx01] * w01 + srcData[idx11] * w11
        );
        destData[destIdx + 1] = Math.round(
          srcData[idx00 + 1] * w00 + srcData[idx10 + 1] * w10 + srcData[idx01 + 1] * w01 + srcData[idx11 + 1] * w11
        );
        destData[destIdx + 2] = Math.round(
          srcData[idx00 + 2] * w00 + srcData[idx10 + 2] * w10 + srcData[idx01 + 2] * w01 + srcData[idx11 + 2] * w11
        );
        destData[destIdx + 3] = 255;
      } else {
        // Outside bounds: pure white background
        destData[destIdx] = 255;
        destData[destIdx + 1] = 255;
        destData[destIdx + 2] = 255;
        destData[destIdx + 3] = 255;
      }
    }
  }

  destCtx.putImageData(destImageData, 0, 0);
  return destCanvas;
}

/**
 * Applies one of 5 document enhancement filters to a canvas:
 * 1. "original": unedited rectified scan.
 * 2. "document": shadow elimination, background whitening, and contrast boost.
 * 3. "grayscale": normalized Rec.709 grayscale.
 * 4. "bw": adaptive local thresholding (Bradley-Roth) for crisp black ink on pure white paper.
 * 5. "color": saturation boost + color tone preservation.
 */
export function applyScannerFilter(
  inputCanvas: HTMLCanvasElement,
  filter: ScannerFilterType
): HTMLCanvasElement {
  if (filter === "original") {
    return inputCanvas;
  }

  const width = inputCanvas.width;
  const height = inputCanvas.height;
  const total = width * height;

  const outCanvas = document.createElement("canvas");
  outCanvas.width = width;
  outCanvas.height = height;

  const inCtx = inputCanvas.getContext("2d", { willReadFrequently: true });
  const outCtx = outCanvas.getContext("2d", { willReadFrequently: true });

  if (!inCtx || !outCtx) return inputCanvas;

  const imgData = inCtx.getImageData(0, 0, width, height);
  const data = imgData.data;

  if (filter === "grayscale") {
    const gray = new Uint8Array(total);
    let minLum = 255;
    let maxLum = 0;

    for (let i = 0; i < total; i++) {
      const idx = i << 2;
      const lum = Math.round(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
      gray[i] = lum;
      if (lum < minLum) minLum = lum;
      if (lum > maxLum) maxLum = lum;
    }

    const range = Math.max(1, maxLum - minLum);
    for (let i = 0; i < total; i++) {
      const idx = i << 2;
      const stretched = Math.min(255, Math.max(0, Math.round(((gray[i] - minLum) / range) * 255)));
      data[idx] = stretched;
      data[idx + 1] = stretched;
      data[idx + 2] = stretched;
    }
  } else if (filter === "bw") {
    // Bradley-Roth adaptive thresholding using 2D integral image
    const gray = new Uint8Array(total);
    for (let i = 0; i < total; i++) {
      const idx = i << 2;
      gray[i] = (data[idx] * 77 + data[idx + 1] * 150 + data[idx + 2] * 29) >> 8;
    }

    const integral = new Float64Array(total);
    for (let y = 0; y < height; y++) {
      let sum = 0;
      const rowOffset = y * width;
      const prevRowOffset = (y - 1) * width;
      for (let x = 0; x < width; x++) {
        sum += gray[rowOffset + x];
        integral[rowOffset + x] = y === 0 ? sum : integral[prevRowOffset + x] + sum;
      }
    }

    const s = Math.max(4, Math.floor(width / 12));
    const s2 = Math.floor(s / 2);
    const thresholdFactor = 0.86;

    for (let y = 0; y < height; y++) {
      const y1 = Math.max(0, y - s2);
      const y2 = Math.min(height - 1, y + s2);
      const rowOffset = y * width;

      for (let x = 0; x < width; x++) {
        const x1 = Math.max(0, x - s2);
        const x2 = Math.min(width - 1, x + s2);
        const count = (x2 - x1 + 1) * (y2 - y1 + 1);

        const a = integral[y2 * width + x2];
        const b = y1 > 0 ? integral[(y1 - 1) * width + x2] : 0;
        const c = x1 > 0 ? integral[y2 * width + (x1 - 1)] : 0;
        const d = x1 > 0 && y1 > 0 ? integral[(y1 - 1) * width + (x1 - 1)] : 0;

        const sum = a - b - c + d;
        const val = gray[rowOffset + x];
        const outColor = val * count < sum * thresholdFactor ? 0 : 255;

        const idx = (rowOffset + x) << 2;
        data[idx] = outColor;
        data[idx + 1] = outColor;
        data[idx + 2] = outColor;
      }
    }
  } else if (filter === "document") {
    // Auto/Document: Flat-field illumination correction + contrast enhancement
    const gray = new Uint8Array(total);
    for (let i = 0; i < total; i++) {
      const idx = i << 2;
      gray[i] = (data[idx] * 77 + data[idx + 1] * 150 + data[idx + 2] * 29) >> 8;
    }

    const step = Math.max(8, Math.floor(Math.min(width, height) / 20));
    const bgGridW = Math.ceil(width / step);
    const bgGridH = Math.ceil(height / step);
    const bgGrid = new Uint8Array(bgGridW * bgGridH);

    for (let gy = 0; gy < bgGridH; gy++) {
      for (let gx = 0; gx < bgGridW; gx++) {
        let maxVal = 0;
        const startX = gx * step;
        const endX = Math.min(width, startX + step);
        const startY = gy * step;
        const endY = Math.min(height, startY + step);

        for (let py = startY; py < endY; py += 2) {
          for (let px = startX; px < endX; px += 2) {
            const v = gray[py * width + px];
            if (v > maxVal) maxVal = v;
          }
        }
        bgGrid[gy * bgGridW + gx] = Math.max(60, maxVal);
      }
    }

    for (let y = 0; y < height; y++) {
      const gy = Math.min(bgGridH - 1, Math.floor(y / step));
      const rowOffset = y * width;
      for (let x = 0; x < width; x++) {
        const gx = Math.min(bgGridW - 1, Math.floor(x / step));
        const bg = bgGrid[gy * bgGridW + gx];
        const factor = 245 / Math.max(40, bg);

        const idx = (rowOffset + x) << 2;
        for (let c = 0; c < 3; c++) {
          let corrected = data[idx + c] * factor;
          if (corrected > 210) {
            corrected = 255;
          } else if (corrected < 140) {
            corrected = Math.round(corrected * 0.88);
          }
          data[idx + c] = Math.min(255, Math.max(0, Math.round(corrected)));
        }
      }
    }
  } else if (filter === "color") {
    // Color enhancement: boost saturation by +30%
    for (let i = 0; i < total; i++) {
      const idx = i << 2;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const satFactor = 1.32;
      let newR = lum + (r - lum) * satFactor;
      let newG = lum + (g - lum) * satFactor;
      let newB = lum + (b - lum) * satFactor;

      newR = 1.08 * (newR - 128) + 132;
      newG = 1.08 * (newG - 128) + 132;
      newB = 1.08 * (newB - 128) + 132;

      data[idx] = Math.min(255, Math.max(0, Math.round(newR)));
      data[idx + 1] = Math.min(255, Math.max(0, Math.round(newG)));
      data[idx + 2] = Math.min(255, Math.max(0, Math.round(newB)));
    }
  }

  outCtx.putImageData(imgData, 0, 0);
  return outCanvas;
}

/**
 * Converts a processed canvas into a standard JPEG File object.
 */
export async function canvasToJpegFile(
  canvas: HTMLCanvasElement,
  filename: string,
  quality = 0.92
): Promise<File> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error("Failed to serialize canvas to JPEG Blob."));
      },
      "image/jpeg",
      quality
    );
  });

  return new File([blob], filename, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}
