export function ProgressBar({ current, total, label }: { current: number; total: number; label?: string }) {
  const percent = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  return (
    <div className="space-y-2 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between text-sm">
        <span>{label ?? "Processing"}</span>
        <span className="text-muted-foreground">{percent}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
      </div>
      {total > 0 && (
        <p className="text-xs text-muted-foreground">
          Page {Math.min(current, total)} of {total}
        </p>
      )}
    </div>
  );
}
