import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import { cn } from '@/lib/utils';

interface FavoriteButtonProps {
  musicianId: string;
  variant?: 'default' | 'icon';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

const FavoriteButton = ({
  musicianId,
  variant = 'icon',
  size = 'icon',
  className,
}: FavoriteButtonProps) => {
  const { isFavorite, toggleFavorite } = useFavorites();
  const [loading, setLoading] = useState(false);
  const favorited = isFavorite(musicianId);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setLoading(true);
    await toggleFavorite(musicianId);
    setLoading(false);
  };

  if (variant === 'icon') {
    return (
      <Button
        variant="ghost"
        size={size}
        onClick={handleClick}
        disabled={loading}
        className={cn(
          "hover:bg-transparent",
          favorited ? "text-red-500 hover:text-red-600" : "text-muted-foreground hover:text-red-500",
          className
        )}
      >
        <Heart
          className={cn(
            "h-5 w-5 transition-all",
            favorited && "fill-current",
            loading && "animate-pulse"
          )}
        />
      </Button>
    );
  }

  return (
    <Button
      variant={favorited ? "secondary" : "outline"}
      size={size}
      onClick={handleClick}
      disabled={loading}
      className={className}
    >
      <Heart
        className={cn(
          "h-4 w-4 mr-2",
          favorited && "fill-red-500 text-red-500"
        )}
      />
      {favorited ? 'Nos favoritos' : 'Adicionar aos favoritos'}
    </Button>
  );
};

export default FavoriteButton;
