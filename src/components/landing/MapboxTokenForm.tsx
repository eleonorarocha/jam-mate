import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import { MapPin, ExternalLink } from 'lucide-react';

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
    toast({ title: 'Token guardado!', description: 'Pode agora ver o mapa.' });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-24 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-5 bg-card p-8 rounded-xl border border-border shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-bold">Configure o Mapbox</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Para visualizar o mapa, precisa de um token público do Mapbox.
            Pode obtê-lo em{' '}
            <a
              href="https://mapbox.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              mapbox.com <ExternalLink className="w-3 h-3" />
            </a>
          </p>
          <div className="space-y-3">
            <Input
              type="text"
              placeholder="Cole aqui o seu token público (pk.…)"
              value={mapboxToken}
              onChange={(e) => setMapboxToken(e.target.value)}
              className="h-11"
            />
            <Button
              onClick={handleSaveToken}
              className="w-full h-11 font-semibold bg-gradient-to-r from-primary to-[hsl(var(--primary-glow))] hover:opacity-90 transition-opacity"
              style={{ boxShadow: 'var(--shadow-primary)' }}
            >
              Guardar Token
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapboxTokenForm;
