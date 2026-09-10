"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MaskRect } from "@/types/masking";
import { createId } from "@/lib/utils";
import { cn } from "@/lib/utils";

type MaskCanvasProps = {
  imageUrl: string;
  pageIndex: number;
  rects: MaskRect[];
  onChange: (rects: MaskRect[]) => void;
  disabled?: boolean;
};

type Draft = { x: number; y: number; width: number; height: number };

export function MaskCanvas({ imageUrl, pageIndex, rects, onChange, disabled }: MaskCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);

  const pageRects = rects.filter((rect) => rect.pageIndex === pageIndex);

  const relativePoint = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const box = containerRef.current?.getBoundingClientRect();
    if (!box) return { x: 0, y: 0 };
    return {
      x: Math.min(1, Math.max(0, (event.clientX - box.left) / box.width)),
      y: Math.min(1, Math.max(0, (event.clientY - box.top) / box.height)),
    };
  }, []);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = relativePoint(event);
    startRef.current = point;
    setDraft({ x: point.x, y: point.y, width: 0, height: 0 });
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!startRef.current) return;
    const point = relativePoint(event);
    const x = Math.min(startRef.current.x, point.x);
    const y = Math.min(startRef.current.y, point.y);
    setDraft({
      x,
      y,
      width: Math.abs(point.x - startRef.current.x),
      height: Math.abs(point.y - startRef.current.y),
    });
  };

  const finish = () => {
    if (!draft || draft.width < 0.01 || draft.height < 0.008) {
      setDraft(null);
      startRef.current = null;
      return;
    }
    onChange([
      ...rects,
      {
        id: createId(),
        pageIndex,
        x: draft.x,
        y: draft.y,
        width: draft.width,
        height: draft.height,
      },
    ]);
    setDraft(null);
    startRef.current = null;
  };

  useEffect(() => {
    setDraft(null);
    startRef.current = null;
  }, [imageUrl, pageIndex]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative mx-auto max-w-full touch-none overflow-hidden rounded-lg border bg-muted select-none",
        disabled ? "cursor-not-allowed opacity-70" : "cursor-crosshair"
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finish}
      onPointerCancel={() => {
        setDraft(null);
        startRef.current = null;
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl} alt="Document preview" className="block h-auto w-full" draggable={false} />
      {pageRects.map((rect) => (
        <button
          key={rect.id}
          type="button"
          aria-label="Remove mask"
          disabled={disabled}
          className="absolute bg-black/90 ring-1 ring-white/40"
          style={{
            left: `${rect.x * 100}%`,
            top: `${rect.y * 100}%`,
            width: `${rect.width * 100}%`,
            height: `${rect.height * 100}%`,
          }}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onChange(rects.filter((item) => item.id !== rect.id));
          }}
        />
      ))}
      {draft && (
        <div
          className="pointer-events-none absolute bg-black/70"
          style={{
            left: `${draft.x * 100}%`,
            top: `${draft.y * 100}%`,
            width: `${draft.width * 100}%`,
            height: `${draft.height * 100}%`,
          }}
        />
      )}
    </div>
  );
}
