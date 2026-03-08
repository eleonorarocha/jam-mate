import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Key, Bell, Shield, Trash2, Settings as SettingsIcon, Mail, Lock } from 'lucide-react';
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
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

const Settings = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mapboxToken, setMapboxToken] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    const savedToken = localStorage.getItem('mapbox_token');
    if (savedToken) setMapboxToken(savedToken);
  }, []);

  const handleSaveMapboxToken = () => {
    localStorage.setItem('mapbox_token', mapboxToken);
    toast({ title: 'Token guardado!', description: 'O token do Mapbox foi atualizado.' });
  };

  const handleClearMapboxToken = () => {
    localStorage.removeItem('mapbox_token');
    setMapboxToken('');
    toast({ title: 'Token removido', description: 'O token do Mapbox foi removido.' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const } },
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 pt-24 pb-8">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-8"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-medium mb-3">
              <SettingsIcon className="w-3 h-3" />
              Definições
            </div>
            <h1 className="text-3xl font-bold">Configurações</h1>
            <p className="text-muted-foreground text-sm mt-1">Gerencie as configurações da sua conta</p>
          </motion.div>

          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Key className="h-4 w-4 text-primary" />
                    </div>
                    Mapbox Token
                  </CardTitle>
                  <CardDescription>Configure o seu token público do Mapbox para visualizar o mapa</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="mapbox">Token Público</Label>
                    <Input id="mapbox" type="text" placeholder="pk.eyJ1Ijoi..." value={mapboxToken} onChange={(e) => setMapboxToken(e.target.value)} />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSaveMapboxToken}>Guardar</Button>
                    <Button variant="outline" onClick={handleClearMapboxToken}>Limpar</Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <PartnerPreferences userId={user.id} />
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
                      <Bell className="h-4 w-4 text-accent" />
                    </div>
                    Notificações
                  </CardTitle>
                  <CardDescription>Configure as suas preferências de notificação</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: 'Novas mensagens', desc: 'Receber notificações de novas mensagens' },
                    { label: 'Pedidos de jam', desc: 'Receber notificações de novos pedidos' },
                    { label: 'Lembretes', desc: 'Receber lembretes de jam sessions' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>{item.label}</Label>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Shield className="h-4 w-4 text-primary" />
                    </div>
                    Privacidade
                  </CardTitle>
                  <CardDescription>Configure as suas preferências de privacidade</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: 'Mostrar localização aproximada', desc: 'Mostrar a sua localização no mapa para outros utilizadores' },
                    { label: 'Perfil público', desc: 'Permitir que outros utilizadores vejam o seu perfil' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>{item.label}</Label>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <BlockedUsersList />
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="border-destructive/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <Trash2 className="h-5 w-5" />
                    Zona Perigosa
                  </CardTitle>
                  <CardDescription>Ações irreversíveis da conta</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="destructive">Eliminar Conta</Button>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default Settings;
