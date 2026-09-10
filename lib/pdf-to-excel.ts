import * as XLSX from "xlsx";
import { loadPdfJsDocument, yieldToMain } from "@/lib/pdf-render";
import type { ProgressCallback } from "@/types/conversion";

export type TableCell = string;
export type TableRow = TableCell[];

export type ExtractedSheet = {
  name: string;
  rows: TableRow[];
};

export type PdfToExcelResult = {
  sheets: ExtractedSheet[];
  pageCount: number;
  likelyTable: boolean;
};

type LocatedText = {
  text: string;
  x: number;
  y: number;
  width: number;
};

function cluster(values: number[], tolerance: number): number[] {
  if (values.length === 0) return [];
  const sorted = [...values].sort((a, b) => a - b);
  const groups: number[][] = [[sorted[0]]];
  for (let i = 1; i < sorted.length; i += 1) {
    const last = groups[groups.length - 1];
    if (sorted[i] - last[last.length - 1] <= tolerance) last.push(sorted[i]);
    else groups.push([sorted[i]]);
  }
  return groups.map((group) => group.reduce((sum, value) => sum + value, 0) / group.length);
}

function nearest(value: number, centers: number[]): number {
  let best = 0;
  let bestDist = Infinity;
  centers.forEach((center, index) => {
    const dist = Math.abs(center - value);
    if (dist < bestDist) {
      best = index;
      bestDist = dist;
    }
  });
  return best;
}

function looksTabular(row: LocatedText[]): boolean {
  if (row.length < 2) return false;
  const xs = row.map((item) => item.x).sort((a, b) => a - b);
  let gaps = 0;
  for (let i = 1; i < xs.length; i += 1) {
    if (xs[i] - xs[i - 1] > 28) gaps += 1;
  }
  return gaps >= 1;
}

export async function extractPdfTables(
  file: File,
  onProgress?: ProgressCallback
): Promise<PdfToExcelResult> {
  const pdf = await loadPdfJsDocument(file);
  const sheets: ExtractedSheet[] = [];
  let tableRows = 0;

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const items: LocatedText[] = [];

    for (const item of content.items) {
      if (!("str" in item) || typeof item.str !== "string") continue;
      const text = item.str.replace(/\s+/g, " ").trim();
      if (!text) continue;
      const transform = "transform" in item ? item.transform : [1, 0, 0, 1, 0, 0];
      const width = "width" in item ? Number(item.width) || text.length * 5 : text.length * 5;
      items.push({
        text,
        x: Number(transform[4]) || 0,
        y: Number(transform[5]) || 0,
        width,
      });
    }

    items.sort((a, b) => b.y - a.y || a.x - b.x);
    const rows: LocatedText[][] = [];
    const yTolerance = 5;
    for (const item of items) {
      const last = rows[rows.length - 1];
      if (last && Math.abs(last[0].y - item.y) <= yTolerance) last.push(item);
      else rows.push([item]);
    }

    const xs = items.map((item) => item.x);
    const columns = cluster(xs, 22);
    const columnCount = Math.max(1, columns.length);
    const sheetRows: TableRow[] = [];

    for (const row of rows) {
      row.sort((a, b) => a.x - b.x);
      if (looksTabular(row)) tableRows += 1;
      const cells = Array.from({ length: columnCount }, () => "");
      for (const item of row) {
        const index = nearest(item.x, columns.length ? columns : [item.x]);
        cells[index] = cells[index] ? `${cells[index]} ${item.text}` : item.text;
      }
      if (cells.some((cell) => cell.trim())) sheetRows.push(cells.map((cell) => cell.trim()));
    }

    sheets.push({
      name: `Page ${pageNumber}`.slice(0, 31),
      rows: sheetRows.length > 0 ? sheetRows : [[""]],
    });
    page.cleanup();
    onProgress?.(pageNumber, pdf.numPages);
    await yieldToMain();
  }

  await pdf.destroy();
  return {
    sheets,
    pageCount: pdf.numPages,
    likelyTable: tableRows >= 3,
  };
}

export function workbookFromSheets(sheets: ExtractedSheet[]): Blob {
  const workbook = XLSX.utils.book_new();
  sheets.forEach((sheet, index) => {
    const safeName = (sheet.name || `Sheet${index + 1}`).replace(/[\\/?*[\]]/g, " ").slice(0, 31);
    const worksheet = XLSX.utils.aoa_to_sheet(sheet.rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, safeName || `Sheet${index + 1}`);
  });
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
