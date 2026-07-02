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
  const { t } = useTranslation();
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragState = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // Capture the element that had focus at the moment the lightbox opens,
  // so we can restore focus to it on close even when the dialog is controlled
  // externally (no <DialogTrigger> wrapper).
  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement as HTMLElement | null;
    }
  }, [open]);

  const photo = photos[index];
  const positionLabel = photos.length > 0 ? `${index + 1} / ${photos.length}` : '';

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
        aria-label={t('lightbox.dialog_label', 'Photo viewer')}
        onOpenAutoFocus={(e) => {
          // Move focus to the image instead of the first button so screen-reader users
          // hear the photo announcement and can use keyboard shortcuts immediately.
          e.preventDefault();
          imageRef.current?.focus();
        }}
        onCloseAutoFocus={(e) => {
          // Restore focus to the element that opened the lightbox (the thumbnail).
          const target = triggerRef.current;
          if (target && typeof target.focus === 'function' && document.contains(target)) {
            e.preventDefault();
            target.focus();
          }
        }}
      >
        <VisuallyHidden asChild>
          <DialogTitle>
            {photo.title || t('lightbox.dialog_label', 'Photo viewer')} — {positionLabel}
          </DialogTitle>
        </VisuallyHidden>
        <VisuallyHidden asChild>
          <DialogDescription>
            {t(
              'lightbox.instructions',
              'Use left and right arrow keys to navigate. Plus and minus to zoom. Zero to reset. Escape to close.'
            )}
          </DialogDescription>
        </VisuallyHidden>

        {/* Live region announces photo changes to screen readers */}
        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {photo.title
            ? `${photo.title} — ${positionLabel}`
            : t('lightbox.photo_of', { current: index + 1, total: photos.length, defaultValue: 'Photo {{current}} of {{total}}' })}
        </div>

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-3 bg-gradient-to-b from-background/80 to-transparent">
          <div className="text-sm text-foreground/90 truncate max-w-[60%]" aria-hidden="true">
            {photo.title || positionLabel}
          </div>
          <div className="flex items-center gap-1" role="toolbar" aria-label={t('lightbox.toolbar', 'Image controls')}>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP))}
              disabled={zoom <= MIN_ZOOM}
              aria-label={t('lightbox.zoom_out', 'Zoom out')}
            >
              <ZoomOut className="h-5 w-5" aria-hidden="true" />
            </Button>
            <span className="text-xs w-12 text-center tabular-nums" aria-live="polite" aria-label={t('lightbox.zoom_level', 'Zoom level')}>
              {Math.round(zoom * 100)}%
            </span>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP))}
              disabled={zoom >= MAX_ZOOM}
              aria-label={t('lightbox.zoom_in', 'Zoom in')}
            >
              <ZoomIn className="h-5 w-5" aria-hidden="true" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={reset}
              aria-label={t('lightbox.reset', 'Reset zoom')}
            >
              <RotateCcw className="h-5 w-5" aria-hidden="true" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              aria-label={t('lightbox.close', 'Close')}
            >
              <X className="h-5 w-5" aria-hidden="true" />
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
            ref={imageRef}
            src={photo.media_url}
            alt={photo.title || t('lightbox.image_alt', 'Enlarged photo')}
            draggable={false}
            tabIndex={0}
            className="max-w-full max-h-full object-contain transition-transform duration-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
              aria-label={t('lightbox.previous', 'Previous photo')}
              aria-keyshortcuts="ArrowLeft"
              className="absolute left-2 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-background/60 hover:bg-background/80"
            >
              <ChevronLeft className="h-6 w-6" aria-hidden="true" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={next}
              aria-label={t('lightbox.next', 'Next photo')}
              aria-keyshortcuts="ArrowRight"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-background/60 hover:bg-background/80"
            >
              <ChevronRight className="h-6 w-6" aria-hidden="true" />
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
