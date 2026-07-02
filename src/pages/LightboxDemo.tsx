import { useState } from 'react';
import PhotoLightbox, { LightboxPhoto } from '@/components/PhotoLightbox';
import { Button } from '@/components/ui/button';

const MOCK_PHOTOS: LightboxPhoto[] = [
  {
    id: '1',
    media_url: 'https://picsum.photos/id/1015/1600/1000',
    thumbnail_url: 'https://picsum.photos/id/1015/400/400',
    title: 'Mountain river',
    description: 'A wide river flowing between forested mountains.',
  },
  {
    id: '2',
    media_url: 'https://picsum.photos/id/1025/1400/1600',
    thumbnail_url: 'https://picsum.photos/id/1025/400/400',
    title: 'Portrait of a pug',
    description: null,
  },
  {
    id: '3',
    media_url: 'https://picsum.photos/id/1043/1800/1200',
    thumbnail_url: 'https://picsum.photos/id/1043/400/400',
    title: null,
    description: 'Untitled sample photo.',
  },
  {
    id: '4',
    media_url: 'https://picsum.photos/id/1062/1600/1000',
    thumbnail_url: 'https://picsum.photos/id/1062/400/400',
    title: 'Forest canopy',
    description: 'Light filtering through tall trees.',
  },
];

export default function LightboxDemo() {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  // Guard: only accessible in dev builds
  if (!import.meta.env.DEV) {
    return (
      <main className="min-h-dvh flex items-center justify-center p-6">
        <p className="text-muted-foreground">This page is only available in development mode.</p>
      </main>
    );
  }

  return (
    <main className="min-h-dvh container mx-auto p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Lightbox demo</h1>
        <p className="text-muted-foreground text-sm">
          Development harness for <code>PhotoLightbox</code>. Click any photo to open. Keyboard:
          ←/→ navigate, +/− zoom, 0 reset, Esc close.
        </p>
      </header>

      <section aria-label="Sample photos" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {MOCK_PHOTOS.map((photo, i) => (
          <button
            type="button"
            key={photo.id}
            onClick={() => {
              setIndex(i);
              setOpen(true);
            }}
            className="aspect-square rounded-lg overflow-hidden bg-muted border group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={photo.title || `Photo ${i + 1}`}
          >
            <img
              src={photo.thumbnail_url || photo.media_url}
              alt={photo.title || `Sample photo ${i + 1}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform cursor-zoom-in"
              loading="lazy"
            />
          </button>
        ))}
      </section>

      <div className="mt-6">
        <Button
          onClick={() => {
            setIndex(0);
            setOpen(true);
          }}
        >
          Open lightbox from start
        </Button>
      </div>

      <PhotoLightbox
        photos={MOCK_PHOTOS}
        index={index}
        open={open}
        onOpenChange={setOpen}
        onIndexChange={setIndex}
      />
    </main>
  );
}
