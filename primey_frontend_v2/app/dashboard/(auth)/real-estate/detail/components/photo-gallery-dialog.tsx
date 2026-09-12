"use client";

import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious
} from "@/components/ui/carousel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import type { ListingData } from "../../types";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

type PhotoGalleryDialogProps = {
  images: ListingData["gallery"];
};

export function PhotoGalleryDialog({ images }: PhotoGalleryDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          {images.length} photos
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl p-0 border-0">
        <VisuallyHidden>
          <DialogHeader>
            <DialogTitle>Photo Gallery</DialogTitle>
            <DialogDescription>Browse all listing photos.</DialogDescription>
          </DialogHeader>
        </VisuallyHidden>

        <Carousel opts={{ align: "start" }}>
          <CarouselContent>
            {images.map((image) => (
              <CarouselItem key={image.url}>
                <div className="relative aspect-video overflow-hidden rounded-md border">
                  <img
                    src={image.url}
                    alt={image.alt}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-3" />
          <CarouselNext className="right-3" />
        </Carousel>
      </DialogContent>
    </Dialog>
  );
}
