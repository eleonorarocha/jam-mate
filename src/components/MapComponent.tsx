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
  flyTo?: [number, number] | null;
  onFlyToComplete?: () => void;
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

const MapComponent = ({ token, filters, onFilteredCountChange, onMusiciansChange, highlightedMusicianId, onMusicianSelect, isAuthenticated = true, flyTo, onFlyToComplete }: MapComponentProps & { isAuthenticated?: boolean }) => {
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
    if (isAuthenticated) {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, instrument, city, country, latitude, longitude, average_rating, total_ratings, avatar_url, skill_level, gender')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);
      if (data) {
        setMusicians(data as Musician[]);
      }
    } else {
      // Non-authenticated: use public_profiles with approximate coordinates
      const { data } = await supabase
        .from('public_profiles')
        .select('id, username, instrument, city, country, approx_latitude, approx_longitude, average_rating, total_ratings, avatar_url, skill_level, gender')
        .not('approx_latitude', 'is', null)
        .not('approx_longitude', 'is', null);
      if (data) {
        setMusicians(data.map(m => ({
          ...m,
          id: m.id!,
          username: m.username!,
          instrument: m.instrument!,
          latitude: m.approx_latitude!,
          longitude: m.approx_longitude!,
          avatar_url: null, // Hide avatars for non-authenticated users
        })) as Musician[]);
      }
    }
  }, [isAuthenticated]);

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

    // Create Airbnb-style pill markers for filtered musicians
    filteredMusicians.forEach((musician) => {
      const isMatch = isCompatibleMatch(musician);
      const isFav = isFavorite(musician.id);
      const isHighlighted = highlightedMusicianId === musician.id;

      const el = document.createElement('div');
      el.className = 'musician-marker';
      el.style.position = 'relative';
      el.style.cursor = 'pointer';
      el.style.transition = 'transform 0.15s ease, box-shadow 0.15s ease';
      el.style.transformOrigin = 'center bottom';

      // Build the pill
      const pill = document.createElement('div');
      pill.style.display = 'inline-flex';
      pill.style.alignItems = 'center';
      pill.style.gap = '6px';
      pill.style.padding = '6px 10px 6px 6px';
      pill.style.borderRadius = '9999px';
      pill.style.background = isHighlighted ? '#222' : '#fff';
      pill.style.color = isHighlighted ? '#fff' : '#222';
      pill.style.border = isMatch
        ? '2px solid hsl(142, 76%, 36%)'
        : '1px solid rgba(0,0,0,0.08)';
      pill.style.boxShadow = '0 2px 6px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.1)';
      pill.style.font = '600 13px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      pill.style.whiteSpace = 'nowrap';

      // Avatar / initial circle
      const avatar = document.createElement('div');
      avatar.style.width = '24px';
      avatar.style.height = '24px';
      avatar.style.borderRadius = '50%';
      avatar.style.flexShrink = '0';
      avatar.style.display = 'flex';
      avatar.style.alignItems = 'center';
      avatar.style.justifyContent = 'center';
      avatar.style.background = 'hsl(var(--primary))';
      avatar.style.color = '#fff';
      avatar.style.font = '700 11px/1 inherit';
      avatar.style.overflow = 'hidden';
      if (musician.avatar_url) {
        avatar.style.backgroundImage = `url(${musician.avatar_url})`;
        avatar.style.backgroundSize = 'cover';
        avatar.style.backgroundPosition = 'center';
      } else {
        avatar.textContent = (musician.username || '?').charAt(0).toUpperCase();
      }
      pill.appendChild(avatar);

      // Instrument label
      const label = document.createElement('span');
      label.textContent = musician.instrument || '🎵';
      pill.appendChild(label);

      // Rating
      if (musician.average_rating && musician.average_rating > 0) {
        const rating = document.createElement('span');
        rating.style.display = 'inline-flex';
        rating.style.alignItems = 'center';
        rating.style.gap = '2px';
        rating.style.fontSize = '12px';
        rating.style.opacity = '0.85';
        rating.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.39 7.36H22l-6.18 4.49L18.21 22 12 17.5 5.79 22l2.39-8.15L2 9.36h7.61z"/></svg>${musician.average_rating.toFixed(1)}`;
        pill.appendChild(rating);
      }

      el.appendChild(pill);

      if (isMatch) {
        el.style.animation = 'jm-pulse 2s infinite';
      }

      // Favorite heart badge
      if (isFav) {
        const heartBadge = document.createElement('div');
        heartBadge.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`;
        heartBadge.style.position = 'absolute';
        heartBadge.style.top = '-6px';
        heartBadge.style.right = '-6px';
        heartBadge.style.backgroundColor = '#fff';
        heartBadge.style.borderRadius = '50%';
        heartBadge.style.width = '18px';
        heartBadge.style.height = '18px';
        heartBadge.style.display = 'flex';
        heartBadge.style.alignItems = 'center';
        heartBadge.style.justifyContent = 'center';
        heartBadge.style.boxShadow = '0 1px 3px rgba(0,0,0,0.25)';
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
        el.style.transform = 'scale(1.08)';
        el.style.zIndex = '900';
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
        el.style.zIndex = '';
      });

      markerElementsRef.current.set(musician.id, el);

      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([approximateCoord(musician.longitude), approximateCoord(musician.latitude)])
        .addTo(map.current!);

      markersRef.current.push(marker);
    });

    // Auto-fit map to visible markers
    if (filteredMusicians.length > 0 && map.current) {
      const bounds = new mapboxgl.LngLatBounds();
      filteredMusicians.forEach((m) => {
        bounds.extend([approximateCoord(m.longitude), approximateCoord(m.latitude)]);
      });
      if (userLocation) {
        bounds.extend([userLocation.lng, userLocation.lat]);
      }
      try {
        map.current.fitBounds(bounds, {
          padding: 80,
          maxZoom: 12,
          duration: 800,
        });
      } catch (_) {
        // ignore (e.g. single point edge cases)
      }
    }

  }, [musicians, filters, isCompatibleMatch, isFavorite, userLocation, blockedIds, busyMusicianIds, onFilteredCountChange, onMusiciansChange, onMusicianSelect]);

  // Fly to coordinates when selected from search
  useEffect(() => {
    if (!map.current || !flyTo) return;
    map.current.flyTo({
      center: flyTo,
      zoom: 11,
      duration: 1500,
    });
    onFlyToComplete?.();
  }, [flyTo, onFlyToComplete]);

  // Handle highlighted musician from list hover
  useEffect(() => {
    markerElementsRef.current.forEach((el, id) => {
      if (id === highlightedMusicianId) {
        el.style.transform = 'scale(1.3)';
        el.style.zIndex = '1000';
      } else {
        el.style.transform = 'scale(1)';
        el.style.zIndex = '';
      }
    });
  }, [highlightedMusicianId]);

  return (
    <>
      <style>
        {`
          @keyframes jm-pulse {
            0%, 100% { filter: drop-shadow(0 0 0 hsla(142, 76%, 36%, 0.6)); }
            50% { filter: drop-shadow(0 0 6px hsla(142, 76%, 36%, 0.7)); }
          }
        `}
      </style>

      <div ref={mapContainer} className="absolute inset-0" />
      {selectedMusician && (
        <MusicianPopup
          musician={selectedMusician}
          distance={selectedMusicianDistance}
          onClose={() => setSelectedMusician(null)}
          isAuthenticated={isAuthenticated}
        />
      )}
    </>
  );
};

export default MapComponent;
