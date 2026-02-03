import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface ProfilePanelProps {
  onClose: () => void;
  embedded?: boolean;
}

const ProfilePanel = ({ onClose, embedded = false }: ProfilePanelProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    username: '',
    first_name: '',
    last_name: '',
    bio: '',
    instrument: '',
    skill_level: 'beginner' as 'beginner' | 'intermediate' | 'advanced' | 'professional',
    city: '',
    country: '',
    phone: '',
    phone_verified: false,
    email_verified: false,
    gender: '' as 'male' | 'female' | '',
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
      setProfile({
        username: data.username || '',
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        bio: data.bio || '',
        instrument: data.instrument || '',
        skill_level: data.skill_level || 'beginner',
        city: data.city || '',
        country: data.country || '',
        phone: data.phone || '',
        phone_verified: data.phone_verified || false,
        email_verified: data.email_verified || false,
        gender: data.gender || '',
      });
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    // Validate required fields
    if (!profile.first_name.trim() || !profile.last_name.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Por favor, preencha o nome e sobrenome.',
        variant: 'destructive',
      });
      return;
    }

    if (!profile.phone.trim()) {
      toast({
        title: 'Telefone obrigatório',
        description: 'O número de telefone é obrigatório para segurança.',
        variant: 'destructive',
      });
      return;
    }

    if (!profile.gender) {
      toast({
        title: 'Género obrigatório',
        description: 'Por favor, selecione o seu género.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: profile.username,
          first_name: profile.first_name,
          last_name: profile.last_name,
          bio: profile.bio,
          instrument: profile.instrument,
          skill_level: profile.skill_level,
          city: profile.city,
          country: profile.country,
          phone: profile.phone,
          gender: profile.gender || null,
        })
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

  const VerificationBadge = ({ verified, label }: { verified: boolean; label: string }) => (
    <div className={`flex items-center gap-1 text-xs ${verified ? 'text-green-600' : 'text-muted-foreground'}`}>
      {verified ? (
        <CheckCircle className="h-3 w-3" />
      ) : (
        <AlertCircle className="h-3 w-3" />
      )}
      {verified ? `${label} verificado` : `${label} não verificado`}
    </div>
  );

  const formContent = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first_name">Nome *</Label>
          <Input
            id="first_name"
            value={profile.first_name}
            onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
            placeholder="João"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last_name">Sobrenome *</Label>
          <Input
            id="last_name"
            value={profile.last_name}
            onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
            placeholder="Silva"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="username">Nome de Utilizador</Label>
        <Input
          id="username"
          value={profile.username}
          onChange={(e) => setProfile({ ...profile, username: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Telefone *</Label>
        <Input
          id="phone"
          type="tel"
          value={profile.phone}
          onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
          placeholder="+351 912 345 678"
          required
        />
        <VerificationBadge verified={profile.phone_verified} label="Telefone" />
        <p className="text-xs text-muted-foreground">
          Obrigatório para segurança da comunidade
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="instrument">Instrumento</Label>
        <Input
          id="instrument"
          value={profile.instrument}
          onChange={(e) => setProfile({ ...profile, instrument: e.target.value })}
          placeholder="Guitarra, Piano, Bateria..."
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
        <Label htmlFor="gender">Género *</Label>
        <Select
          value={profile.gender}
          onValueChange={(value: 'male' | 'female') => 
            setProfile({ ...profile, gender: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o género" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="male">Masculino</SelectItem>
            <SelectItem value="female">Feminino</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          value={profile.bio}
          onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
          rows={3}
          placeholder="Conte um pouco sobre si e o seu estilo musical..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">Cidade</Label>
          <Input
            id="city"
            value={profile.city}
            onChange={(e) => setProfile({ ...profile, city: e.target.value })}
            placeholder="Lisboa"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="country">País</Label>
          <Input
            id="country"
            value={profile.country}
            onChange={(e) => setProfile({ ...profile, country: e.target.value })}
            placeholder="Portugal"
          />
        </div>
      </div>

      <div className="p-3 bg-muted rounded-lg">
        <p className="text-xs text-muted-foreground">
          <strong>Nota de Privacidade:</strong> A sua localização aproximada é mostrada no mapa para outros músicos encontrarem-no. O local exato do encontro é combinado entre os participantes após confirmação mútua.
        </p>
      </div>

      <Button onClick={handleSave} disabled={loading} className="w-full">
        {loading ? 'A guardar...' : 'Guardar Alterações'}
      </Button>
    </div>
  );

  if (embedded) {
    return (
      <Card>
        <CardContent className="p-6">
          {formContent}
        </CardContent>
      </Card>
    );
  }

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
        <CardContent className="p-6">
          {formContent}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfilePanel;