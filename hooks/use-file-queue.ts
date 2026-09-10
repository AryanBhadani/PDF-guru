"use client";

import { useCallback, useState } from "react";
import { createId } from "@/lib/utils";

export type QueuedFile<T extends { id: string }> = T;

export function useFileQueue<T extends { id: string }>() {
  const [items, setItems] = useState<T[]>([]);

  const setAll = useCallback((next: T[]) => setItems(next), []);

  const add = useCallback((next: T[]) => {
    setItems((current) => [...current, ...next]);
  }, []);

  const remove = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const move = useCallback((id: string, direction: -1 | 1) => {
    setItems((current) => {
      const index = current.findIndex((item) => item.id === id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const copy = [...current];
      const [item] = copy.splice(index, 1);
      copy.splice(nextIndex, 0, item);
      return copy;
    });
  }, []);

  return { items, setAll, add, remove, clear, move };
}

export { createId };
