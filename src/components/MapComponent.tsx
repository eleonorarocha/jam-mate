import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import MusicianPopup from './MusicianPopup';

interface MapComponentProps {
  token: string;
}

const MapComponent = ({ token }: MapComponentProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [selectedMusician, setSelectedMusician] = useState<any>(null);

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
  }, [token]);

  const loadMusicians = async () => {
    // Only fetch minimal public fields for the map popup
    const { data: musicians } = await supabase
      .from('profiles')
      .select('id, username, instrument, city, country, latitude, longitude, average_rating, total_ratings, avatar_url')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (musicians && map.current) {
      musicians.forEach((musician) => {
        const el = document.createElement('div');
        el.className = 'musician-marker';
        el.style.backgroundImage = musician.avatar_url
          ? `url(${musician.avatar_url})`
          : '';
        el.style.width = '40px';
        el.style.height = '40px';
        el.style.borderRadius = '50%';
        el.style.cursor = 'pointer';
        el.style.backgroundColor = 'hsl(var(--primary))';
        el.style.border = '3px solid white';
        el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
        el.style.backgroundSize = 'cover';
        el.style.backgroundPosition = 'center';

        el.addEventListener('click', () => {
          setSelectedMusician(musician);
        });

        new mapboxgl.Marker(el)
          .setLngLat([musician.longitude, musician.latitude])
          .addTo(map.current!);
      });
    }
  };

  return (
    <>
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
