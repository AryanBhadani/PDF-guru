import Link from "next/link";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2.5 font-bold tracking-tight text-lg", className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.25)]">
        <FileText className="h-4 w-4 text-emerald-400" />
      </span>
      <span className="text-base sm:text-lg font-bold">
        <span className="text-foreground dark:text-white">PDF</span>{" "}
        <span className="text-cyan-400">Guru</span>
      </span>
    </Link>
  );
}
