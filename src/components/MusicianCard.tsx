import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Star, MapPin, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MusicianCardProps {
  musician: {
    id: string;
    username: string;
    instrument: string;
    city: string | null;
    country: string | null;
    avatar_url: string | null;
    average_rating: number | null;
    total_ratings: number | null;
    skill_level?: string;
  };
  distance: number | null;
  isHighlighted?: boolean;
  isCompatible?: boolean;
  isFavorite?: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

const skillLevelLabels: Record<string, string> = {
  beginner: 'Iniciante',
  intermediate: 'Intermédio',
  advanced: 'Avançado',
  professional: 'Profissional',
};

const MusicianCard = ({
  musician,
  distance,
  isHighlighted,
  isCompatible,
  isFavorite,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: MusicianCardProps) => {
  return (
    <Card
      className={cn(
        'p-4 cursor-pointer transition-all duration-200 hover:shadow-md',
        isHighlighted && 'ring-2 ring-primary shadow-lg',
        isCompatible && 'border-lime-500 bg-lime-50/50 dark:bg-lime-950/20'
      )}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="flex gap-4">
      <div className="relative">
          <Avatar className="h-16 w-16">
            <AvatarImage src={musician.avatar_url || undefined} alt={musician.username} />
            <AvatarFallback className="bg-muted text-muted-foreground text-lg">
              {musician.username.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {isFavorite && (
            <div className="absolute -top-1 -right-1 bg-background rounded-full p-0.5 shadow">
              <Heart className="h-4 w-4 fill-destructive text-destructive" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-foreground truncate">{musician.username}</h3>
              <p className="text-sm text-muted-foreground">{musician.instrument}</p>
            </div>
            {musician.average_rating != null && musician.average_rating > 0 && (
              <div className="flex items-center gap-1 shrink-0">
                <Star className="h-4 w-4 fill-primary text-primary" />
                <span className="text-sm font-medium">{musician.average_rating.toFixed(1)}</span>
                {musician.total_ratings != null && musician.total_ratings > 0 && (
                  <span className="text-xs text-muted-foreground">({musician.total_ratings})</span>
                )}
              </div>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {musician.skill_level && (
              <Badge variant="secondary" className="text-xs">
                {skillLevelLabels[musician.skill_level] || musician.skill_level}
              </Badge>
            )}
            {isCompatible && (
              <Badge className="text-xs bg-lime-500 hover:bg-lime-600 text-white">
                Match
              </Badge>
            )}
          </div>

          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            {(musician.city || musician.country) && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {[musician.city, musician.country].filter(Boolean).join(', ')}
              </span>
            )}
            {distance !== null && (
              <span className="font-medium text-foreground">
                {distance < 1 ? '< 1 km' : `${Math.round(distance)} km`}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default MusicianCard;
