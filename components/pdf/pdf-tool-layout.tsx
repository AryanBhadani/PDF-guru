import type { ReactNode } from "react";

type PdfToolLayoutProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function PdfToolLayout({ title, description, children }: PdfToolLayoutProps) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
      <div className="mb-8 max-w-2xl animate-fade-in">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}
