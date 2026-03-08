import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';

interface MapboxTokenFormProps {
  onTokenSaved: (token: string) => void;
}

const MapboxTokenForm = ({ onTokenSaved }: MapboxTokenFormProps) => {
  const [mapboxToken, setMapboxToken] = useState('');
  const { toast } = useToast();

  const handleSaveToken = () => {
    const trimmed = mapboxToken.trim();
    if (!trimmed.startsWith('pk.')) {
      toast({
        title: 'Token inválido',
        description: 'O token público do Mapbox deve começar por "pk."',
        variant: 'destructive',
      });
      return;
    }
    localStorage.setItem('mapbox_token', trimmed);
    onTokenSaved(trimmed);
    toast({
      title: 'Token guardado!',
      description: 'Pode agora ver o mapa.',
    });
  };

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
              placeholder="Cole aqui o seu token público do Mapbox (pk.…)"
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
};

export default MapboxTokenForm;
