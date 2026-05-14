import { useTranslation } from 'react-i18next';
import { ScrollArea } from '@/components/ui/scroll-area';
import MusicianCard from './MusicianCard';
import { useFavorites } from '@/hooks/useFavorites';
import { useAuth } from '@/hooks/useAuth';

interface Musician {
  id: string;
  username: string;
  instrument: string;
  city: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
  average_rating: number | null;
  total_ratings: number | null;
  avatar_url: string | null;
  skill_level?: string;
  gender?: string;
}

interface MusiciansListProps {
  musicians: Musician[];
  compatibleIds: Set<string>;
  userLocation: { lat: number; lng: number } | null;
  highlightedId: string | null;
  onMusicianClick: (musician: Musician) => void;
  onMusicianHover: (musicianId: string | null) => void;
}

// Calculate distance between two points using Haversine formula
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const MusiciansList = ({
  musicians,
  compatibleIds,
  userLocation,
  highlightedId,
  onMusicianClick,
  onMusicianHover,
}: MusiciansListProps) => {
  const { user } = useAuth();
  const { isFavorite } = useFavorites();

  // Filter out current user and sort by compatibility, then rating
  const sortedMusicians = musicians
    .filter((m) => m.id !== user?.id)
    .map((m) => ({
      ...m,
      distance: userLocation
        ? calculateDistance(userLocation.lat, userLocation.lng, m.latitude, m.longitude)
        : null,
      isCompatible: compatibleIds.has(m.id),
      isFav: isFavorite(m.id),
    }))
    .sort((a, b) => {
      // Favorites first
      if (a.isFav && !b.isFav) return -1;
      if (!a.isFav && b.isFav) return 1;
      // Then compatible
      if (a.isCompatible && !b.isCompatible) return -1;
      if (!a.isCompatible && b.isCompatible) return 1;
      // Then by rating
      return (b.average_rating || 0) - (a.average_rating || 0);
    });

  if (sortedMusicians.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center">
        <div>
          <p className="text-muted-foreground">Nenhum músico encontrado</p>
          <p className="text-sm text-muted-foreground mt-1">
            Tenta ajustar os filtros
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-4 space-y-3">
        <p className="text-sm text-muted-foreground mb-2">
          {sortedMusicians.length} músico{sortedMusicians.length !== 1 ? 's' : ''} encontrado{sortedMusicians.length !== 1 ? 's' : ''}
        </p>
        {sortedMusicians.map((musician) => (
          <MusicianCard
            key={musician.id}
            musician={musician}
            distance={musician.distance}
            isHighlighted={highlightedId === musician.id}
            isCompatible={musician.isCompatible}
            isFavorite={musician.isFav}
            onClick={() => onMusicianClick(musician)}
            onMouseEnter={() => onMusicianHover(musician.id)}
            onMouseLeave={() => onMusicianHover(null)}
          />
        ))}
      </div>
    </ScrollArea>
  );
};

export default MusiciansList;
