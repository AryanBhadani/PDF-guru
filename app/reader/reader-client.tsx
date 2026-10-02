"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { loadPdfJsDocument } from "@/lib/pdf-render";
import { Upload } from "lucide-react";

export function ReaderClient({ fileUrl }: { fileUrl?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageNumber, setPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [scale, setScale] = useState(1.5);
  const [localFile, setLocalFile] = useState<File | null>(null);

  useEffect(() => {
    if (localFile) {
      loadPdfFromFile(localFile);
    } else if (fileUrl) {
      loadPdfFromUrl(fileUrl);
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileUrl, localFile]);

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
      
      setPdfDoc(pdf);
      setTotalPages(pdf.numPages);
      setPageNumber(1);
      
      await renderPage(1, pdf);
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
      
      setPdfDoc(pdf);
      setTotalPages(pdf.numPages);
      setPageNumber(1);
      
      await renderPage(1, pdf);
    } catch (err) {
      console.error("ReaderClient: Error loading PDF:", err);
      setError(err instanceof Error ? err.message : "Failed to load PDF");
    } finally {
      setLoading(false);
    }
  }

  async function renderPage(num: number, doc: PDFDocumentProxy | null = pdfDoc) {
    if (!doc || !canvasRef.current) return;

    try {
      const page = await doc.getPage(num);
      const viewport = page.getViewport({ scale });
      
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (!context) return;

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport }).promise;
      page.cleanup();
    } catch {
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

  async function changeScale(newScale: number) {
    if (newScale >= 0.5 && newScale <= 3 && pdfDoc) {
      setScale(newScale);
      await renderPage(pageNumber, pdfDoc);
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

  // Show file upload UI if no PDF is loaded
  if (!pdfDoc && !loading && !error) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">PDF Reader</h2>
            <p className="text-gray-600 mb-6">Upload a PDF file to view its pages</p>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Select PDF File
            </button>
            
            <button
              onClick={() => window.location.href = "/"}
              className="w-full mt-3 bg-gray-200 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium"
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
            onClick={() => {
              setError(null);
              setPdfDoc(null);
              setLocalFile(null);
            }}
            className="mr-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try Another File
          </button>
          <button
            onClick={() => window.location.href = "/"}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div className="bg-white shadow-md p-4 flex items-center justify-between flex-wrap gap-2">
        <button
          onClick={() => window.location.href = "/"}
          className="text-gray-600 hover:text-gray-900"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => changePage(-1)}
            disabled={pageNumber <= 1}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 text-sm"
          >
            Previous
          </button>
          <span className="text-sm">
            Page {pageNumber} of {totalPages}
          </span>
          <button
            onClick={() => changePage(1)}
            disabled={pageNumber >= totalPages}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 text-sm"
          >
            Next
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => changeScale(scale - 0.25)}
            disabled={scale <= 0.5}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 text-sm"
          >
            Zoom Out
          </button>
          <span className="text-sm w-12 text-center">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => changeScale(scale + 0.25)}
            disabled={scale >= 3}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 text-sm"
          >
            Zoom In
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-4 flex justify-center">
        <canvas ref={canvasRef} className="shadow-lg" />
      </div>
    </div>
  );
}
