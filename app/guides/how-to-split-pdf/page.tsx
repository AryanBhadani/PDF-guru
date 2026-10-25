import Link from "next/link";
import { createPageMetadata, SITE_URL } from "@/lib/metadata";

export const metadata = createPageMetadata(
  "How to Split a PDF – Extract Pages Guide",
  "Learn how to split a PDF into separate files by page range or save every page individually. Free browser-based tool from PDF Guru — no uploads required.",
  "/guides/how-to-split-pdf"
);

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Guides", item: `${SITE_URL}/guides` },
    { "@type": "ListItem", position: 3, name: "How to Split a PDF", item: `${SITE_URL}/guides/how-to-split-pdf` },
  ],
};

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to Split a PDF",
  description: "Extract specific page ranges from a PDF or save every page as its own file using PDF Guru's free browser-based split tool.",
  url: `${SITE_URL}/guides/how-to-split-pdf`,
  step: [
    { "@type": "HowToStep", position: 1, name: "Open the Split PDF tool", text: "Navigate to the Split PDF page on PDF Guru.", url: `${SITE_URL}/split-pdf` },
    { "@type": "HowToStep", position: 2, name: "Upload your PDF", text: "Click the upload area or drag and drop your PDF. The tool reads the page count and pre-fills the range field." },
    { "@type": "HowToStep", position: 3, name: "Enter page ranges or split all", text: "Type page ranges in the format '1-3,5,7-9' to extract specific pages. Or click Split All Pages to extract every page as a separate PDF." },
    { "@type": "HowToStep", position: 4, name: "Download the result", text: "A single range downloads as a PDF. Multiple ranges download as a ZIP archive containing all extracted PDFs." },
  ],
};

const RANGE_EXAMPLES = [
  { input: "1-3", desc: "Pages 1 through 3 as a single PDF" },
  { input: "5", desc: "Only page 5 as a single PDF" },
  { input: "1-3,5,7-9", desc: "Three separate PDFs: pages 1–3, page 5, pages 7–9" },
  { input: "2-2", desc: "Only page 2" },
];

const STEPS = [
  { n: 1, title: "Open the Split PDF tool", text: "Go to PDF Guru › Split PDF. No account or installation required.", link: { href: "/split-pdf", label: "Open Split PDF →" } },
  { n: 2, title: "Upload your PDF", text: "Click the upload area or drag and drop your PDF. The tool automatically reads the page count and pre-fills the range field with the full document range (e.g., 1-12 for a 12-page PDF)." },
  { n: 3, title: "Choose your splitting method", text: "You have two options: (A) Enter custom page ranges in the text field to extract specific pages, or (B) click Split All Pages to extract every page into its own separate PDF file." },
  { n: 4, title: "Enter page ranges (if using custom ranges)", text: 'Type your ranges in the format shown in the table above. For example, enter "1-5,8,10-12" to extract three groups of pages. Separate multiple ranges with commas.' },
  { n: 5, title: "Click Split by Range or Split All Pages", text: "For custom ranges, click Split by Range. For individual pages, click Split All Pages. The tool processes your PDF in your browser using pdf-lib." },
  { n: 6, title: "Download your files", text: "If only one range was extracted, a single PDF downloads automatically. If multiple ranges or pages were extracted, a ZIP file containing all PDFs downloads. Extract the ZIP to access individual files." },
];

const TIPS = [
  { label: "Know your page count first", text: "The tool displays the total page count after upload. Use this to build accurate ranges — entering a page number beyond the total will cause an error." },
  { label: "Split All Pages works well for archiving", text: "If you need each page of a report or book individually, Split All Pages creates a clean, numbered set of PDFs inside a ZIP." },
  { label: "Page numbering starts at 1", text: "Page ranges use 1-based numbering — page 1 is the first page, matching what a PDF viewer shows." },
  { label: "ZIP files need extracting", text: 'On Windows, right-click the ZIP and choose "Extract All." On macOS, double-click the ZIP. On mobile, use a file manager app that supports ZIP extraction.' },
];

const TROUBLESHOOTING = [
  { problem: "I get an error about an invalid range", solution: 'Check your range format. Ensure ranges use hyphens (1-3), commas separate multiple ranges (1-3,5), no spaces are included, and no page number exceeds the total page count.' },
  { problem: "Only one PDF downloaded instead of a ZIP", solution: "This is expected. When only one range is specified, a single PDF downloads directly. Specify multiple ranges (e.g., 1-3,4-6) to receive a ZIP with multiple files." },
  { problem: "The extracted pages are in the wrong order", solution: "PDF Guru extracts pages exactly as you specify. Always specify ranges in ascending order (e.g., 1-3, not 3-1)." },
  { problem: "My browser is blocking the download", solution: "Some browsers block automatic downloads of ZIP files. Look for a download permission notification in the address bar and allow it, or try Chrome or Firefox." },
  { problem: "The Split All Pages download is very slow", solution: "Splitting a large PDF into many pages creates a ZIP of all individual PDFs. This is memory-intensive. Try splitting into smaller batches using custom ranges (e.g., 1-25, then 26-50)." },
];

const FAQS = [
  { q: "Can I extract a single page from a PDF?", a: 'Yes. Enter a single page number in the range field (e.g., "5") and click Split by Range. A single-page PDF will download directly.' },
  { q: "Are my files uploaded to a server when splitting?", a: "No. Splitting is entirely browser-based using pdf-lib. Your PDF never leaves your device." },
  { q: "What happens to bookmarks and hyperlinks when splitting?", a: "Bookmarks and internal links that reference pages not included in the extracted range will be broken in the output. External hyperlinks to websites are preserved." },
  { q: "Can I split a password-protected PDF?", a: "The tool cannot split password-protected PDFs. Remove the password protection before uploading." },
  { q: "What is the maximum number of pages I can split into?", a: "There is no hard page limit. However, splitting a very large PDF (200+ pages with Split All Pages) will consume significant browser memory. Use custom ranges to process large documents in batches." },
];

export default function HowToSplitPdfPage() {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          <li><Link href="/" className="hover:text-foreground transition-colors">Home</Link></li>
          <li className="flex items-center gap-1"><span aria-hidden="true" className="select-none">›</span>
            <Link href="/guides" className="hover:text-foreground transition-colors">Guides</Link></li>
          <li className="flex items-center gap-1"><span aria-hidden="true" className="select-none">›</span>
            <span className="text-foreground font-medium" aria-current="page">How to Split PDF</span></li>
        </ol>
      </nav>

      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-3">How to Split a PDF</h1>
        <p className="text-muted-foreground text-lg leading-relaxed">
          Splitting a PDF lets you extract specific pages or break a document into individual files.
          PDF Guru&apos;s Split PDF tool supports custom page ranges and single-page extraction —
          all processed locally in your browser.
        </p>
        <div className="mt-4">
          <Link href="/split-pdf" className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white px-5 py-2.5 text-sm font-semibold transition-colors">
            Open Split PDF Tool →
          </Link>
        </div>
      </header>

      <div className="space-y-10">
        {/* Range syntax */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Understanding Page Range Syntax</h2>
          <p className="text-muted-foreground text-sm mb-4">
            PDF Guru uses a flexible range format to describe which pages to extract. You can combine multiple ranges in a single operation:
          </p>
          <div className="rounded-lg border border-border overflow-hidden text-sm">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">Input</th>
                  <th className="px-4 py-2 text-left font-semibold">What it extracts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-muted-foreground">
                {RANGE_EXAMPLES.map(({ input, desc }) => (
                  <tr key={input}>
                    <td className="px-4 py-2 font-mono text-xs">{input}</td>
                    <td className="px-4 py-2">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-muted-foreground text-xs mt-2">
            Tip: When multiple ranges are specified, each range downloads as a separate PDF file, all bundled in a ZIP archive.
          </p>
        </section>

        {/* Steps */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Step-by-Step Instructions</h2>
          <ol className="space-y-6 list-none pl-0">
            {STEPS.map(({ n, title, text, link }) => (
              <li key={n} className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 text-sm font-bold">{n}</div>
                <div>
                  <h3 className="font-semibold text-base mb-1">{title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{text}</p>
                  {link && (
                    <Link href={link.href} className="inline-block mt-1.5 text-xs font-medium text-cyan-600 dark:text-cyan-400 hover:underline">{link.label}</Link>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Tips */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Tips for Best Results</h2>
          <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
            {TIPS.map(({ label, text }) => (
              <li key={label}><strong className="text-foreground">{label}:</strong> {text}</li>
            ))}
            <li>
              <strong className="text-foreground">Combine with Merge:</strong>{" "}
              Extract specific pages with Split, then use{" "}
              <Link href="/merge-pdf" className="text-cyan-600 dark:text-cyan-400 hover:underline">Merge PDF</Link>
              {" "}to combine them with other documents.
            </li>
          </ul>
        </section>

        {/* Troubleshooting */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Troubleshooting</h2>
          <div className="space-y-4">
            {TROUBLESHOOTING.map(({ problem, solution }) => (
              <div key={problem} className="rounded-lg border border-border p-4">
                <p className="font-medium text-sm mb-1">Problem: {problem}</p>
                <p className="text-sm text-muted-foreground">Solution: {solution}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
          <div className="space-y-5">
            {FAQS.map(({ q, a }) => (
              <div key={q}>
                <h3 className="font-semibold text-base mb-1">{q}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
              </div>
            ))}
            <div>
              <h3 className="font-semibold text-base mb-1">How do I reassemble split pages into a new PDF?</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Use{" "}
                <Link href="/merge-pdf" className="text-cyan-600 dark:text-cyan-400 hover:underline">PDF Guru&apos;s Merge PDF tool</Link>
                {" "}to upload the extracted PDFs and combine them in any order into a new document.
              </p>
            </div>
          </div>
        </section>

        {/* Related */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Related Guides</h2>
          <ul className="space-y-2 text-sm">
            <li><Link href="/guides/how-to-merge-pdf" className="text-cyan-600 dark:text-cyan-400 hover:underline">How to Merge PDF Files →</Link></li>
            <li><Link href="/guides/how-to-compress-pdf" className="text-cyan-600 dark:text-cyan-400 hover:underline">How to Compress a PDF →</Link></li>
            <li><Link href="/guides" className="text-cyan-600 dark:text-cyan-400 hover:underline">All PDF Guides →</Link></li>
          </ul>
        </section>

        <div className="rounded-xl border border-cyan-500/30 bg-cyan-50 dark:bg-cyan-950/30 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-sm">Ready to split your PDF?</p>
            <p className="text-sm text-muted-foreground mt-0.5">Free, instant, and 100% private.</p>
          </div>
          <Link href="/split-pdf" className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white px-5 py-2.5 text-sm font-semibold transition-colors">
            Open Split PDF →
          </Link>
        </div>
      </div>
    </article>
  );
}
