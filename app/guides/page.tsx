import Link from "next/link";
import { BookOpen, ArrowRight } from "lucide-react";
import { createPageMetadata, SITE_URL } from "@/lib/metadata";
import { APP_NAME } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = createPageMetadata(
  "PDF Guides – How-To Tutorials for PDF Tools",
  "Step-by-step guides for the most common PDF tasks: how to merge PDFs, compress PDFs, and split PDFs. Free tutorials with no downloads required.",
  "/guides"
);

const guides = [
  {
    href: "/guides/how-to-merge-pdf",
    title: "How to Merge PDF Files",
    description:
      "Combine multiple PDF documents into a single file in any order. Includes troubleshooting tips and FAQs.",
    toolHref: "/merge-pdf",
    toolLabel: "Use Merge PDF",
  },
  {
    href: "/guides/how-to-compress-pdf",
    title: "How to Compress a PDF",
    description:
      "Reduce your PDF file size with low, medium, or high compression. Learn when to use each level and how to hit a target file size.",
    toolHref: "/compress-pdf",
    toolLabel: "Use Compress PDF",
  },
  {
    href: "/guides/how-to-split-pdf",
    title: "How to Split a PDF",
    description:
      "Extract page ranges or save every page as its own PDF. Includes tips for custom ranges, batch splitting, and downloading as a ZIP.",
    toolHref: "/split-pdf",
    toolLabel: "Use Split PDF",
  },
];

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: SITE_URL,
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "Guides",
      item: `${SITE_URL}/guides`,
    },
  ],
};

export default function GuidesPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <div className="mx-auto w-full max-w-4xl px-4 py-12">
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            <li>
              <Link href="/" className="hover:text-foreground transition-colors">
                Home
              </Link>
            </li>
            <li className="flex items-center gap-1">
              <span aria-hidden="true" className="select-none">›</span>
              <span className="text-foreground font-medium" aria-current="page">Guides</span>
            </li>
          </ol>
        </nav>

        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400">
              <BookOpen className="h-5 w-5" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">PDF Guides</h1>
          </div>
          <p className="text-muted-foreground max-w-2xl">
            Step-by-step tutorials for the most common PDF tasks. All guides use {APP_NAME}&apos;s
            free browser-based tools — no downloads, no sign-up required.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-1">
          {guides.map((guide) => (
            <Card
              key={guide.href}
              className="group border-border hover:border-cyan-500/50 transition-colors"
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">
                  <Link
                    href={guide.href}
                    className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                  >
                    {guide.title}
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">{guide.description}</p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href={guide.href}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-cyan-600 dark:text-cyan-400 hover:underline"
                  >
                    Read guide <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <Link
                    href={guide.toolHref}
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {guide.toolLabel} →
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
