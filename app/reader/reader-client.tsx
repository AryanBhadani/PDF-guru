"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { loadPdfJsDocument } from "@/lib/pdf-render";
import { Upload, ArrowLeft } from "lucide-react";

export function ReaderClient({ fileUrl }: { fileUrl?: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(0);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());

  useEffect(() => {
    console.log("ReaderClient: useEffect triggered", { fileUrl, localFile: !!localFile });
    // Clear error state when fileUrl or localFile changes
    setError(null);
    if (localFile) {
      loadPdfFromFile(localFile);
    } else if (fileUrl) {
      loadPdfFromUrl(fileUrl);
    } else {
      console.log("ReaderClient: No file provided, showing upload UI");
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileUrl, localFile]);

  // Render all pages when pdfDoc is set and canvas refs are populated
  useEffect(() => {
    console.log("ReaderClient: Render useEffect triggered", { 
      hasPdfDoc: !!pdfDoc, 
      canvasRefsSize: canvasRefs.current.size,
      totalPages 
    });
    if (pdfDoc && canvasRefs.current.size > 0) {
      renderAllPages(pdfDoc);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfDoc, totalPages]);

  async function loadPdfFromUrl(url: string) {
    try {
      setLoading(true);
      setError(null);

      console.log("ReaderClient: Fetching PDF from URL:", url);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load PDF file (status: ${response.status})`);
      }
      
      const blob = await response.blob();
      const pdfData = new Uint8Array(await blob.arrayBuffer());
      const pdf = await loadPdfJsDocument(pdfData);
      
      console.log("ReaderClient: PDF loaded successfully, pages:", pdf.numPages);
      setPdfDoc(pdf);
      setTotalPages(pdf.numPages);
      setCurrentPage(0);
      // Rendering will be triggered by useEffect when canvas refs are ready
    } catch (err) {
      console.error("ReaderClient: Error loading PDF:", err);
      setError(err instanceof Error ? err.message : "Failed to load PDF");
    } finally {
      setLoading(false);
    }
  }

  async function loadPdfFromFile(file: File) {
    try {
      setLoading(true);
      setError(null);

      console.log("ReaderClient: Loading local PDF file:", file.name);
      const pdf = await loadPdfJsDocument(file);
      
      console.log("ReaderClient: PDF loaded successfully, pages:", pdf.numPages);
      setPdfDoc(pdf);
      setTotalPages(pdf.numPages);
      setCurrentPage(0);
      // Rendering will be triggered by useEffect when canvas refs are ready
    } catch (err) {
      console.error("ReaderClient: Error loading PDF:", err);
      setError(err instanceof Error ? err.message : "Failed to load PDF");
    } finally {
      setLoading(false);
    }
  }

  const calculateScale = useCallback(() => {
    if (!containerRef.current) return 1;
    const containerWidth = containerRef.current.clientWidth - 32; // Account for padding
    return Math.max(0.5, Math.min(3, (containerWidth / 595) * window.devicePixelRatio));
  }, []);

  async function renderPage(num: number, doc: PDFDocumentProxy) {
    const canvas = canvasRefs.current.get(num);
    if (!canvas) {
      console.warn(`ReaderClient: Canvas not found for page ${num}`);
      return;
    }

    try {
      console.log(`ReaderClient: Rendering page ${num}`);
      const page = await doc.getPage(num);
      const scale = calculateScale();
      const viewport = page.getViewport({ scale: scale / window.devicePixelRatio });
      
      console.log(`ReaderClient: Page ${num} viewport:`, viewport.width, 'x', viewport.height);
      
      const context = canvas.getContext("2d");
      if (!context) {
        console.error(`ReaderClient: Could not get 2d context for page ${num}`);
        return;
      }

      canvas.width = Math.floor(viewport.width * window.devicePixelRatio);
      canvas.height = Math.floor(viewport.height * window.devicePixelRatio);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      console.log(`ReaderClient: Canvas ${num} dimensions:`, canvas.width, 'x', canvas.height);

      context.scale(window.devicePixelRatio, window.devicePixelRatio);
      await page.render({ canvasContext: context, viewport }).promise;
      console.log(`ReaderClient: Page ${num} rendered successfully`);
      page.cleanup();
    } catch (err) {
      console.error(`ReaderClient: Failed to render page ${num}:`, err);
    }
  }

  async function renderAllPages(doc: PDFDocumentProxy) {
    console.log("ReaderClient: Starting renderAllPages for", doc.numPages, "pages");
    console.log("ReaderClient: Canvas refs available:", canvasRefs.current.size);
    
    // Wait a tick to ensure React has rendered the canvas elements
    await new Promise(resolve => setTimeout(resolve, 0));
    
    for (let num = 1; num <= doc.numPages; num++) {
      await renderPage(num, doc);
    }
  }

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setLocalFile(file);
    } else if (file) {
      setError("Please select a PDF file");
    }
  }

  function handleTryAgain() {
    setError(null);
    setPdfDoc(null);
    setLocalFile(null);
    fileInputRef.current?.click();
  }

  function handleChooseAnother() {
    setError(null);
    setPdfDoc(null);
    setLocalFile(null);
    fileInputRef.current?.click();
  }

  // Show file upload UI if no PDF is loaded and no error
  if (!pdfDoc && !loading && !error) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">PDF Reader</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Upload a PDF file to view its pages</p>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-emerald-600 text-white py-3 px-4 rounded-lg hover:bg-emerald-700 transition-colors font-medium"
            >
              Select PDF File
            </button>
            
            <button
              onClick={() => window.location.href = "/"}
              className="w-full mt-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-3 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
            >
              Back to Homepage
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading PDF...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="text-center max-w-md">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">Unable to load PDF</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Please try another file.</p>
          <button
            onClick={handleTryAgain}
            className="mr-2 px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
          >
            Try Again
          </button>
          <button
            onClick={handleChooseAnother}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Choose Another File
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col">
      <div className="bg-white dark:bg-gray-800 shadow-sm px-4 py-3 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => window.location.href = "/"}
          className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 flex items-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </button>
        
        {totalPages > 0 && (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Page {currentPage + 1} / {totalPages}
          </span>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <button
          onClick={() => fileInputRef.current?.click()}
          className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium"
        >
          Open PDF
        </button>
      </div>
      
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto bg-gray-100 dark:bg-gray-900"
        onScroll={(e) => {
          const scrollTop = e.currentTarget.scrollTop;
          const containerHeight = e.currentTarget.clientHeight;
          const pageHeight = containerHeight;
          const newPage = Math.floor(scrollTop / pageHeight);
          if (newPage !== currentPage && newPage >= 0 && newPage < totalPages) {
            setCurrentPage(newPage);
          }
        }}
      >
        <div className="max-w-4xl mx-auto py-4 px-2 sm:px-4 space-y-2">
          {pdfDoc && Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
            <div key={pageNum} className="flex justify-center">
              <canvas
                ref={(el) => {
                  if (el) {
                    canvasRefs.current.set(pageNum, el);
                  }
                }}
                className="shadow-md bg-white max-w-full"
                style={{ display: 'block' }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
