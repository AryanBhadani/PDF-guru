import assert from "node:assert";
import { PDFDocument } from "pdf-lib";
import {
  detectFileSignature,
  sanitizePdfBytes,
  parseImageDimensionsFromBytes,
} from "../lib/file-type.ts";

console.log("Starting test suite for file type detection and PDF buffer handling...\n");

// Helper to create synthetic JPEG bytes
function createJpegBytes(marker = 0xe0, width = 640, height = 480) {
  // SOI (FF D8), APP0 or APP1 (FF marker len len ...), SOF0 (FF C0 00 11 08 h h w w ...)
  const bytes = new Uint8Array(128);
  bytes[0] = 0xff;
  bytes[1] = 0xd8;
  bytes[2] = 0xff;
  bytes[3] = marker;
  bytes[4] = 0x00;
  bytes[5] = 0x10; // APP segment length = 16
  // Put SOF0 marker at offset 24
  bytes[24] = 0xff;
  bytes[25] = 0xc0; // SOF0
  bytes[26] = 0x00;
  bytes[27] = 0x11; // length
  bytes[28] = 0x08; // precision
  bytes[29] = (height >> 8) & 0xff;
  bytes[30] = height & 0xff;
  bytes[31] = (width >> 8) & 0xff;
  bytes[32] = width & 0xff;
  return bytes;
}

// Helper to create synthetic PNG bytes
function createPngBytes(width = 800, height = 600) {
  const bytes = new Uint8Array(32);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]); // PNG header
  // IHDR length: 13
  bytes[8] = 0x00;
  bytes[9] = 0x00;
  bytes[10] = 0x00;
  bytes[11] = 0x0d;
  // IHDR chunk type
  bytes[12] = 0x49;
  bytes[13] = 0x48;
  bytes[14] = 0x44;
  bytes[15] = 0x52;
  // Width (big endian)
  bytes[16] = (width >> 24) & 0xff;
  bytes[17] = (width >> 16) & 0xff;
  bytes[18] = (width >> 8) & 0xff;
  bytes[19] = width & 0xff;
  // Height (big endian)
  bytes[20] = (height >> 24) & 0xff;
  bytes[21] = (height >> 16) & 0xff;
  bytes[22] = (height >> 8) & 0xff;
  bytes[23] = height & 0xff;
  return bytes;
}

// Helper to create synthetic WEBP bytes
function createWebpBytes(width = 1024, height = 768) {
  const bytes = new Uint8Array(36);
  // RIFF
  bytes.set([0x52, 0x49, 0x46, 0x46], 0);
  // file length
  bytes[4] = 28;
  // WEBP
  bytes.set([0x57, 0x45, 0x42, 0x50], 8);
  // VP8X
  bytes.set([0x56, 0x50, 0x38, 0x58], 12);
  // VP8X chunk size = 10
  bytes[16] = 10;
  // canvas width minus 1 (24-bit little endian at offset 24)
  const wMinus1 = width - 1;
  bytes[24] = wMinus1 & 0xff;
  bytes[25] = (wMinus1 >> 8) & 0xff;
  bytes[26] = (wMinus1 >> 16) & 0xff;
  // canvas height minus 1 (24-bit little endian at offset 27)
  const hMinus1 = height - 1;
  bytes[27] = hMinus1 & 0xff;
  bytes[28] = (hMinus1 >> 8) & 0xff;
  bytes[29] = (hMinus1 >> 16) & 0xff;
  return bytes;
}

// Helper to create synthetic HEIC bytes
function createHeicBytes(brand = "heic") {
  const bytes = new Uint8Array(32);
  bytes[0] = 0x00;
  bytes[1] = 0x00;
  bytes[2] = 0x00;
  bytes[3] = 0x18; // length = 24
  bytes.set([0x66, 0x74, 0x79, 0x70], 4); // ftyp
  for (let i = 0; i < 4; i++) {
    bytes[8 + i] = brand.charCodeAt(i);
  }
  return bytes;
}

async function runTests() {
  let passed = 0;

  // Test 1: Android Camera JPG (EXIF marker 0xE1)
  {
    const cameraJpg = createJpegBytes(0xe1, 4032, 3024);
    const sig = detectFileSignature(cameraJpg);
    assert.strictEqual(sig.kind, "jpeg");
    assert.strictEqual(sig.mime, "image/jpeg");
    const dims = parseImageDimensionsFromBytes(cameraJpg);
    assert.strictEqual(dims?.width, 4032);
    assert.strictEqual(dims?.height, 3024);
    console.log("✓ Test 1 Passed: Android camera JPG detected with dimensions 4032x3024");
    passed++;
  }

  // Test 2: Android Gallery JPG with leading BOM/whitespace
  {
    const rawJpg = createJpegBytes(0xe0, 1920, 1080);
    const withBom = new Uint8Array(rawJpg.length + 3);
    withBom[0] = 0xef;
    withBom[1] = 0xbb;
    withBom[2] = 0xbf;
    withBom.set(rawJpg, 3);
    const sig = detectFileSignature(withBom);
    assert.strictEqual(sig.kind, "jpeg");
    assert.strictEqual(sig.mime, "image/jpeg");
    assert.strictEqual(sig.headerOffset, 3);
    console.log("✓ Test 2 Passed: Android gallery JPG with BOM detected at offset 3");
    passed++;
  }

  // Test 3: PNG format
  {
    const png = createPngBytes(1200, 900);
    const sig = detectFileSignature(png);
    assert.strictEqual(sig.kind, "png");
    assert.strictEqual(sig.mime, "image/png");
    const dims = parseImageDimensionsFromBytes(png);
    assert.strictEqual(dims?.width, 1200);
    assert.strictEqual(dims?.height, 900);
    console.log("✓ Test 3 Passed: PNG format detected with dimensions 1200x900");
    passed++;
  }

  // Test 4: WEBP format
  {
    const webp = createWebpBytes(1024, 768);
    const sig = detectFileSignature(webp);
    assert.strictEqual(sig.kind, "webp");
    assert.strictEqual(sig.mime, "image/webp");
    const dims = parseImageDimensionsFromBytes(webp);
    assert.strictEqual(dims?.width, 1024);
    assert.strictEqual(dims?.height, 768);
    console.log("✓ Test 4 Passed: WEBP format detected with dimensions 1024x768");
    passed++;
  }

  // Test 5: HEIC / HEIF format
  {
    const heic = createHeicBytes("heic");
    const sig = detectFileSignature(heic);
    assert.strictEqual(sig.kind, "heic");
    assert.strictEqual(sig.mime, "image/heic");

    const mif1 = createHeicBytes("mif1");
    const sigMif1 = detectFileSignature(mif1);
    assert.strictEqual(sigMif1.kind, "heic");
    console.log("✓ Test 5 Passed: HEIC and MIF1 (HEIF) signatures detected");
    passed++;
  }

  // Test 6: Normal PDF
  {
    const doc = await PDFDocument.create();
    doc.addPage([600, 400]);
    const pdfBytes = await doc.save();
    const sig = detectFileSignature(pdfBytes);
    assert.strictEqual(sig.kind, "pdf");
    assert.strictEqual(sig.mime, "application/pdf");
    assert.strictEqual(sig.headerOffset, 0);

    const reloaded = await PDFDocument.load(sanitizePdfBytes(pdfBytes), { ignoreEncryption: true });
    assert.strictEqual(reloaded.getPageCount(), 1);
    console.log("✓ Test 6 Passed: Normal PDF verified and loaded");
    passed++;
  }

  // Test 7: Multi-page PDF
  {
    const doc = await PDFDocument.create();
    doc.addPage([595, 842]);
    doc.addPage([595, 842]);
    doc.addPage([595, 842]);
    const pdfBytes = await doc.save();

    const sanitized = sanitizePdfBytes(pdfBytes);
    const reloaded = await PDFDocument.load(sanitized, { ignoreEncryption: true });
    assert.strictEqual(reloaded.getPageCount(), 3);
    console.log("✓ Test 7 Passed: Multi-page (3 pages) PDF verified and loaded");
    passed++;
  }

  // Test 8: PDF with leading UTF-8 BOM (simulating bad email/server download)
  {
    const doc = await PDFDocument.create();
    doc.addPage([600, 400]);
    const cleanPdf = await doc.save();

    // Prepend UTF-8 BOM
    const withBom = new Uint8Array(cleanPdf.length + 3);
    withBom[0] = 0xef;
    withBom[1] = 0xbb;
    withBom[2] = 0xbf;
    withBom.set(cleanPdf, 3);

    const sig = detectFileSignature(withBom);
    assert.strictEqual(sig.kind, "pdf");
    assert.strictEqual(sig.headerOffset, 3);

    const sanitized = sanitizePdfBytes(withBom);
    assert.strictEqual(sanitized[0], 0x25); // '%'
    assert.strictEqual(sanitized[1], 0x50); // 'P'
    assert.strictEqual(sanitized[2], 0x44); // 'D'
    assert.strictEqual(sanitized[3], 0x46); // 'F'

    const reloaded = await PDFDocument.load(sanitized, { ignoreEncryption: true });
    assert.strictEqual(reloaded.getPageCount(), 1);
    console.log("✓ Test 8 Passed: PDF with leading BOM sanitized and loaded successfully without header error");
    passed++;
  }

  // Test 9: PDF with leading whitespace & newlines
  {
    const doc = await PDFDocument.create();
    doc.addPage([500, 500]);
    const cleanPdf = await doc.save();

    const leadingJunk = new TextEncoder().encode("\r\n\t  \n");
    const withJunk = new Uint8Array(leadingJunk.length + cleanPdf.length);
    withJunk.set(leadingJunk, 0);
    withJunk.set(cleanPdf, leadingJunk.length);

    const sig = detectFileSignature(withJunk);
    assert.strictEqual(sig.kind, "pdf");
    assert.strictEqual(sig.headerOffset, leadingJunk.length);

    const sanitized = sanitizePdfBytes(withJunk);
    const reloaded = await PDFDocument.load(sanitized, { ignoreEncryption: true });
    assert.strictEqual(reloaded.getPageCount(), 1);
    console.log("✓ Test 9 Passed: PDF with leading whitespace sanitized and loaded successfully");
    passed++;
  }

  // Test 10: PDF generated by PDF Guru itself saved with useObjectStreams: false
  {
    const doc = await PDFDocument.create();
    const page = doc.addPage([400, 600]);
    page.drawText("PDF Guru Generated Test Document");
    const saved = await doc.save({ useObjectStreams: false });

    const sig = detectFileSignature(saved);
    assert.strictEqual(sig.kind, "pdf");

    const reloaded = await PDFDocument.load(sanitizePdfBytes(saved), { ignoreEncryption: true });
    assert.strictEqual(reloaded.getPageCount(), 1);
    console.log("✓ Test 10 Passed: PDF-Guru-generated PDF with object streams disabled verified and loaded");
    passed++;
  }

  console.log(`\n==================================`);
  console.log(`ALL ${passed}/10 TEST SUITES PASSED!`);
  console.log(`==================================\n`);
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
