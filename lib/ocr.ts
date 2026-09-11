import type { ProgressCallback } from "@/types/conversion";

export type OcrBbox = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
};

export type OcrWord = {
  text: string;
  confidence: number;
  bbox: OcrBbox;
  fontName: string;
};

export type OcrLine = {
  text: string;
  confidence: number;
  bbox: OcrBbox;
  words: OcrWord[];
};

export type OcrParagraph = {
  text: string;
  confidence: number;
  bbox: OcrBbox;
  lines: OcrLine[];
};

export type OcrBlock = {
  type: string;
  text: string;
  confidence: number;
  bbox: OcrBbox;
  paragraphs: OcrParagraph[];
};

export type OcrPage = {
  width: number;
  height: number;
  text: string;
  confidence: number;
  blocks: OcrBlock[];
};

export type OcrRecognizeOptions = {
  language?: string;
  onProgress?: ProgressCallback;
};

export interface OcrProvider {
  id: string;
  recognize(image: HTMLCanvasElement | File | Blob, options?: OcrRecognizeOptions): Promise<OcrPage>;
}

type TessWord = {
  text?: string;
  confidence?: number;
  bbox?: OcrBbox;
  font_name?: string;
};

type TessLine = {
  text?: string;
  confidence?: number;
  bbox?: OcrBbox;
  words?: TessWord[];
};

type TessParagraph = {
  text?: string;
  confidence?: number;
  bbox?: OcrBbox;
  lines?: TessLine[];
};

type TessBlock = {
  text?: string;
  confidence?: number;
  bbox?: OcrBbox;
  blocktype?: string;
  paragraphs?: TessParagraph[];
};

function emptyBbox(): OcrBbox {
  return { x0: 0, y0: 0, x1: 0, y1: 0 };
}

function mapWord(word: TessWord): OcrWord | null {
  const text = (word.text || "").replace(/\s+/g, " ").trim();
  if (!text) return null;
  return {
    text,
    confidence: word.confidence ?? 0,
    bbox: word.bbox || emptyBbox(),
    fontName: word.font_name || "",
  };
}

function mapLine(line: TessLine): OcrLine | null {
  const words = (line.words || []).map(mapWord).filter((item): item is OcrWord => Boolean(item));
  const text = (line.text || words.map((word) => word.text).join(" ")).replace(/\s+/g, " ").trim();
  if (!text) return null;
  return {
    text,
    confidence: line.confidence ?? 0,
    bbox: line.bbox || emptyBbox(),
    words,
  };
}

function mapParagraph(paragraph: TessParagraph): OcrParagraph | null {
  const lines = (paragraph.lines || []).map(mapLine).filter((item): item is OcrLine => Boolean(item));
  const text = (paragraph.text || lines.map((line) => line.text).join("\n")).replace(/\s+/g, " ").trim();
  if (!text) return null;
  return {
    text,
    confidence: paragraph.confidence ?? 0,
    bbox: paragraph.bbox || emptyBbox(),
    lines,
  };
}

async function canvasFromInput(image: HTMLCanvasElement | File | Blob): Promise<{ canvas: HTMLCanvasElement; width: number; height: number }> {
  if (image instanceof HTMLCanvasElement) {
    return { canvas: image, width: image.width, height: image.height };
  }
  const bitmap = await createImageBitmap(image);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) {
    bitmap.close?.();
    throw new Error("Could not read this image for OCR.");
  }
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close?.();
  return { canvas, width: canvas.width, height: canvas.height };
}

class TesseractOcrProvider implements OcrProvider {
  id = "tesseract";
  private workerPromise: Promise<{
    recognize: (image: HTMLCanvasElement) => Promise<{ data: { text?: string; confidence?: number; blocks?: TessBlock[] | null } }>;
    terminate: () => Promise<unknown>;
  } | null> | null = null;

  private async getWorker(language: string) {
    if (!this.workerPromise) {
      this.workerPromise = (async () => {
        const tesseract = await import("tesseract.js");
        const worker = await tesseract.createWorker(language, 1);
        await worker.setParameters({
          tessedit_pageseg_mode: tesseract.PSM.AUTO,
        });
        return worker;
      })();
    }
    return this.workerPromise;
  }

  async recognize(image: HTMLCanvasElement | File | Blob, options: OcrRecognizeOptions = {}): Promise<OcrPage> {
    const language = options.language || "eng";
    const { canvas, width, height } = await canvasFromInput(image);
    options.onProgress?.(1, 3);
    try {
      const worker = await this.getWorker(language);
      if (!worker) {
        throw new Error("OCR engine failed to start.");
      }
      options.onProgress?.(2, 3);
      const result = await worker.recognize(canvas);
      const blocks = (result.data.blocks || [])
        .map((block) => {
          const paragraphs = (block.paragraphs || [])
            .map(mapParagraph)
            .filter((item): item is OcrParagraph => Boolean(item));
          const text = (block.text || paragraphs.map((item) => item.text).join("\n")).replace(/\s+/g, " ").trim();
          if (!text) return null;
          return {
            type: block.blocktype || "text",
            text,
            confidence: block.confidence ?? 0,
            bbox: block.bbox || emptyBbox(),
            paragraphs,
          } satisfies OcrBlock;
        })
        .filter((item): item is OcrBlock => Boolean(item));
      options.onProgress?.(3, 3);
      return {
        width,
        height,
        text: (result.data.text || "").trim(),
        confidence: result.data.confidence ?? 0,
        blocks,
      };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : "OCR could not read this image.");
    }
  }
}

let defaultProvider: OcrProvider | null = null;

export function getOcrProvider(): OcrProvider {
  if (!defaultProvider) defaultProvider = new TesseractOcrProvider();
  return defaultProvider;
}

export function setOcrProvider(provider: OcrProvider) {
  defaultProvider = provider;
}

export async function recognizeImage(
  image: HTMLCanvasElement | File | Blob,
  options?: OcrRecognizeOptions
): Promise<OcrPage> {
  return getOcrProvider().recognize(image, options);
}
