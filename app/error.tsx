"use client";

import { Button } from "@/components/ui/button";
import { useT } from "@/components/i18n/language-provider";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold">{t("app.errorTitle")}</h1>
      <p className="text-muted-foreground">{t("app.errorBody")}</p>
      <Button onClick={reset}>{t("common.tryAgain")}</Button>
    </div>
  );
}
