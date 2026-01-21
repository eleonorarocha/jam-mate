import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import MapComponent from '@/components/MapComponent';
import MapFilters, { MapFiltersState } from '@/components/MapFilters';
import Header from '@/components/Header';

const Map = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [mapboxToken, setMapboxToken] = useState('');
  const [tokenSaved, setTokenSaved] = useState(false);
  const [filters, setFilters] = useState<MapFiltersState>({
    instrument: '',
    skillLevel: '',
    gender: '',
    maxDistance: 0,
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const handleSaveToken = () => {
    if (mapboxToken.trim()) {
      localStorage.setItem('mapbox_token', mapboxToken);
      setTokenSaved(true);
      toast({
        title: 'Token guardado!',
        description: 'Pode agora ver o mapa.',
      });
    }
  };

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
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-24 flex items-center justify-center p-4">
          <div className="max-w-md w-full space-y-4 bg-card p-6 rounded-lg border">
            <div>
              <h2 className="text-2xl font-bold mb-2">Configure o Mapbox</h2>
              <p className="text-muted-foreground mb-4">
                Para visualizar o mapa, precisa de um token público do Mapbox.
                Pode obtê-lo em{' '}
                <a
                  href="https://mapbox.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  mapbox.com
                </a>
              </p>
            </div>
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="Cole aqui o seu token público do Mapbox"
                value={mapboxToken}
                onChange={(e) => setMapboxToken(e.target.value)}
              />
              <Button onClick={handleSaveToken} className="w-full">
                Guardar Token
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen">
      <Header />
      <div className="pt-16 h-full relative">
        <MapComponent token={savedToken || mapboxToken} filters={filters} />
        
        {/* Filter button positioned on map */}
        <div className="absolute top-4 left-4 z-10">
          <MapFilters filters={filters} onFiltersChange={setFilters} />
        </div>
      </div>
    </div>
  );
};

export default Map;
