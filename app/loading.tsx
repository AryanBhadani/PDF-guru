"use client";

import { Loader2 } from "lucide-react";
import { useT } from "@/components/i18n/language-provider";

export default function Loading() {
  const t = useT();
  return (
    <div className="flex min-h-[50vh] items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
      <span>{t("app.loading")}</span>
    </div>
  );
}
