import { Loader2 } from "lucide-react";

export function LoadingState({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-4 text-sm">
      <Loader2 className="h-4 w-4 animate-spin text-primary" />
      <span>{message}</span>
    </div>
  );
}
