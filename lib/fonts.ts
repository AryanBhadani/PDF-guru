import { StandardFonts, type PDFDocument, type PDFFont } from "pdf-lib";

export interface FontDefinition {
  id: string;
  name: string;
  category: "sans-serif" | "serif" | "monospace" | "display";
  fontFamily: string; // CSS font-family
  pdfStandard: "Helvetica" | "TimesRoman" | "Courier";
}

export const AUTO_DETECT_FONT_ID = "auto";

export const AVAILABLE_FONTS: FontDefinition[] = [
  // 1. Arial
  {
    id: "arial",
    name: "Arial",
    category: "sans-serif",
    fontFamily: "Arial, 'Helvetica Neue', Helvetica, sans-serif",
    pdfStandard: "Helvetica",
  },
  // 2. Helvetica
  {
    id: "helvetica",
    name: "Helvetica",
    category: "sans-serif",
    fontFamily: "Helvetica, Arial, sans-serif",
    pdfStandard: "Helvetica",
  },
  // 3. Times New Roman
  {
    id: "times-new-roman",
    name: "Times New Roman",
    category: "serif",
    fontFamily: "'Times New Roman', Times, Georgia, serif",
    pdfStandard: "TimesRoman",
  },
  // 4. Courier New
  {
    id: "courier-new",
    name: "Courier New",
    category: "monospace",
    fontFamily: "'Courier New', Courier, monospace",
    pdfStandard: "Courier",
  },
  // 5. Georgia
  {
    id: "georgia",
    name: "Georgia",
    category: "serif",
    fontFamily: "Georgia, 'Times New Roman', serif",
    pdfStandard: "TimesRoman",
  },
  // 6. Verdana
  {
    id: "verdana",
    name: "Verdana",
    category: "sans-serif",
    fontFamily: "Verdana, Geneva, sans-serif",
    pdfStandard: "Helvetica",
  },
  // 7. Tahoma
  {
    id: "tahoma",
    name: "Tahoma",
    category: "sans-serif",
    fontFamily: "Tahoma, Geneva, Verdana, sans-serif",
    pdfStandard: "Helvetica",
  },
  // 8. Trebuchet MS
  {
    id: "trebuchet-ms",
    name: "Trebuchet MS",
    category: "sans-serif",
    fontFamily: "'Trebuchet MS', 'Lucida Sans Unicode', sans-serif",
    pdfStandard: "Helvetica",
  },
  // 9. Roboto
  {
    id: "roboto",
    name: "Roboto",
    category: "sans-serif",
    fontFamily: "'Roboto', Arial, sans-serif",
    pdfStandard: "Helvetica",
  },
  // 10. Open Sans
  {
    id: "open-sans",
    name: "Open Sans",
    category: "sans-serif",
    fontFamily: "'Open Sans', Arial, sans-serif",
    pdfStandard: "Helvetica",
  },
  // 11. Lato
  {
    id: "lato",
    name: "Lato",
    category: "sans-serif",
    fontFamily: "'Lato', Arial, sans-serif",
    pdfStandard: "Helvetica",
  },
  // 12. Montserrat
  {
    id: "montserrat",
    name: "Montserrat",
    category: "sans-serif",
    fontFamily: "'Montserrat', Arial, sans-serif",
    pdfStandard: "Helvetica",
  },
  // 13. Poppins
  {
    id: "poppins",
    name: "Poppins",
    category: "sans-serif",
    fontFamily: "'Poppins', Arial, sans-serif",
    pdfStandard: "Helvetica",
  },
  // 14. Nunito
  {
    id: "nunito",
    name: "Nunito",
    category: "sans-serif",
    fontFamily: "'Nunito', Arial, sans-serif",
    pdfStandard: "Helvetica",
  },
  // 15. Playfair Display
  {
    id: "playfair-display",
    name: "Playfair Display",
    category: "serif",
    fontFamily: "'Playfair Display', Georgia, serif",
    pdfStandard: "TimesRoman",
  },
  // 16. Source Sans Pro
  {
    id: "source-sans-pro",
    name: "Source Sans Pro",
    category: "sans-serif",
    fontFamily: "'Source Sans 3', 'Source Sans Pro', Arial, sans-serif",
    pdfStandard: "Helvetica",
  },
  // 17. Inter
  {
    id: "inter",
    name: "Inter",
    category: "sans-serif",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    pdfStandard: "Helvetica",
  },
  // 18. Merriweather
  {
    id: "merriweather",
    name: "Merriweather",
    category: "serif",
    fontFamily: "'Merriweather', Georgia, serif",
    pdfStandard: "TimesRoman",
  },
  // 19. Raleway
  {
    id: "raleway",
    name: "Raleway",
    category: "sans-serif",
    fontFamily: "'Raleway', Arial, sans-serif",
    pdfStandard: "Helvetica",
  },
  // 20. Noto Sans
  {
    id: "noto-sans",
    name: "Noto Sans",
    category: "sans-serif",
    fontFamily: "'Noto Sans', Arial, sans-serif",
    pdfStandard: "Helvetica",
  },
  // 21. Noto Serif
  {
    id: "noto-serif",
    name: "Noto Serif",
    category: "serif",
    fontFamily: "'Noto Serif', Georgia, serif",
    pdfStandard: "TimesRoman",
  },
  // 22. Plus Jakarta Sans
  {
    id: "plus-jakarta-sans",
    name: "Plus Jakarta Sans",
    category: "sans-serif",
    fontFamily: "'Plus Jakarta Sans', Arial, sans-serif",
    pdfStandard: "Helvetica",
  },
  // 23. DM Sans
  {
    id: "dm-sans",
    name: "DM Sans",
    category: "sans-serif",
    fontFamily: "'DM Sans', Arial, sans-serif",
    pdfStandard: "Helvetica",
  },
  // 24. PT Sans
  {
    id: "pt-sans",
    name: "PT Sans",
    category: "sans-serif",
    fontFamily: "'PT Sans', Arial, sans-serif",
    pdfStandard: "Helvetica",
  },
  // 25. Work Sans
  {
    id: "work-sans",
    name: "Work Sans",
    category: "sans-serif",
    fontFamily: "'Work Sans', Arial, sans-serif",
    pdfStandard: "Helvetica",
  },
  // 26. Oswald
  {
    id: "oswald",
    name: "Oswald",
    category: "display",
    fontFamily: "'Oswald', Arial, sans-serif",
    pdfStandard: "Helvetica",
  },
  // 27. Ubuntu
  {
    id: "ubuntu",
    name: "Ubuntu",
    category: "sans-serif",
    fontFamily: "'Ubuntu', Arial, sans-serif",
    pdfStandard: "Helvetica",
  },
  // 28. Quicksand
  {
    id: "quicksand",
    name: "Quicksand",
    category: "sans-serif",
    fontFamily: "'Quicksand', Arial, sans-serif",
    pdfStandard: "Helvetica",
  },
  // 29. Libre Baskerville
  {
    id: "libre-baskerville",
    name: "Libre Baskerville",
    category: "serif",
    fontFamily: "'Libre Baskerville', Georgia, serif",
    pdfStandard: "TimesRoman",
  },
  // 30. Fira Sans
  {
    id: "fira-sans",
    name: "Fira Sans",
    category: "sans-serif",
    fontFamily: "'Fira Sans', Arial, sans-serif",
    pdfStandard: "Helvetica",
  },
];

/**
 * Intelligent Font Detector:
 * Identifies the closest available font from the 30 professional fonts
 * given a font name string from PDF.js or OCR metadata.
 */
export function detectClosestFont(fontName?: string): FontDefinition {
  if (!fontName) {
    // Default to Arial / Inter
    return AVAILABLE_FONTS[0];
  }

  const clean = fontName.toLowerCase().replace(/[^a-z0-9]/g, "");

  // 1. Direct name matches
  if (clean.includes("courier") || clean.includes("mono") || clean.includes("consolas") || clean.includes("menlo")) {
    return AVAILABLE_FONTS.find((f) => f.id === "courier-new") || AVAILABLE_FONTS[3];
  }
  if (clean.includes("times") || clean.includes("roman") || clean.includes("timesnewroman")) {
    return AVAILABLE_FONTS.find((f) => f.id === "times-new-roman") || AVAILABLE_FONTS[2];
  }
  if (clean.includes("georgia")) {
    return AVAILABLE_FONTS.find((f) => f.id === "georgia") || AVAILABLE_FONTS[4];
  }
  if (clean.includes("playfair")) {
    return AVAILABLE_FONTS.find((f) => f.id === "playfair-display") || AVAILABLE_FONTS[14];
  }
  if (clean.includes("merriweather")) {
    return AVAILABLE_FONTS.find((f) => f.id === "merriweather") || AVAILABLE_FONTS[17];
  }
  if (clean.includes("baskerville")) {
    return AVAILABLE_FONTS.find((f) => f.id === "libre-baskerville") || AVAILABLE_FONTS[28];
  }
  if (clean.includes("notoserif")) {
    return AVAILABLE_FONTS.find((f) => f.id === "noto-serif") || AVAILABLE_FONTS[20];
  }
  if (clean.includes("serif") || clean.includes("cambria") || clean.includes("garamond") || clean.includes("minion")) {
    return AVAILABLE_FONTS.find((f) => f.id === "times-new-roman") || AVAILABLE_FONTS[2];
  }
  if (clean.includes("roboto")) {
    return AVAILABLE_FONTS.find((f) => f.id === "roboto") || AVAILABLE_FONTS[8];
  }
  if (clean.includes("opensans")) {
    return AVAILABLE_FONTS.find((f) => f.id === "open-sans") || AVAILABLE_FONTS[9];
  }
  if (clean.includes("lato")) {
    return AVAILABLE_FONTS.find((f) => f.id === "lato") || AVAILABLE_FONTS[10];
  }
  if (clean.includes("montserrat")) {
    return AVAILABLE_FONTS.find((f) => f.id === "montserrat") || AVAILABLE_FONTS[11];
  }
  if (clean.includes("poppins")) {
    return AVAILABLE_FONTS.find((f) => f.id === "poppins") || AVAILABLE_FONTS[12];
  }
  if (clean.includes("nunito")) {
    return AVAILABLE_FONTS.find((f) => f.id === "nunito") || AVAILABLE_FONTS[13];
  }
  if (clean.includes("sourcesans")) {
    return AVAILABLE_FONTS.find((f) => f.id === "source-sans-pro") || AVAILABLE_FONTS[15];
  }
  if (clean.includes("inter")) {
    return AVAILABLE_FONTS.find((f) => f.id === "inter") || AVAILABLE_FONTS[16];
  }
  if (clean.includes("raleway")) {
    return AVAILABLE_FONTS.find((f) => f.id === "raleway") || AVAILABLE_FONTS[18];
  }
  if (clean.includes("notosans")) {
    return AVAILABLE_FONTS.find((f) => f.id === "noto-sans") || AVAILABLE_FONTS[19];
  }
  if (clean.includes("jakarta")) {
    return AVAILABLE_FONTS.find((f) => f.id === "plus-jakarta-sans") || AVAILABLE_FONTS[21];
  }
  if (clean.includes("dmsans")) {
    return AVAILABLE_FONTS.find((f) => f.id === "dm-sans") || AVAILABLE_FONTS[22];
  }
  if (clean.includes("ptsans")) {
    return AVAILABLE_FONTS.find((f) => f.id === "pt-sans") || AVAILABLE_FONTS[23];
  }
  if (clean.includes("worksans")) {
    return AVAILABLE_FONTS.find((f) => f.id === "work-sans") || AVAILABLE_FONTS[24];
  }
  if (clean.includes("oswald")) {
    return AVAILABLE_FONTS.find((f) => f.id === "oswald") || AVAILABLE_FONTS[25];
  }
  if (clean.includes("ubuntu")) {
    return AVAILABLE_FONTS.find((f) => f.id === "ubuntu") || AVAILABLE_FONTS[26];
  }
  if (clean.includes("quicksand")) {
    return AVAILABLE_FONTS.find((f) => f.id === "quicksand") || AVAILABLE_FONTS[27];
  }
  if (clean.includes("fira")) {
    return AVAILABLE_FONTS.find((f) => f.id === "fira-sans") || AVAILABLE_FONTS[29];
  }
  if (clean.includes("verdana")) {
    return AVAILABLE_FONTS.find((f) => f.id === "verdana") || AVAILABLE_FONTS[5];
  }
  if (clean.includes("tahoma")) {
    return AVAILABLE_FONTS.find((f) => f.id === "tahoma") || AVAILABLE_FONTS[6];
  }
  if (clean.includes("trebuchet")) {
    return AVAILABLE_FONTS.find((f) => f.id === "trebuchet-ms") || AVAILABLE_FONTS[7];
  }
  if (clean.includes("helvetica")) {
    return AVAILABLE_FONTS.find((f) => f.id === "helvetica") || AVAILABLE_FONTS[1];
  }
  if (clean.includes("arial") || clean.includes("calibri") || clean.includes("segoe")) {
    return AVAILABLE_FONTS.find((f) => f.id === "arial") || AVAILABLE_FONTS[0];
  }

  // Fallback to Arial
  return AVAILABLE_FONTS[0];
}

/**
 * Resolves CSS font-family string for the editor canvas.
 */
export function resolveCssFontFamily(fontId?: string, detectedFontName?: string): string {
  if (!fontId || fontId === AUTO_DETECT_FONT_ID) {
    const detected = detectClosestFont(detectedFontName);
    return detected.fontFamily;
  }

  const found = AVAILABLE_FONTS.find((f) => f.id === fontId || f.name.toLowerCase() === fontId.toLowerCase());
  if (found) return found.fontFamily;

  return detectClosestFont(fontId).fontFamily;
}

/**
 * Returns human-readable font name for a given font ID.
 */
export function getFontDisplayName(fontId?: string, detectedFontName?: string): string {
  if (!fontId || fontId === AUTO_DETECT_FONT_ID) {
    const detected = detectClosestFont(detectedFontName);
    return `Use Original (Auto-Detect: ${detected.name})`;
  }

  const found = AVAILABLE_FONTS.find((f) => f.id === fontId || f.name.toLowerCase() === fontId.toLowerCase());
  return found ? found.name : fontId;
}

/**
 * Maps any chosen font (or auto-detected font) to pdf-lib standard embedded fonts.
 */
export async function getPdfStandardFont(
  pdfDoc: PDFDocument,
  fontId?: string,
  detectedFontName?: string,
  isBold?: boolean
): Promise<PDFFont> {
  const effectiveFont =
    !fontId || fontId === AUTO_DETECT_FONT_ID
      ? detectClosestFont(detectedFontName)
      : AVAILABLE_FONTS.find((f) => f.id === fontId || f.name.toLowerCase() === fontId.toLowerCase()) ||
        detectClosestFont(fontId);

  if (effectiveFont.pdfStandard === "TimesRoman") {
    return isBold
      ? await pdfDoc.embedFont(StandardFonts.TimesRomanBold)
      : await pdfDoc.embedFont(StandardFonts.TimesRoman);
  }

  if (effectiveFont.pdfStandard === "Courier") {
    return isBold
      ? await pdfDoc.embedFont(StandardFonts.CourierBold)
      : await pdfDoc.embedFont(StandardFonts.Courier);
  }

  return isBold
    ? await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    : await pdfDoc.embedFont(StandardFonts.Helvetica);
}
