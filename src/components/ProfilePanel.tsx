import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface ProfilePanelProps {
  onClose: () => void;
}

const ProfilePanel = ({ onClose }: ProfilePanelProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    username: '',
    full_name: '',
    bio: '',
    instrument: '',
    skill_level: 'beginner' as 'beginner' | 'intermediate' | 'advanced' | 'professional',
    city: '',
    country: '',
    exact_address: '',
    postal_code: '',
  });

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (data) {
      setProfile(data);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update(profile)
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'Perfil atualizado!',
        description: 'As suas alterações foram guardadas.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute top-0 right-0 h-full w-full max-w-md bg-background shadow-2xl z-30 overflow-y-auto">
      <Card className="border-0 rounded-none">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle>Meu Perfil</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Nome de Utilizador</Label>
            <Input
              id="username"
              value={profile.username}
              onChange={(e) => setProfile({ ...profile, username: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">Nome Completo</Label>
            <Input
              id="full_name"
              value={profile.full_name || ''}
              onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="instrument">Instrumento</Label>
            <Input
              id="instrument"
              value={profile.instrument}
              onChange={(e) => setProfile({ ...profile, instrument: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="skill_level">Nível</Label>
            <Select
              value={profile.skill_level}
              onValueChange={(value: 'beginner' | 'intermediate' | 'advanced' | 'professional') => 
                setProfile({ ...profile, skill_level: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Iniciante</SelectItem>
                <SelectItem value="intermediate">Intermediário</SelectItem>
                <SelectItem value="advanced">Avançado</SelectItem>
                <SelectItem value="professional">Profissional</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={profile.bio || ''}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">Cidade</Label>
            <Input
              id="city"
              value={profile.city || ''}
              onChange={(e) => setProfile({ ...profile, city: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">País</Label>
            <Input
              id="country"
              value={profile.country || ''}
              onChange={(e) => setProfile({ ...profile, country: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="exact_address">Morada Completa</Label>
            <Input
              id="exact_address"
              value={profile.exact_address || ''}
              onChange={(e) => setProfile({ ...profile, exact_address: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Apenas visível após agendamento aceite
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="postal_code">Código Postal</Label>
            <Input
              id="postal_code"
              value={profile.postal_code || ''}
              onChange={(e) => setProfile({ ...profile, postal_code: e.target.value })}
            />
          </div>

          <Button onClick={handleSave} disabled={loading} className="w-full">
            {loading ? 'A guardar...' : 'Guardar Alterações'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfilePanel;
