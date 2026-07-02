import { useEffect, useState, useCallback, useRef, MouseEvent, WheelEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, X } from 'lucide-react';

export interface LightboxPhoto {
  id: string;
  media_url: string;
  thumbnail_url?: string | null;
  title?: string | null;
  description?: string | null;
}

interface PhotoLightboxProps {
  photos: LightboxPhoto[];
  index: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIndexChange: (index: number) => void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.5;

export default function PhotoLightbox({
  photos,
  index,
  open,
  onOpenChange,
  onIndexChange,
}: PhotoLightboxProps) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragState = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);

  const photo = photos[index];

  const reset = useCallback(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    reset();
  }, [index, open, reset]);

  const next = useCallback(() => {
    if (photos.length === 0) return;
    onIndexChange((index + 1) % photos.length);
  }, [index, photos.length, onIndexChange]);

  const prev = useCallback(() => {
    if (photos.length === 0) return;
    onIndexChange((index - 1 + photos.length) % photos.length);
  }, [index, photos.length, onIndexChange]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP));
      else if (e.key === '-') setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP));
      else if (e.key === '0') reset();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, next, prev, reset]);

  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
    setZoom((z) => {
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + delta));
      if (next === 1) setOffset({ x: 0, y: 0 });
      return next;
    });
  };

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (zoom <= 1) return;
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: offset.x,
      originY: offset.y,
    };
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!dragState.current) return;
    setOffset({
      x: dragState.current.originX + (e.clientX - dragState.current.startX),
      y: dragState.current.originY + (e.clientY - dragState.current.startY),
    });
  };

  const endDrag = () => {
    dragState.current = null;
  };

  const handleDoubleClick = () => {
    if (zoom === 1) {
      setZoom(2);
    } else {
      reset();
    }
  };

  if (!photo) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[95vw] w-[95vw] h-[95vh] p-0 bg-background/95 backdrop-blur border-none overflow-hidden [&>button]:hidden"
      >
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-3 bg-gradient-to-b from-background/80 to-transparent">
          <div className="text-sm text-foreground/90 truncate max-w-[60%]">
            {photo.title || `${index + 1} / ${photos.length}`}
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP))}
              disabled={zoom <= MIN_ZOOM}
              aria-label="Zoom out"
            >
              <ZoomOut className="h-5 w-5" />
            </Button>
            <span className="text-xs w-12 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP))}
              disabled={zoom >= MAX_ZOOM}
              aria-label="Zoom in"
            >
              <ZoomIn className="h-5 w-5" />
            </Button>
            <Button size="icon" variant="ghost" onClick={reset} aria-label="Reset zoom">
              <RotateCcw className="h-5 w-5" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => onOpenChange(false)} aria-label="Close">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Image area */}
        <div
          className="w-full h-full flex items-center justify-center overflow-hidden select-none"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          onDoubleClick={handleDoubleClick}
          style={{ cursor: zoom > 1 ? (dragState.current ? 'grabbing' : 'grab') : 'zoom-in' }}
        >
          <img
            src={photo.media_url}
            alt={photo.title || 'Photo'}
            draggable={false}
            className="max-w-full max-h-full object-contain transition-transform duration-100"
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
            }}
          />
        </div>

        {/* Nav arrows */}
        {photos.length > 1 && (
          <>
            <Button
              size="icon"
              variant="ghost"
              onClick={prev}
              aria-label="Previous"
              className="absolute left-2 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-background/60 hover:bg-background/80"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={next}
              aria-label="Next"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-background/60 hover:bg-background/80"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </>
        )}

        {/* Caption */}
        {photo.description && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background/80 to-transparent text-sm text-foreground/90">
            {photo.description}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
