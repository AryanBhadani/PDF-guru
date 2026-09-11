import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  PageOrientation,
  UnderlineType,
  ShadingType,
} from "docx";
import type { OcrPage } from "@/lib/ocr";

export type LayoutRun = {
  text: string;
  fontSize?: number;
  fontName?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
};

export type LayoutParagraph = {
  kind: "paragraph";
  runs: LayoutRun[];
  alignment?: "left" | "center" | "right" | "justify";
  heading?: 1 | 2 | 3;
  spacingAfter?: number;
  spacingBefore?: number;
};

export type LayoutTable = {
  kind: "table";
  rows: string[][];
};

export type LayoutImage = {
  kind: "image";
  data: Uint8Array;
  widthPx: number;
  heightPx: number;
  format: "png" | "jpg";
};

export type LayoutBlock = LayoutParagraph | LayoutTable | LayoutImage;

export type LayoutPage = {
  widthPt: number;
  heightPt: number;
  blocks: LayoutBlock[];
};

const FONT_MAP: Array<{ test: RegExp; name: string }> = [
  { test: /times|georgia|garamond|serif/i, name: "Times New Roman" },
  { test: /courier|mono|consolas/i, name: "Courier New" },
  { test: /comic/i, name: "Comic Sans MS" },
  { test: /trebuchet/i, name: "Trebuchet MS" },
  { test: /verdana/i, name: "Verdana" },
  { test: /georgia/i, name: "Georgia" },
  { test: /calibri/i, name: "Calibri" },
  { test: /helvetica|arial|sans|roboto|noto|inter/i, name: "Arial" },
];

export function closestFont(name?: string): string {
  if (!name) return "Calibri";
  const match = FONT_MAP.find((entry) => entry.test.test(name));
  return match?.name || "Calibri";
}

function headingLevel(level: 1 | 2 | 3) {
  if (level === 1) return HeadingLevel.HEADING_1;
  if (level === 2) return HeadingLevel.HEADING_2;
  return HeadingLevel.HEADING_3;
}

function alignmentType(value?: LayoutParagraph["alignment"]) {
  if (value === "center") return AlignmentType.CENTER;
  if (value === "right") return AlignmentType.RIGHT;
  if (value === "justify") return AlignmentType.JUSTIFIED;
  return AlignmentType.LEFT;
}

function runFromLayout(run: LayoutRun): TextRun {
  const size = Math.max(16, Math.round((run.fontSize || 11) * 2));
  return new TextRun({
    text: run.text,
    bold: Boolean(run.bold),
    italics: Boolean(run.italic),
    underline: run.underline ? { type: UnderlineType.SINGLE } : undefined,
    size,
    font: closestFont(run.fontName),
    color: run.color ? run.color.replace("#", "") : undefined,
  });
}

function paragraphFromLayout(block: LayoutParagraph): Paragraph {
  const children = (block.runs.length ? block.runs : [{ text: "" }]).map(runFromLayout);
  return new Paragraph({
    children,
    alignment: alignmentType(block.alignment),
    heading: block.heading ? headingLevel(block.heading) : undefined,
    spacing: {
      before: block.spacingBefore ?? 40,
      after: block.spacingAfter ?? 120,
    },
  });
}

function tableFromLayout(block: LayoutTable): Table {
  const colCount = Math.max(1, ...block.rows.map((row) => row.length));
  const rows = (block.rows.length ? block.rows : [[""]]).map(
    (row, rowIndex) =>
      new TableRow({
        children: Array.from({ length: colCount }, (_, index) => {
          const text = row[index] || "";
          return new TableCell({
            width: { size: Math.round(9000 / colCount), type: WidthType.DXA },
            shading: rowIndex === 0 ? { type: ShadingType.CLEAR, fill: "F3F4F6" } : undefined,
            margins: { top: 60, bottom: 60, left: 80, right: 80 },
            children: [
              new Paragraph({
                children: [new TextRun({ text, size: 20, font: "Calibri" })],
              }),
            ],
          });
        }),
      })
  );
  return new Table({
    width: { size: 9000, type: WidthType.DXA },
    columnWidths: Array.from({ length: colCount }, () => Math.round(9000 / colCount)),
    rows,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: "D1D5DB" },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "D1D5DB" },
      left: { style: BorderStyle.SINGLE, size: 4, color: "D1D5DB" },
      right: { style: BorderStyle.SINGLE, size: 4, color: "D1D5DB" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "E5E7EB" },
      insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "E5E7EB" },
    },
  });
}

function imageParagraph(block: LayoutImage, maxWidthPx: number): Paragraph {
  const scale = Math.min(1, maxWidthPx / Math.max(1, block.widthPx));
  const width = Math.max(24, Math.round(block.widthPx * scale));
  const height = Math.max(24, Math.round(block.heightPx * scale));
  return new Paragraph({
    spacing: { before: 120, after: 120 },
    children: [
      new ImageRun({
        type: block.format,
        data: block.data,
        transformation: { width, height },
      }),
    ],
  });
}

export async function layoutPagesToDocx(pages: LayoutPage[]): Promise<Blob> {
  if (pages.length === 0) {
    pages = [{ widthPt: 595.28, heightPt: 841.89, blocks: [{ kind: "paragraph", runs: [{ text: "No content was found." }], alignment: "left" }] }];
  }

  const sections = pages.map((page, index) => {
    const landscape = page.widthPt > page.heightPt;
    const children: Array<Paragraph | Table> = [];
    if (index > 0) {
      children.push(new Paragraph({ pageBreakBefore: true, children: [] }));
    }
    const maxImageWidth = landscape ? 720 : 560;
    if (page.blocks.length === 0) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: "No text was found on this page.", italics: true, size: 20 })],
        })
      );
    }
    for (const block of page.blocks) {
      if (block.kind === "paragraph") children.push(paragraphFromLayout(block));
      else if (block.kind === "table") children.push(tableFromLayout(block));
      else children.push(imageParagraph(block, maxImageWidth));
    }
    return {
      properties: {
        page: {
          size: {
            width: Math.round(page.widthPt * 20),
            height: Math.round(page.heightPt * 20),
            orientation: landscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT,
          },
          margin: {
            top: 720,
            bottom: 720,
            left: 720,
            right: 720,
          },
        },
      },
      children,
    };
  });

  const doc = new Document({
    sections,
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 22 },
        },
      },
    },
  });
  return Packer.toBlob(doc);
}

type LocatedWord = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontName: string;
  bold: boolean;
  italic: boolean;
  underline?: boolean;
  color?: string;
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

function looksTabular(row: LocatedWord[]): boolean {
  if (row.length < 2) return false;
  const xs = row.map((item) => item.x).sort((a, b) => a - b);
  let gaps = 0;
  for (let i = 1; i < xs.length; i += 1) {
    if (xs[i] - xs[i - 1] > Math.max(22, row[0].height * 1.6)) gaps += 1;
  }
  return gaps >= 1;
}

function lineAlignment(row: LocatedWord[], pageWidth: number): LayoutParagraph["alignment"] {
  const minX = Math.min(...row.map((item) => item.x));
  const maxX = Math.max(...row.map((item) => item.x + item.width));
  const lineWidth = maxX - minX;
  const leftGap = minX;
  const rightGap = pageWidth - maxX;
  if (lineWidth > pageWidth * 0.72 && Math.abs(leftGap - rightGap) < pageWidth * 0.12) return "justify";
  if (Math.abs(leftGap - rightGap) < pageWidth * 0.08 && leftGap > pageWidth * 0.12) return "center";
  if (rightGap < pageWidth * 0.08 && leftGap > pageWidth * 0.28) return "right";
  return "left";
}

function headingForSize(size: number, median: number, text: string): 1 | 2 | 3 | undefined {
  if (text.length > 90) return undefined;
  if (size >= median * 1.7) return 1;
  if (size >= median * 1.35) return 2;
  if (size >= median * 1.18 && text.length <= 48) return 3;
  return undefined;
}

function runsFromRow(row: LocatedWord[]): LayoutRun[] {
  return row.map((item, index) => ({
    text: index === 0 ? item.text : ` ${item.text}`,
    fontSize: item.fontSize,
    fontName: item.fontName,
    bold: item.bold,
    italic: item.italic,
    underline: item.underline,
    color: item.color,
  }));
}

export function wordsToLayoutBlocks(words: LocatedWord[], pageWidth: number): LayoutBlock[] {
  if (words.length === 0) return [];
  const sorted = [...words].sort((a, b) => a.y - b.y || a.x - b.x);
  const medianSize = [...sorted.map((item) => item.fontSize)].sort((a, b) => a - b)[Math.floor(sorted.length / 2)] || 11;
  const yTol = Math.max(3, medianSize * 0.45);
  const rows: LocatedWord[][] = [];
  for (const word of sorted) {
    const last = rows[rows.length - 1];
    if (last && Math.abs(last[0].y - word.y) <= yTol) last.push(word);
    else rows.push([word]);
  }
  rows.forEach((row) => row.sort((a, b) => a.x - b.x));

  const blocks: LayoutBlock[] = [];
  let index = 0;
  while (index < rows.length) {
    const row = rows[index];
    if (looksTabular(row)) {
      const tableRows: LocatedWord[][] = [row];
      let next = index + 1;
      while (next < rows.length && (looksTabular(rows[next]) || rows[next].length >= 2)) {
        tableRows.push(rows[next]);
        next += 1;
      }
      if (tableRows.length >= 2) {
        const xs = tableRows.flat().map((item) => item.x);
        const columns = cluster(xs, 24);
        const colCount = Math.max(2, columns.length);
        const mapped = tableRows.map((tableRow) => {
          const cells = Array.from({ length: colCount }, () => "");
          for (const item of tableRow) {
            const col = nearest(item.x, columns);
            cells[col] = cells[col] ? `${cells[col]} ${item.text}` : item.text;
          }
          return cells.map((cell) => cell.trim());
        });
        blocks.push({ kind: "table", rows: mapped });
        index = next;
        continue;
      }
    }

    const text = row.map((item) => item.text).join(" ").replace(/\s+/g, " ").trim();
    if (text) {
      const size = row.reduce((sum, item) => sum + item.fontSize, 0) / row.length;
      const heading = headingForSize(size, medianSize, text);
      blocks.push({
        kind: "paragraph",
        runs: runsFromRow(row).map((run) => ({ ...run, bold: run.bold || Boolean(heading) })),
        alignment: lineAlignment(row, pageWidth),
        heading,
        spacingAfter: heading ? 160 : 80,
      });
    }
    index += 1;
  }
  return blocks;
}

export function ocrPageToLayoutBlocks(page: OcrPage, pageWidthPt: number, pageHeightPt: number): LayoutBlock[] {
  const scaleX = pageWidthPt / Math.max(1, page.width);
  const scaleY = pageHeightPt / Math.max(1, page.height);
  const words: LocatedWord[] = [];
  for (const block of page.blocks) {
    for (const paragraph of block.paragraphs) {
      for (const line of paragraph.lines) {
        const lineHeight = Math.max(8, (line.bbox.y1 - line.bbox.y0) * scaleY);
        const fontSize = Math.max(8, Math.min(28, lineHeight * 0.75));
        if (line.words.length) {
          for (const word of line.words) {
            const fontName = word.fontName || "";
            words.push({
              text: word.text,
              x: word.bbox.x0 * scaleX,
              y: word.bbox.y0 * scaleY,
              width: Math.max(4, (word.bbox.x1 - word.bbox.x0) * scaleX),
              height: lineHeight,
              fontSize,
              fontName,
              bold: /bold|black|heavy/i.test(fontName) || fontSize >= 16,
              italic: /italic|oblique/i.test(fontName),
            });
          }
        } else {
          words.push({
            text: line.text,
            x: line.bbox.x0 * scaleX,
            y: line.bbox.y0 * scaleY,
            width: Math.max(4, (line.bbox.x1 - line.bbox.x0) * scaleX),
            height: lineHeight,
            fontSize,
            fontName: "",
            bold: fontSize >= 16,
            italic: false,
          });
        }
      }
    }
  }
  if (words.length === 0 && page.text.trim()) {
    return page.text
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((text) => ({
        kind: "paragraph" as const,
        runs: [{ text, fontSize: 11, fontName: "Calibri" }],
      }));
  }
  return wordsToLayoutBlocks(words, pageWidthPt);
}

export function mergeBlocks(primary: LayoutBlock[], extras: LayoutBlock[]): LayoutBlock[] {
  return [...primary, ...extras];
}

export async function canvasToPngBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error("Could not export image."));
    }, "image/png");
  });
  return new Uint8Array(await blob.arrayBuffer());
}
