"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { LanguageProvider } from "@/components/i18n/language-provider";
import { SaveFileDialog } from "@/components/file-save/save-file-dialog";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <LanguageProvider>
        {children}
        <SaveFileDialog />
        <Toaster richColors position="top-right" closeButton />
      </LanguageProvider>
    </ThemeProvider>
  );
}
