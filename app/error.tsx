"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold">PDF Guru hit a snag</h1>
      <p className="text-muted-foreground">Something went wrong while loading this page. Try again.</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
