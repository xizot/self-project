'use client';

import * as React from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './dialog';
import type { ImagePreviewItem } from './image-preview';

export type ImageLightboxProps = {
  images: ImagePreviewItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialIndex?: number;
  showNavigation?: boolean;
  showCounter?: boolean;
  showZoom?: boolean;
  className?: string;
};

function ImageLightbox({
  images,
  open,
  onOpenChange,
  initialIndex = 0,
  showNavigation = true,
  showCounter = true,
  showZoom = true,
  className,
}: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = React.useState(initialIndex);
  const [zoom, setZoom] = React.useState(1);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });
  const imageRef = React.useRef<HTMLImageElement>(null);

  // Reset zoom and position when image changes
  React.useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
      setZoom(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [open, initialIndex]);

  // Update current index when initialIndex changes
  React.useEffect(() => {
    if (open && initialIndex >= 0 && initialIndex < images.length) {
      setCurrentIndex(initialIndex);
    }
  }, [initialIndex, images.length, open]);

  const getImageUrl = (image: ImagePreviewItem): string => {
    if (typeof image === 'string') {
      return image;
    }
    if (image instanceof File) {
      return URL.createObjectURL(image);
    }
    return image.url;
  };

  const getImageAlt = (image: ImagePreviewItem, index: number): string => {
    if (typeof image === 'string') {
      return `Image ${index + 1}`;
    }
    if (image instanceof File) {
      return image.name;
    }
    return image.alt || `Image ${index + 1}`;
  };

  const currentImage = images[currentIndex];
  const imageUrl = currentImage ? getImageUrl(currentImage) : '';
  const imageAlt = currentImage ? getImageAlt(currentImage, currentIndex) : '';

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setZoom(1);
      setPosition({ x: 0, y: 0 });
    }
  };

  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setZoom(1);
      setPosition({ x: 0, y: 0 });
    }
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => {
      const newZoom = Math.max(prev - 0.25, 1);
      if (newZoom === 1) {
        setPosition({ x: 0, y: 0 });
      }
      return newZoom;
    });
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (showZoom) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom((prev) => {
        const newZoom = Math.max(1, Math.min(3, prev + delta));
        if (newZoom === 1) {
          setPosition({ x: 0, y: 0 });
        }
        return newZoom;
      });
    }
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          handlePrevious();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleNext();
          break;
        case 'Escape':
          e.preventDefault();
          onOpenChange(false);
          break;
        case '+':
        case '=':
          if (showZoom) {
            e.preventDefault();
            handleZoomIn();
          }
          break;
        case '-':
          if (showZoom) {
            e.preventDefault();
            handleZoomOut();
          }
          break;
        case '0':
          if (showZoom) {
            e.preventDefault();
            handleResetZoom();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, currentIndex, images.length, showZoom]);

  if (images.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn('max-w-[95vw] max-h-[95vh] p-0', className)}
        showCloseButton={false}
        data-slot="image-lightbox"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Image Viewer</DialogTitle>
          <DialogDescription>View full-size image</DialogDescription>
        </DialogHeader>

        <div className="relative flex items-center justify-center w-full h-full min-h-[50vh] bg-black/90">
          {/* Close Button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
            onClick={() => onOpenChange(false)}
            data-slot="image-lightbox-close"
          >
            <X className="h-6 w-6" />
            <span className="sr-only">Close</span>
          </Button>

          {/* Zoom Controls */}
          {showZoom && (
            <div
              className="absolute top-4 left-4 z-50 flex gap-2"
              data-slot="image-lightbox-zoom"
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={handleZoomOut}
                disabled={zoom <= 1}
              >
                <ZoomOut className="h-5 w-5" />
                <span className="sr-only">Zoom out</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={handleZoomIn}
                disabled={zoom >= 3}
              >
                <ZoomIn className="h-5 w-5" />
                <span className="sr-only">Zoom in</span>
              </Button>
            </div>
          )}

          {/* Previous Button */}
          {showNavigation && currentIndex > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 h-12 w-12"
              onClick={handlePrevious}
              data-slot="image-lightbox-previous"
            >
              <ChevronLeft className="h-8 w-8" />
              <span className="sr-only">Previous image</span>
            </Button>
          )}

          {/* Next Button */}
          {showNavigation && currentIndex < images.length - 1 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 h-12 w-12"
              onClick={handleNext}
              data-slot="image-lightbox-next"
            >
              <ChevronRight className="h-8 w-8" />
              <span className="sr-only">Next image</span>
            </Button>
          )}

          {/* Image */}
          <div
            className="flex items-center justify-center w-full h-full overflow-hidden cursor-move"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            data-slot="image-lightbox-container"
          >
            <img
              ref={imageRef}
              src={imageUrl}
              alt={imageAlt}
              className="max-w-full max-h-full object-contain select-none"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                transition: isDragging ? 'none' : 'transform 0.2s',
              }}
              data-slot="image-lightbox-image"
            />
          </div>

          {/* Counter */}
          {showCounter && images.length > 1 && (
            <div
              className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 bg-black/50 text-white px-4 py-2 rounded-md text-sm"
              data-slot="image-lightbox-counter"
            >
              {currentIndex + 1} / {images.length}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { ImageLightbox };

