import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import MapComponent from '@/components/MapComponent';
import MapFilters, { MapFiltersState } from '@/components/MapFilters';
import Header from '@/components/Header';
import MapboxTokenForm from '@/components/landing/MapboxTokenForm';

const Map = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [tokenSaved, setTokenSaved] = useState(false);
  const [filters, setFilters] = useState<MapFiltersState>({
    instrument: '',
    skillLevel: '',
    gender: '',
    maxDistance: 0,
    favoritesOnly: false,
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

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
    <div className="relative w-full h-screen">
      <Header />
      <div className="pt-16 h-full relative">
        <MapComponent token={savedToken || ''} filters={filters} />
        <div className="absolute top-4 left-4 z-10">
          <MapFilters filters={filters} onFiltersChange={setFilters} />
        </div>
      </div>
    </div>
  );
};

export default Map;
