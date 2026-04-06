"use client";

import { useCallback, useRef, useState, type DragEvent } from "react";

type DropZoneProps = {
  onFile: (file: File) => void;
  accept: string;
  disabled?: boolean;
};

export default function DropZone({
  onFile,
  accept,
  disabled = false,
}: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragDepthRef = useRef(0);

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current += 1;
    if (e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current -= 1;
    if (dragDepthRef.current <= 0) {
      dragDepthRef.current = 0;
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragDepthRef.current = 0;

      if (disabled) return;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        onFile(files[0]);
      }
    },
    [onFile, disabled],
  );

  const handleClick = useCallback(() => {
    if (disabled) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files?.[0]) {
        onFile(target.files[0]);
      }
    };
    input.click();
  }, [onFile, accept, disabled]);

  return (
    <div
      onClick={handleClick}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition ${
        disabled
          ? "border-zinc-800 bg-zinc-900/30 opacity-50 cursor-not-allowed"
          : isDragging
            ? "border-amber-500 bg-amber-500/10"
            : "border-zinc-700 bg-zinc-950 hover:border-zinc-600 hover:bg-zinc-900/50"
      }`}
    >
      <div className="pointer-events-none">
        <svg
          className="mx-auto h-10 w-10 text-zinc-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        <p className="mt-2 text-sm text-zinc-400">
          {isDragging ? "Pustit pro nahrání" : "Přetáhni soubor nebo klikni pro výběr"}
        </p>
        <p className="mt-1 text-xs text-zinc-600">
          .txt, .pdf, JPEG, PNG, WebP, GIF
        </p>
      </div>
    </div>
  );
}