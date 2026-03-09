import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useBlockedUsers } from '@/hooks/useBlockedUsers';
import { useFavorites } from '@/hooks/useFavorites';
import MusicianPopup from './MusicianPopup';
import { MapFiltersState } from './MapFilters';

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

interface MapComponentProps {
  token: string;
  filters?: ExtendedFilters;
  onFilteredCountChange?: (count: number) => void;
  onMusiciansChange?: (musicians: Musician[], compatibleIds: Set<string>) => void;
  highlightedMusicianId?: string | null;
  onMusicianSelect?: (musician: Musician) => void;
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

// Approximate coordinates (~1km precision) to protect exact location
const approximateCoord = (coord: number): number => Math.round(coord * 100) / 100;

// Calculate distance between two points using Haversine formula
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const MapComponent = ({ token, filters, onFilteredCountChange, onMusiciansChange, highlightedMusicianId, onMusicianSelect }: MapComponentProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const markerElementsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const [selectedMusician, setSelectedMusician] = useState<Musician | null>(null);
  const [selectedMusicianDistance, setSelectedMusicianDistance] = useState<number | null>(null);
  const [musicians, setMusicians] = useState<Musician[]>([]);
  const [busyMusicianIds, setBusyMusicianIds] = useState<Set<string>>(new Set());
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const { user } = useAuth();
  const { blockedIds } = useBlockedUsers();
  const { isFavorite } = useFavorites();

  // Load user preferences and location
  useEffect(() => {
    const loadUserPreferences = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('preferred_skill_levels, preferred_instruments, latitude, longitude')
        .eq('id', user.id)
        .single();

      if (data) {
        setUserPreferences({
          preferred_skill_levels: data.preferred_skill_levels || [],
          preferred_instruments: data.preferred_instruments || [],
        });
        
        // Set user location if available
        if (data.latitude && data.longitude) {
          setUserLocation({ lat: data.latitude, lng: data.longitude });
        }
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

  // Load busy musicians for a specific date
  useEffect(() => {
    const loadBusyMusicians = async () => {
      if (!filters?.availabilityDate) {
        setBusyMusicianIds(new Set());
        return;
      }

      const selectedDate = new Date(filters.availabilityDate);
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const { data } = await supabase
        .from('bookings')
        .select('musician_id, requester_id')
        .in('status', ['accepted', 'pending'])
        .gte('scheduled_date', startOfDay.toISOString())
        .lte('scheduled_date', endOfDay.toISOString());

      if (data) {
        const busyIds = new Set<string>();
        data.forEach((booking) => {
          busyIds.add(booking.musician_id);
          busyIds.add(booking.requester_id);
        });
        setBusyMusicianIds(busyIds);
      }
    };

    loadBusyMusicians();
  }, [filters?.availabilityDate]);

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
      // Filter out blocked users
      if (blockedIds.has(musician.id)) {
        return false;
      }
      // Search by name filter
      if (filters?.searchQuery && filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase().trim();
        if (!musician.username.toLowerCase().includes(query)) {
          return false;
        }
      }
      // City/region filter
      if (filters?.city && filters.city.trim()) {
        const cityQuery = filters.city.toLowerCase().trim();
        const musicianCity = musician.city?.toLowerCase() || '';
        const musicianCountry = musician.country?.toLowerCase() || '';
        if (!musicianCity.includes(cityQuery) && !musicianCountry.includes(cityQuery)) {
          return false;
        }
      }
      // Favorites only filter
      if (filters?.favoritesOnly && !isFavorite(musician.id)) {
        return false;
      }
      if (filters?.instrument && musician.instrument !== filters.instrument) {
        return false;
      }
      if (filters?.skillLevel && musician.skill_level !== filters.skillLevel) {
        return false;
      }
      if (filters?.gender && musician.gender !== filters.gender) {
        return false;
      }
      // Distance filter
      if (filters?.maxDistance && filters.maxDistance > 0 && userLocation) {
        const distance = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          musician.latitude,
          musician.longitude
        );
        if (distance > filters.maxDistance) {
          return false;
        }
      }
      // Availability date filter - hide busy musicians
      if (filters?.availabilityDate && busyMusicianIds.has(musician.id)) {
        return false;
      }
      return true;
    });

    // Report filtered count to parent
    onFilteredCountChange?.(filteredMusicians.length);
    
    // Collect compatible IDs
    const compatibleIds = new Set<string>();
    filteredMusicians.forEach((m) => {
      if (isCompatibleMatch(m)) compatibleIds.add(m.id);
    });
    
    // Report musicians to parent
    onMusiciansChange?.(filteredMusicians, compatibleIds);
    
    // Clear marker elements map
    markerElementsRef.current.clear();

    // Create markers for filtered musicians
    filteredMusicians.forEach((musician) => {
      const isMatch = isCompatibleMatch(musician);
      const isFav = isFavorite(musician.id);
      
      const el = document.createElement('div');
      el.className = 'musician-marker';
      el.style.position = 'relative';
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

      // Add favorite heart indicator
      if (isFav) {
        const heartBadge = document.createElement('div');
        heartBadge.className = 'favorite-badge';
        heartBadge.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`;
        heartBadge.style.position = 'absolute';
        heartBadge.style.top = '-4px';
        heartBadge.style.right = '-4px';
        heartBadge.style.backgroundColor = 'white';
        heartBadge.style.borderRadius = '50%';
        heartBadge.style.width = '20px';
        heartBadge.style.height = '20px';
        heartBadge.style.display = 'flex';
        heartBadge.style.alignItems = 'center';
        heartBadge.style.justifyContent = 'center';
        heartBadge.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
        el.appendChild(heartBadge);
      }

      el.addEventListener('click', () => {
        if (onMusicianSelect) {
          onMusicianSelect(musician);
        } else {
          setSelectedMusician(musician);
          if (userLocation) {
            const dist = calculateDistance(
              userLocation.lat,
              userLocation.lng,
              approximateCoord(musician.latitude),
              approximateCoord(musician.longitude)
            );
            setSelectedMusicianDistance(dist);
          } else {
            setSelectedMusicianDistance(null);
          }
        }
      });
      
      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.1)';
      });
      
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
      });

      const marker = new mapboxgl.Marker(el)
        .setLngLat([approximateCoord(musician.longitude), approximateCoord(musician.latitude)])
        .addTo(map.current!);

      markersRef.current.push(marker);
    });
  }, [musicians, filters, isCompatibleMatch, isFavorite, userLocation, blockedIds, busyMusicianIds, onFilteredCountChange]);

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
          distance={selectedMusicianDistance}
          onClose={() => setSelectedMusician(null)}
        />
      )}
    </>
  );
};

export default MapComponent;
