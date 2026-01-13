import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import MusicianPopup from './MusicianPopup';
import { MapFiltersState } from './MapFilters';

interface MapComponentProps {
  token: string;
  filters?: MapFiltersState;
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

interface UserPreferences {
  preferred_skill_levels: string[];
  preferred_instruments: string[];
}

const MapComponent = ({ token, filters }: MapComponentProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [selectedMusician, setSelectedMusician] = useState<Musician | null>(null);
  const [musicians, setMusicians] = useState<Musician[]>([]);
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);
  const { user } = useAuth();

  // Load user preferences
  useEffect(() => {
    const loadUserPreferences = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('preferred_skill_levels, preferred_instruments')
        .eq('id', user.id)
        .single();

      if (data) {
        setUserPreferences({
          preferred_skill_levels: data.preferred_skill_levels || [],
          preferred_instruments: data.preferred_instruments || [],
        });
      }
    };

    loadUserPreferences();
  }, [user]);

  // Check if a musician is compatible with user preferences
  const isCompatibleMatch = useCallback((musician: Musician): boolean => {
    if (!userPreferences) return false;
    if (!user || musician.id === user.id) return false;

    const { preferred_skill_levels, preferred_instruments } = userPreferences;

    // If no preferences set, no special highlighting
    if (preferred_skill_levels.length === 0 && preferred_instruments.length === 0) {
      return false;
    }

    // Check skill level match (empty array means accepts all)
    const skillMatch = preferred_skill_levels.length === 0 || 
      (musician.skill_level && preferred_skill_levels.includes(musician.skill_level));

    // Check instrument match (empty array means accepts all)
    const instrumentMatch = preferred_instruments.length === 0 || 
      preferred_instruments.includes(musician.instrument);

    return skillMatch && instrumentMatch;
  }, [userPreferences, user]);

  // Load musicians from database
  const loadMusicians = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, instrument, city, country, latitude, longitude, average_rating, total_ratings, avatar_url, skill_level, gender')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (data) {
      setMusicians(data as Musician[]);
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !token) return;

    mapboxgl.accessToken = token;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      zoom: 2,
      center: [0, 30],
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-left');

    loadMusicians();

    return () => {
      map.current?.remove();
    };
  }, [token, loadMusicians]);

  // Filter and render markers
  useEffect(() => {
    if (!map.current || musicians.length === 0) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Apply filters
    const filteredMusicians = musicians.filter((musician) => {
      if (filters?.instrument && musician.instrument !== filters.instrument) {
        return false;
      }
      if (filters?.skillLevel && musician.skill_level !== filters.skillLevel) {
        return false;
      }
      if (filters?.gender && musician.gender !== filters.gender) {
        return false;
      }
      return true;
    });

    // Create markers for filtered musicians
    filteredMusicians.forEach((musician) => {
      const isMatch = isCompatibleMatch(musician);
      
      const el = document.createElement('div');
      el.className = 'musician-marker';
      el.style.backgroundImage = musician.avatar_url
        ? `url(${musician.avatar_url})`
        : '';
      el.style.width = isMatch ? '48px' : '40px';
      el.style.height = isMatch ? '48px' : '40px';
      el.style.borderRadius = '50%';
      el.style.cursor = 'pointer';
      el.style.backgroundColor = 'hsl(var(--primary))';
      el.style.border = isMatch ? '4px solid hsl(142, 76%, 36%)' : '3px solid white';
      el.style.boxShadow = isMatch 
        ? '0 0 12px 4px hsla(142, 76%, 36%, 0.5), 0 2px 8px rgba(0,0,0,0.3)' 
        : '0 2px 8px rgba(0,0,0,0.3)';
      el.style.backgroundSize = 'cover';
      el.style.backgroundPosition = 'center';
      el.style.transition = 'transform 0.2s ease';
      
      if (isMatch) {
        el.style.animation = 'pulse 2s infinite';
      }

      el.addEventListener('click', () => {
        setSelectedMusician(musician);
      });
      
      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.1)';
      });
      
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
      });

      const marker = new mapboxgl.Marker(el)
        .setLngLat([musician.longitude, musician.latitude])
        .addTo(map.current!);

      markersRef.current.push(marker);
    });
  }, [musicians, filters, isCompatibleMatch]);

  return (
    <>
      <style>
        {`
          @keyframes pulse {
            0%, 100% { box-shadow: 0 0 12px 4px hsla(142, 76%, 36%, 0.5), 0 2px 8px rgba(0,0,0,0.3); }
            50% { box-shadow: 0 0 20px 8px hsla(142, 76%, 36%, 0.3), 0 2px 8px rgba(0,0,0,0.3); }
          }
        `}
      </style>
      <div ref={mapContainer} className="absolute inset-0" />
      {selectedMusician && (
        <MusicianPopup
          musician={selectedMusician}
          onClose={() => setSelectedMusician(null)}
        />
      )}
    </>
  );
};

export default MapComponent;
