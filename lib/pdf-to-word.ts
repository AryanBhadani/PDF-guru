import { Document, Packer, Paragraph, TextRun } from "docx";
import { loadPdfJsDocument, yieldToMain } from "@/lib/pdf-render";
import type { ProgressCallback } from "@/types/conversion";

export type PdfTextLine = {
  pageNumber: number;
  text: string;
};

export type PdfToWordResult = {
  blob: Blob;
  lines: PdfTextLine[];
  charCount: number;
  pageCount: number;
  likelyScanned: boolean;
};

type TextItem = {
  str: string;
  x: number;
  y: number;
};

export async function extractPdfText(
  file: File,
  onProgress?: ProgressCallback
): Promise<{ lines: PdfTextLine[]; pageCount: number; charCount: number }> {
  const pdf = await loadPdfJsDocument(file);
  const lines: PdfTextLine[] = [];
  let charCount = 0;

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const items: TextItem[] = [];

    for (const item of content.items) {
      if (!("str" in item) || typeof item.str !== "string") continue;
      const text = item.str.replace(/\s+/g, " ").trim();
      if (!text) continue;
      const transform = "transform" in item ? item.transform : [1, 0, 0, 1, 0, 0];
      items.push({
        str: text,
        x: Number(transform[4]) || 0,
        y: Number(transform[5]) || 0,
      });
    }

    items.sort((a, b) => b.y - a.y || a.x - b.x);
    const grouped: TextItem[][] = [];
    const yTolerance = 4;
    for (const item of items) {
      const last = grouped[grouped.length - 1];
      if (last && Math.abs(last[0].y - item.y) <= yTolerance) {
        last.push(item);
      } else {
        grouped.push([item]);
      }
    }

    for (const group of grouped) {
      group.sort((a, b) => a.x - b.x);
      const text = group
        .map((part) => part.str)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (!text) continue;
      lines.push({ pageNumber, text });
      charCount += text.length;
    }

    page.cleanup();
    onProgress?.(pageNumber, pdf.numPages);
    await yieldToMain();
  }

  await pdf.destroy();
  return { lines, pageCount: pdf.numPages, charCount };
}

export async function convertPdfToDocx(
  file: File,
  onProgress?: ProgressCallback
): Promise<PdfToWordResult> {
  const extracted = await extractPdfText(file, onProgress);
  const likelyScanned = extracted.charCount < Math.max(40, extracted.pageCount * 12);

  const children: Paragraph[] = [];
  let lastPage = 0;
  for (const line of extracted.lines) {
    if (line.pageNumber !== lastPage) {
      if (lastPage !== 0) {
        children.push(new Paragraph({ children: [new TextRun("")] }));
      }
      lastPage = line.pageNumber;
    }
    children.push(
      new Paragraph({
        children: [new TextRun({ text: line.text, size: 22 })],
        spacing: { after: 120 },
      })
    );
  }

  if (children.length === 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "No selectable text was found in this PDF.",
            italics: true,
          }),
        ],
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  return {
    blob,
    lines: extracted.lines,
    charCount: extracted.charCount,
    pageCount: extracted.pageCount,
    likelyScanned,
  };
}
