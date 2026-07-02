import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import Supercluster from 'supercluster';
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

    map.current.addControl(
      new mapboxgl.NavigationControl({ showCompass: false, visualizePitch: false }),
      'top-right',
    );

    loadMusicians();

    return () => {
      map.current?.remove();
    };
  }, [token, loadMusicians]);

  // Refs used by the clustering renderer
  const clusterRef = useRef<Supercluster | null>(null);
  const filteredRef = useRef<Musician[]>([]);

  const buildMusicianMarker = useCallback((musician: Musician): HTMLDivElement => {
    const isMatch = isCompatibleMatch(musician);
    const isFav = isFavorite(musician.id);
    const isHighlighted = highlightedMusicianId === musician.id;

    const el = document.createElement('div');
    el.className = 'musician-marker';
    el.style.position = 'relative';
    el.style.cursor = 'pointer';
    el.style.transition = 'transform 0.15s ease, box-shadow 0.15s ease';
    el.style.transformOrigin = 'center bottom';

    const pill = document.createElement('div');
    pill.style.display = 'inline-flex';
    pill.style.alignItems = 'center';
    pill.style.gap = '6px';
    pill.style.padding = '6px 10px 6px 6px';
    pill.style.borderRadius = '9999px';
    pill.style.background = isHighlighted ? '#222' : '#fff';
    pill.style.color = isHighlighted ? '#fff' : '#222';
    pill.style.border = isMatch ? '2px solid hsl(142, 76%, 36%)' : '1px solid rgba(0,0,0,0.08)';
    pill.style.boxShadow = '0 2px 6px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.1)';
    pill.style.font = '600 13px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    pill.style.whiteSpace = 'nowrap';

    const avatar = document.createElement('div');
    avatar.style.cssText = 'width:24px;height:24px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:hsl(var(--primary));color:#fff;font:700 11px/1 inherit;overflow:hidden;';
    if (musician.avatar_url) {
      avatar.style.backgroundImage = `url(${musician.avatar_url})`;
      avatar.style.backgroundSize = 'cover';
      avatar.style.backgroundPosition = 'center';
    } else {
      avatar.textContent = (musician.username || '?').charAt(0).toUpperCase();
    }
    pill.appendChild(avatar);

    const label = document.createElement('span');
    label.textContent = musician.instrument || '🎵';
    pill.appendChild(label);

    if (musician.average_rating && musician.average_rating > 0) {
      const rating = document.createElement('span');
      rating.style.cssText = 'display:inline-flex;align-items:center;gap:2px;font-size:12px;opacity:0.85;';
      rating.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.39 7.36H22l-6.18 4.49L18.21 22 12 17.5 5.79 22l2.39-8.15L2 9.36h7.61z"/></svg>${musician.average_rating.toFixed(1)}`;
      pill.appendChild(rating);
    }

    el.appendChild(pill);

    if (isMatch) el.style.animation = 'jm-pulse 2s infinite';

    if (isFav) {
      const heartBadge = document.createElement('div');
      heartBadge.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`;
      heartBadge.style.cssText = 'position:absolute;top:-6px;right:-6px;background:#fff;border-radius:50%;width:18px;height:18px;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 3px rgba(0,0,0,0.25);';
      el.appendChild(heartBadge);
    }

    el.addEventListener('click', () => {
      if (onMusicianSelect) {
        onMusicianSelect(musician);
      } else {
        setSelectedMusician(musician);
        if (userLocation) {
          const dist = calculateDistance(
            userLocation.lat, userLocation.lng,
            approximateCoord(musician.latitude), approximateCoord(musician.longitude)
          );
          setSelectedMusicianDistance(dist);
        } else {
          setSelectedMusicianDistance(null);
        }
      }
    });

    el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.08)'; el.style.zIndex = '900'; });
    el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)'; el.style.zIndex = ''; });

    return el;
  }, [isCompatibleMatch, isFavorite, highlightedMusicianId, onMusicianSelect, userLocation]);

  const buildClusterMarker = useCallback((
    count: number,
    expansionZoom: number,
    lng: number,
    lat: number,
    clusterId: number,
  ): HTMLDivElement => {
    const el = document.createElement('div');
    el.style.cssText = 'cursor:pointer;transition:transform 0.15s ease;';
    const size = count < 10 ? 36 : count < 50 ? 44 : count < 200 ? 52 : 60;
    const circle = document.createElement('div');
    circle.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;background:#fff;border:2px solid hsl(142, 76%, 36%);display:flex;align-items:center;justify-content:center;font:700 ${Math.max(13, size / 3)}px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;color:#222;box-shadow:0 2px 8px rgba(0,0,0,0.2), 0 1px 3px rgba(0,0,0,0.12);`;
    circle.textContent = String(count);
    el.appendChild(circle);
    el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.08)'; });
    el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)'; });
    el.addEventListener('click', (ev) => {
      ev.stopPropagation();
      if (!map.current || !clusterRef.current) return;

      // Fit the map to the bounding box of the cluster's children so the group
      // stays visually centered instead of drifting off-screen after re-clustering.
      try {
        const leaves = clusterRef.current.getLeaves(clusterId, Infinity);
        if (leaves.length > 1) {
          const lngs = leaves.map((l) => l.geometry.coordinates[0]);
          const lats = leaves.map((l) => l.geometry.coordinates[1]);
          const west = Math.min(...lngs);
          const east = Math.max(...lngs);
          const south = Math.min(...lats);
          const north = Math.max(...lats);
          // If all leaves share the (rounded) coordinate, fitBounds would zoom
          // to the max; fall back to a centered easeTo instead.
          if (west !== east || south !== north) {
            map.current.fitBounds(
              [[west, south], [east, north]],
              { padding: 80, maxZoom: expansionZoom + 1, duration: 500 },
            );
            return;
          }
        }
      } catch {
        // fall through to easeTo
      }

      map.current.easeTo({
        center: [lng, lat],
        zoom: Math.min(expansionZoom + 0.5, 20),
        duration: 500,
      });
    });
    return el;
  }, []);

  const renderClusters = useCallback(() => {
    if (!map.current || !clusterRef.current) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    markerElementsRef.current.clear();

    const bounds = map.current.getBounds();
    if (!bounds) return;
    const zoom = Math.floor(map.current.getZoom());
    const bbox: [number, number, number, number] = [
      bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth(),
    ];
    const clusters = clusterRef.current.getClusters(bbox, zoom);

    clusters.forEach((c) => {
      const [lng, lat] = c.geometry.coordinates;
      const props = c.properties as { cluster?: boolean; cluster_id?: number; point_count?: number; musicianId?: string };
      if (props.cluster) {
        const expansionZoom = clusterRef.current!.getClusterExpansionZoom(props.cluster_id!);
        const el = buildClusterMarker(props.point_count!, expansionZoom, lng, lat, props.cluster_id!);
        const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
          .setLngLat([lng, lat])
          .addTo(map.current!);
        markersRef.current.push(marker);
      } else {
        const musician = filteredRef.current.find((m) => m.id === props.musicianId);
        if (!musician) return;
        const el = buildMusicianMarker(musician);
        markerElementsRef.current.set(musician.id, el);
        const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([lng, lat])
          .addTo(map.current!);
        markersRef.current.push(marker);
      }
    });
  }, [buildMusicianMarker, buildClusterMarker]);

  // Filter musicians, build supercluster index, and render
  useEffect(() => {
    if (!map.current || musicians.length === 0) return;

    const filteredMusicians = musicians.filter((musician) => {
      if (blockedIds.has(musician.id)) return false;
      if (filters?.searchQuery && filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase().trim();
        if (!musician.username.toLowerCase().includes(query)) return false;
      }
      if (filters?.city && filters.city.trim()) {
        const cityQuery = filters.city.toLowerCase().trim();
        const musicianCity = musician.city?.toLowerCase() || '';
        const musicianCountry = musician.country?.toLowerCase() || '';
        if (!musicianCity.includes(cityQuery) && !musicianCountry.includes(cityQuery)) return false;
      }
      if (filters?.favoritesOnly && !isFavorite(musician.id)) return false;
      if (filters?.instrument && musician.instrument !== filters.instrument) return false;
      if (filters?.skillLevel && musician.skill_level !== filters.skillLevel) return false;
      if (filters?.gender && musician.gender !== filters.gender) return false;
      if (filters?.maxDistance && filters.maxDistance > 0 && userLocation) {
        const distance = calculateDistance(
          userLocation.lat, userLocation.lng, musician.latitude, musician.longitude
        );
        if (distance > filters.maxDistance) return false;
      }
      if (filters?.availabilityDate && busyMusicianIds.has(musician.id)) return false;
      return true;
    });

    filteredRef.current = filteredMusicians;
    onFilteredCountChange?.(filteredMusicians.length);

    const compatibleIds = new Set<string>();
    filteredMusicians.forEach((m) => { if (isCompatibleMatch(m)) compatibleIds.add(m.id); });
    onMusiciansChange?.(filteredMusicians, compatibleIds);

    // Build supercluster index
    const index = new Supercluster({
      radius: 60,
      maxZoom: 16,
      minPoints: 2,
    });
    index.load(
      filteredMusicians.map((m) => ({
        type: 'Feature' as const,
        properties: { musicianId: m.id },
        geometry: {
          type: 'Point' as const,
          coordinates: [approximateCoord(m.longitude), approximateCoord(m.latitude)],
        },
      }))
    );
    clusterRef.current = index;

    renderClusters();

    // Auto-fit map to visible markers
    if (filteredMusicians.length > 0 && map.current) {
      const bounds = new mapboxgl.LngLatBounds();
      filteredMusicians.forEach((m) => {
        bounds.extend([approximateCoord(m.longitude), approximateCoord(m.latitude)]);
      });
      if (userLocation) bounds.extend([userLocation.lng, userLocation.lat]);
      try {
        map.current.fitBounds(bounds, { padding: 80, maxZoom: 12, duration: 800 });
      } catch (_) { /* single point */ }
    }
  }, [musicians, filters, isCompatibleMatch, isFavorite, userLocation, blockedIds, busyMusicianIds, onFilteredCountChange, onMusiciansChange, renderClusters]);

  // Re-render clusters on map move / zoom
  useEffect(() => {
    if (!map.current) return;
    const m = map.current;
    const handler = () => renderClusters();
    m.on('moveend', handler);
    m.on('zoomend', handler);
    return () => {
      m.off('moveend', handler);
      m.off('zoomend', handler);
    };
  }, [renderClusters]);


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
