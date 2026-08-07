import { useTranslation } from 'react-i18next';
import { MUSIC_GENRES } from '@/lib/genres';
import { cn } from '@/lib/utils';

interface GenreSelectorProps {
  value: string[];
  onChange: (genres: string[]) => void;
  className?: string;
}

const GenreSelector = ({ value, onChange, className }: GenreSelectorProps) => {
  const { t } = useTranslation();

  const toggle = (genre: string) => {
    onChange(value.includes(genre) ? value.filter((g) => g !== genre) : [...value, genre]);
  };

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {MUSIC_GENRES.map((genre) => {
        const selected = value.includes(genre);
        return (
          <button
            key={genre}
            type="button"
            aria-pressed={selected}
            onClick={() => toggle(genre)}
            className={cn(
              'px-3 py-1.5 rounded-full border text-sm transition-colors',
              selected
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-muted-foreground border-border hover:bg-muted'
            )}
          >
            {t(`map.genres.${genre}`)}
          </button>
        );
      })}
    </div>
  );
};

export default GenreSelector;
