export const APP_NAME = "PDF Guru";
export const APP_TAGLINE = "All Your PDF Tools in One Place";
export const APP_DESCRIPTION =
  "Convert, merge, split, create invoices, summarize, compress, mask, and clean PDFs quickly and easily.";

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
export const MAX_IMAGE_COUNT = 50;
export const MAX_PDF_COUNT = 30;

export const IMAGE_ACCEPT = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
};

export const IMAGE_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
export const PDF_MIME_TYPE = "application/pdf";
export const DOCUMENT_MIME_TYPES = [...IMAGE_MIME_TYPES, PDF_MIME_TYPE];

export const NAV_LINKS = [{ href: "/", label: "Home" }] as const;

export const CORE_TOOLS = [
  {
    href: "/photo-to-pdf",
    title: "Photo to PDF",
    description: "Turn JPG, PNG, and WEBP images into a single high-quality PDF.",
    icon: "Images",
    navLabel: "Photo to PDF",
    i18n: "photoToPdf",
  },
  {
    href: "/merge-pdf",
    title: "Merge PDF",
    description: "Combine multiple PDF files into one document in any order.",
    icon: "Combine",
    navLabel: "Merge PDF",
    i18n: "mergePdf",
  },
  {
    href: "/split-pdf",
    title: "Split PDF",
    description: "Extract page ranges or save every page as its own PDF.",
    icon: "Scissors",
    navLabel: "Split PDF",
    i18n: "splitPdf",
  },
  {
    href: "/gst-invoice",
    title: "GST Invoice",
    description: "Create professional GST invoices with automatic tax calculation.",
    icon: "Receipt",
    navLabel: "GST Invoice",
    i18n: "gstInvoice",
  },
  {
    href: "/ai-summary",
    title: "AI Summary",
    description: "Generate English and Hindi summaries of any PDF in seconds.",
    icon: "Sparkles",
    navLabel: "AI Summary",
    i18n: "aiSummary",
  },
] as const;

export const ADVANCED_TOOLS = [
  {
    href: "/pdf-to-ppt",
    title: "PDF to PPT",
    description: "Turn every PDF page into a PowerPoint slide.",
    icon: "Presentation",
    navLabel: "PDF to PPT",
    i18n: "pdfToPpt",
  },
  {
    href: "/mask-document",
    title: "Mask Document",
    description: "Permanently hide Aadhaar, PAN, and other sensitive details.",
    icon: "ShieldOff",
    navLabel: "Mask Document",
    i18n: "maskDocument",
  },
  {
    href: "/compress-pdf",
    title: "Compress PDF",
    description: "Reduce PDF size with low, medium, or high compression.",
    icon: "Minimize2",
    navLabel: "Compress PDF",
    i18n: "compressPdf",
  },
  {
    href: "/pdf-to-image",
    title: "PDF to Image",
    description: "Export every PDF page as PNG, JPG, or WEBP.",
    icon: "ImageDown",
    navLabel: "PDF to Image",
    i18n: "pdfToImage",
  },
  {
    href: "/image-to-pdf",
    title: "Image to PDF",
    description: "Advanced image to PDF with page size, margins, and quality.",
    icon: "FileImage",
    navLabel: "Image to PDF",
    i18n: "imageToPdf",
  },
] as const;

export const SMART_TOOLS = [
  {
    href: "/clean-pdf",
    title: "Clean PDF",
    description: "Straighten, crop, and clean document photos into a sharp PDF.",
    icon: "WandSparkles",
    navLabel: "Clean PDF",
    i18n: "cleanPdf",
  },
  {
    href: "/pdf-editor",
    title: "PDF Editor",
    description: "Edit text, add images, delete content, and annotate PDFs directly in your browser.",
    icon: "FileEdit",
    navLabel: "PDF Editor",
    i18n: "pdfEditor",
  },
  {
    href: "/screenshot-editor",
    title: "Screenshot Editor",
    description: "Edit screenshot text, add annotations, modify content, and export as PDF.",
    icon: "ScanText",
    navLabel: "Screenshot Editor",
    i18n: "screenshotEditor",
  },
  {
    href: "/pdf-to-excel",
    title: "PDF to Excel",
    description: "Pull tables from invoices and reports into a spreadsheet.",
    icon: "Table",
    navLabel: "PDF to Excel",
    i18n: "pdfToExcel",
  },
] as const;

export const BUSINESS_TOOLS = [
  {
    href: "/bulk-whatsapp",
    title: "Bulk WhatsApp",
    description: "Send PDFs to customers with the official WhatsApp Cloud API.",
    icon: "MessageCircle",
    navLabel: "Bulk WhatsApp",
    i18n: "bulkWhatsapp",
  },
] as const;

export const TOOLS = [...CORE_TOOLS, ...ADVANCED_TOOLS, ...SMART_TOOLS, ...BUSINESS_TOOLS];

export const ALL_NAV_LINKS = [
  { href: "/", label: "Home", i18n: "nav.home" },
  ...CORE_TOOLS.map((tool) => ({ href: tool.href, label: tool.navLabel, i18n: `tools.${tool.i18n}.nav` })),
  ...ADVANCED_TOOLS.map((tool) => ({ href: tool.href, label: tool.navLabel, i18n: `tools.${tool.i18n}.nav` })),
  ...SMART_TOOLS.map((tool) => ({ href: tool.href, label: tool.navLabel, i18n: `tools.${tool.i18n}.nav` })),
  ...BUSINESS_TOOLS.map((tool) => ({ href: tool.href, label: tool.navLabel, i18n: `tools.${tool.i18n}.nav` })),
];
