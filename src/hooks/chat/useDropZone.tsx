"use client";
import { useState, useCallback, useRef } from "react";

type DropZoneOptions = {
  onDrop: (files: File[]) => void;
  accept?: string[];
  maxSize?: number; // bytes
};

export function useDropZone({ onDrop, accept, maxSize }: DropZoneOptions) {
  const [dragging, setDragging] = useState(false);
  const counterRef = useRef(0);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    counterRef.current++;
    if (e.dataTransfer.types.includes("Files")) {
      setDragging(true);
    }
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    counterRef.current--;
    if (counterRef.current === 0) {
      setDragging(false);
    }
  }, []);

  const onDropHandler = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    counterRef.current = 0;
    setDragging(false);

    const files = Array.from(e.dataTransfer.files).filter((f) => {
      if (maxSize && f.size > maxSize) return false;
      if (accept && accept.length > 0) {
        return accept.some((a) => {
          if (a.startsWith(".")) return f.name.toLowerCase().endsWith(a.toLowerCase());
          if (a.endsWith("/*")) return f.type.startsWith(a.replace("/*", "/"));
          return f.type === a;
        });
      }
      return true;
    });

    if (files.length > 0) onDrop(files);
  }, [onDrop, accept, maxSize]);

  return { dragging, onDragOver, onDragEnter, onDragLeave, onDrop: onDropHandler };
}
