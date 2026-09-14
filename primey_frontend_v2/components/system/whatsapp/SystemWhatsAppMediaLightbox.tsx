"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, X } from "lucide-react";

export type WhatsAppLightboxItem = {
  type: "image" | "video";
  src: string;
  label?: string;
};

export default function SystemWhatsAppMediaLightbox({
  items,
  initialIndex = 0,
  onClose,
}: {
  items: WhatsAppLightboxItem[];
  initialIndex?: number;
  onClose: () => void;
}) {
  const [index, setIndex] = React.useState(initialIndex);
  const item = items[index];

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") {
        setIndex((value) => Math.max(0, value - 1));
      }
      if (event.key === "ArrowRight") {
        setIndex((value) => Math.min(items.length - 1, value + 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [items.length, onClose]);

  if (!item || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 supports-backdrop-filter:backdrop-blur-xs"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute end-4 top-4 z-10 p-3 text-white/70 transition-colors hover:text-white"
      >
        <X className="size-5" />
        <span className="sr-only">Close</span>
      </button>

      {item.type === "video" ? (
        <video
          src={item.src}
          controls
          autoPlay
          playsInline
          className="max-h-[90vh] max-w-full rounded-xl bg-black"
        />
      ) : (
        <img
          src={item.src}
          alt={item.label || ""}
          className="max-h-[90vh] max-w-full rounded-xl object-contain"
        />
      )}

      {items.length > 1 ? (
        <>
          <button
            type="button"
            className="absolute start-4 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-background shadow disabled:cursor-default disabled:opacity-50"
            onClick={() => setIndex(Math.max(0, index - 1))}
            disabled={index === 0}
          >
            <ArrowLeft className="size-5 rtl:rotate-180" />
            <span className="sr-only">Previous</span>
          </button>

          <button
            type="button"
            className="absolute end-4 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-background shadow disabled:cursor-default disabled:opacity-50"
            onClick={() => setIndex(Math.min(items.length - 1, index + 1))}
            disabled={index === items.length - 1}
          >
            <ArrowRight className="size-5 rtl:rotate-180" />
            <span className="sr-only">Next</span>
          </button>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white/90">
            {index + 1} / {items.length}
          </div>
        </>
      ) : null}
    </div>,
    document.body,
  );
}
