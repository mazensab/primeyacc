"use client";

import { useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight, PlayIcon, X } from "lucide-react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type GalleryMediaItem = {
  type: "image" | "video";
  src: string;
  poster?: string;
};

export function MediaGalleryDialog({
  items,
  index,
  onIndexChange
}: {
  items: GalleryMediaItem[];
  index: number | null;
  onIndexChange: (index: number | null) => void;
}) {
  const open = index !== null;
  const count = items.length;
  const current = index ?? 0;
  const item = items[current];

  const goTo = useCallback(
    (next: number) => {
      onIndexChange(((next % count) + count) % count);
    },
    [count, onIndexChange]
  );

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") goTo(current + 1);
      if (event.key === "ArrowLeft") goTo(current - 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, current, goTo]);

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onIndexChange(null)}>
      <DialogContent
        showCloseButton={false}
        className="h-dvh max-h-none w-screen max-w-none gap-0 rounded-none border-none bg-black/95 p-0 shadow-none sm:max-w-none">
        <DialogTitle className="sr-only">Media gallery</DialogTitle>
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex flex-none items-center justify-between p-4 text-white">
            <span className="text-sm tabular-nums">
              {count > 1 ? `${current + 1} / ${count}` : ""}
            </span>
            <button
              type="button"
              onClick={() => onIndexChange(null)}
              aria-label="Close gallery"
              className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20">
              <X className="size-5" />
            </button>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-4">
            {item?.type === "video" ? (
              <video
                key={item.src}
                src={item.src}
                poster={item.poster}
                controls
                autoPlay
                className="h-full w-full object-contain"
              />
            ) : (
              <img
                src={item?.src}
                alt={`Media ${current + 1} of ${count}`}
                className="max-h-full max-w-full object-contain"
              />
            )}
            {count > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => goTo(current - 1)}
                  aria-label="Previous media"
                  className="absolute start-4 flex size-10 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20">
                  <ChevronLeft className="size-6" />
                </button>
                <button
                  type="button"
                  onClick={() => goTo(current + 1)}
                  aria-label="Next media"
                  className="absolute end-4 flex size-10 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20">
                  <ChevronRight className="size-6" />
                </button>
              </>
            )}
          </div>
          {count > 1 && (
            <div className="flex flex-none justify-center gap-2 overflow-x-auto p-4">
              {items.map((thumb, key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => goTo(key)}
                  aria-label={`Go to media ${key + 1}`}
                  className={cn(
                    "relative size-12 flex-none cursor-pointer overflow-hidden rounded-md border-2 transition-opacity",
                    key === current
                      ? "border-white"
                      : "border-transparent opacity-60 hover:opacity-100"
                  )}>
                  {thumb.type === "video" ? (
                    <>
                      {thumb.poster ? (
                        <img src={thumb.poster} alt="" className="size-full object-cover" />
                      ) : (
                        <span className="block size-full bg-white/10" />
                      )}
                      <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <PlayIcon className="size-4 text-white" />
                      </span>
                    </>
                  ) : (
                    <img src={thumb.src} alt="" className="size-full object-cover" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
