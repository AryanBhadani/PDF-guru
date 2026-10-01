"use client";

import { useEffect, useRef, useState } from "react";
import { loadPdfJsDocument } from "@/lib/pdf-render";

export function ReaderClient({ fileUrl }: { fileUrl?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageNumber, setPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pdfDoc, setPdfDoc] = useState<any>(null);

  useEffect(() => {
    loadPdf();
  }, [fileUrl]);

  async function loadPdf() {
    try {
      setLoading(true);
      setError(null);

      if (!fileUrl) {
        throw new Error("No PDF file specified");
      }

      // Fetch PDF from URL (works for both web URLs and Android asset loader URLs)
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error("Failed to load PDF file");
      }
      
      const blob = await response.blob();
      const pdfData = new Uint8Array(await blob.arrayBuffer());

      const pdf = await loadPdfJsDocument(pdfData);
      
      setPdfDoc(pdf);
      setTotalPages(pdf.numPages);
      setPageNumber(1);
      
      await renderPage(1, pdf);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load PDF");
    } finally {
      setLoading(false);
    }
  }

  async function renderPage(num: number, doc: any = pdfDoc) {
    if (!doc || !canvasRef.current) return;

    try {
      const page = await doc.getPage(num);
      const viewport = page.getViewport({ scale: 1.5 });
      
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (!context) return;

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport }).promise;
      page.cleanup();
    } catch (err) {
      setError("Failed to render page");
    }
  }

  async function changePage(delta: number) {
    const newPage = pageNumber + delta;
    if (newPage >= 1 && newPage <= totalPages && pdfDoc) {
      setPageNumber(newPage);
      await renderPage(newPage, pdfDoc);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading PDF...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">Error Loading PDF</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.href = "/"}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div className="bg-white shadow-md p-4 flex items-center justify-between">
        <button
          onClick={() => window.location.href = "/"}
          className="text-gray-600 hover:text-gray-900"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div className="flex items-center gap-4">
          <button
            onClick={() => changePage(-1)}
            disabled={pageNumber <= 1}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm">
            Page {pageNumber} of {totalPages}
          </span>
          <button
            onClick={() => changePage(1)}
            disabled={pageNumber >= totalPages}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
          >
            Next
          </button>
        </div>
        <div className="w-6"></div>
      </div>
      <div className="flex-1 overflow-auto p-4 flex justify-center">
        <canvas ref={canvasRef} className="shadow-lg" />
      </div>
    </div>
  );
}
