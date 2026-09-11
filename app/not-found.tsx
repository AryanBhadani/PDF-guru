"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/i18n/language-provider";

export default function NotFound() {
  const t = useT();
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold">{t("app.notFoundTitle")}</h1>
      <p className="text-muted-foreground">{t("app.notFoundBody")}</p>
      <Button asChild>
        <Link href="/">{t("common.backHome")}</Link>
      </Button>
    </div>
  );
}
