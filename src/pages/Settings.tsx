import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Key, Bell, Shield, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Header';
import PartnerPreferences from '@/components/PartnerPreferences';
import BlockedUsersList from '@/components/BlockedUsersList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

const Settings = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mapboxToken, setMapboxToken] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const savedToken = localStorage.getItem('mapbox_token');
    if (savedToken) {
      setMapboxToken(savedToken);
    }
  }, []);

  const handleSaveMapboxToken = () => {
    localStorage.setItem('mapbox_token', mapboxToken);
    toast({
      title: 'Token guardado!',
      description: 'O token do Mapbox foi atualizado.',
    });
  };

  const handleClearMapboxToken = () => {
    localStorage.removeItem('mapbox_token');
    setMapboxToken('');
    toast({
      title: 'Token removido',
      description: 'O token do Mapbox foi removido.',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 pt-24 pb-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Configurações</h1>
            <p className="text-muted-foreground">
              Gerencie as configurações da sua conta
            </p>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Mapbox Token
                </CardTitle>
                <CardDescription>
                  Configure o seu token público do Mapbox para visualizar o mapa
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="mapbox">Token Público</Label>
                  <Input
                    id="mapbox"
                    type="text"
                    placeholder="pk.eyJ1Ijoi..."
                    value={mapboxToken}
                    onChange={(e) => setMapboxToken(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveMapboxToken}>Guardar</Button>
                  <Button variant="outline" onClick={handleClearMapboxToken}>
                    Limpar
                  </Button>
                </div>
              </CardContent>
            </Card>

            <PartnerPreferences userId={user.id} />

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notificações
                </CardTitle>
                <CardDescription>
                  Configure as suas preferências de notificação
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Novas mensagens</Label>
                    <p className="text-sm text-muted-foreground">
                      Receber notificações de novas mensagens
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Pedidos de jam</Label>
                    <p className="text-sm text-muted-foreground">
                      Receber notificações de novos pedidos
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Lembretes</Label>
                    <p className="text-sm text-muted-foreground">
                      Receber lembretes de jam sessions
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Privacidade
                </CardTitle>
                <CardDescription>
                  Configure as suas preferências de privacidade
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Mostrar localização aproximada</Label>
                    <p className="text-sm text-muted-foreground">
                      Mostrar a sua localização no mapa para outros utilizadores
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Perfil público</Label>
                    <p className="text-sm text-muted-foreground">
                      Permitir que outros utilizadores vejam o seu perfil
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            <BlockedUsersList />

            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <Trash2 className="h-5 w-5" />
                  Zona Perigosa
                </CardTitle>
                <CardDescription>
                  Ações irreversíveis da conta
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="destructive">Eliminar Conta</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;
