import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import MapComponent from '@/components/MapComponent';
import MapFiltersBar from '@/components/MapFiltersBar';
import MusiciansList from '@/components/MusiciansList';
import MusicianPopup from '@/components/MusicianPopup';
import Header from '@/components/Header';
import MapboxTokenForm from '@/components/landing/MapboxTokenForm';
import { MapFiltersState } from '@/components/MapFilters';
import { supabase } from '@/integrations/supabase/client';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';

interface ExtendedFilters extends MapFiltersState {
  searchQuery?: string;
  city?: string;
  availabilityDate?: string;
}

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

// Calculate distance between two points
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

const Map = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [tokenSaved, setTokenSaved] = useState(false);
  const [filters, setFilters] = useState<ExtendedFilters>({
    instrument: '',
    skillLevel: '',
    gender: '',
    maxDistance: 0,
    favoritesOnly: false,
    searchQuery: '',
    city: '',
    availabilityDate: '',
  });
  
  const [musicians, setMusicians] = useState<Musician[]>([]);
  const [compatibleIds, setCompatibleIds] = useState<Set<string>>(new Set());
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [highlightedMusicianId, setHighlightedMusicianId] = useState<string | null>(null);
  const [selectedMusician, setSelectedMusician] = useState<Musician | null>(null);
  const [selectedMusicianDistance, setSelectedMusicianDistance] = useState<number | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Load user location
  useEffect(() => {
    const loadUserLocation = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('latitude, longitude')
        .eq('id', user.id)
        .single();
      
      if (data?.latitude && data?.longitude) {
        setUserLocation({ lat: Number(data.latitude), lng: Number(data.longitude) });
      }
    };
    loadUserLocation();
  }, [user]);

  const handleMusiciansChange = useCallback((
    filteredMusicians: Musician[],
    compatibles: Set<string>
  ) => {
    setMusicians(filteredMusicians);
    setCompatibleIds(compatibles);
  }, []);

  const handleMusicianClick = useCallback((musician: Musician) => {
    setSelectedMusician(musician);
    if (userLocation) {
      const dist = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        musician.latitude,
        musician.longitude
      );
      setSelectedMusicianDistance(dist);
    }
  }, [userLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">A carregar...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const savedToken = localStorage.getItem('mapbox_token');

  if (!tokenSaved && !savedToken) {
    return <MapboxTokenForm onTokenSaved={() => setTokenSaved(true)} />;
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <Header />
      <MapFiltersBar filters={filters} onFiltersChange={setFilters} />
      
      <div className="flex-1 pt-0">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Musicians list panel */}
          <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
            <div className="h-full flex flex-col border-r">
              <MusiciansList
                musicians={musicians}
                compatibleIds={compatibleIds}
                userLocation={userLocation}
                highlightedId={highlightedMusicianId}
                onMusicianClick={handleMusicianClick}
                onMusicianHover={setHighlightedMusicianId}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Map panel */}
          <ResizablePanel defaultSize={70}>
            <div className="relative h-full">
              <MapComponent
                token={savedToken || ''}
                filters={filters}
                onMusiciansChange={handleMusiciansChange}
                highlightedMusicianId={highlightedMusicianId}
                onMusicianSelect={handleMusicianClick}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {selectedMusician && (
        <MusicianPopup
          musician={selectedMusician}
          distance={selectedMusicianDistance}
          onClose={() => setSelectedMusician(null)}
        />
      )}
    </div>
  );
};

export default Map;
