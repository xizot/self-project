'use client';

import * as React from 'react';
import { X, Image as ImageIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './button';
import { AspectRatio } from './aspect-ratio';

export type ImagePreviewItem = string | File | { url: string; alt?: string; id?: string };

export type ImagePreviewProps = {
  images: ImagePreviewItem[];
  columns?: 1 | 2 | 3 | 4 | 5 | 6;
  onRemove?: (index: number) => void;
  onClick?: (index: number, image: ImagePreviewItem) => void;
  showRemove?: boolean;
  className?: string;
  itemClassName?: string;
  emptyMessage?: string;
  loading?: boolean;
};

function ImagePreview({
  images,
  columns = 3,
  onRemove,
  onClick,
  showRemove = true,
  className,
  itemClassName,
  emptyMessage = 'No images',
  loading = false,
}: ImagePreviewProps) {
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

  // Cleanup object URLs on unmount
  React.useEffect(() => {
    return () => {
      images.forEach((image) => {
        if (image instanceof File) {
          const url = URL.createObjectURL(image);
          URL.revokeObjectURL(url);
        }
      });
    };
  }, []);

  if (loading) {
    return (
      <div
        className={cn('flex items-center justify-center p-8', className)}
        data-slot="image-preview-loading"
      >
        <div className="text-muted-foreground">Loading images...</div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div
        className={cn('flex flex-col items-center justify-center p-8 text-center', className)}
        data-slot="image-preview-empty"
      >
        <ImageIcon className="h-12 w-12 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
  };

  return (
    <div
      className={cn('grid gap-4', gridCols[columns], className)}
      data-slot="image-preview"
    >
      {images.map((image, index) => {
        const imageUrl = getImageUrl(image);
        const imageAlt = getImageAlt(image, index);

        return (
          <div
            key={index}
            className={cn('group relative', itemClassName)}
            data-slot="image-preview-item"
          >
            <AspectRatio ratio={1} className="overflow-hidden rounded-lg bg-muted">
              <img
                src={imageUrl}
                alt={imageAlt}
                className="h-full w-full object-cover transition-transform group-hover:scale-105 cursor-pointer"
                onClick={() => onClick?.(index, image)}
                data-slot="image-preview-image"
              />
              {showRemove && onRemove && (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(index);
                  }}
                  data-slot="image-preview-remove"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Remove image</span>
                </Button>
              )}
            </AspectRatio>
          </div>
        );
      })}
    </div>
  );
}

export { ImagePreview };

