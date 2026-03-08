import { useEffect, useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, CheckCircle, AlertCircle, Camera, Music, MapPin, Shield, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

interface ProfilePanelProps {
  onClose: () => void;
  embedded?: boolean;
}

const ProfilePanel = ({ onClose, embedded = false }: ProfilePanelProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    avatar_url: '' as string | null,
  });

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
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
        avatar_url: data.avatar_url || null,
      });
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (!profile.first_name.trim() || !profile.last_name.trim()) {
      toast({ title: 'Campos obrigatórios', description: 'Por favor, preencha o nome e sobrenome.', variant: 'destructive' });
      return;
    }
    if (!profile.phone.trim()) {
      toast({ title: 'Telefone obrigatório', description: 'O número de telefone é obrigatório para segurança.', variant: 'destructive' });
      return;
    }
    if (!profile.gender) {
      toast({ title: 'Género obrigatório', description: 'Por favor, selecione o seu género.', variant: 'destructive' });
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
      toast({ title: 'Perfil atualizado!', description: 'As suas alterações foram guardadas.' });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const VerificationBadge = ({ verified, label }: { verified: boolean; label: string }) => (
    <div className={`flex items-center gap-1.5 text-xs font-medium ${verified ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
      {verified ? <CheckCircle className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
      {verified ? `${label} verificado` : `${label} não verificado`}
    </div>
  );

  const initials = `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase() || '?';

  const skillLabels: Record<string, string> = {
    beginner: 'Iniciante',
    intermediate: 'Intermediário',
    advanced: 'Avançado',
    professional: 'Profissional',
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const } },
  };

  const formContent = (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* Avatar & Name Header */}
      <motion.div variants={itemVariants} className="flex flex-col items-center text-center pb-2">
        <div className="relative group mb-4">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground text-2xl font-bold shadow-lg ring-4 ring-background">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full rounded-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-card border-2 border-border flex items-center justify-center shadow-md hover:bg-muted transition-colors">
            <Camera className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
        <div className="space-y-1">
          <p className="text-lg font-semibold text-foreground">
            {profile.first_name || profile.last_name ? `${profile.first_name} ${profile.last_name}` : 'Novo Músico'}
          </p>
          {profile.instrument && (
            <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
              <Music className="w-3.5 h-3.5 text-accent" />
              <span>{profile.instrument}</span>
              <span className="text-border">·</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium">
                {skillLabels[profile.skill_level]}
              </span>
            </div>
          )}
          {(profile.city || profile.country) && (
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3" />
              <span>{[profile.city, profile.country].filter(Boolean).join(', ')}</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Personal Info Section */}
      <motion.div variants={itemVariants}>
        <SectionTitle icon={<Shield className="w-4 h-4" />} title="Informações Pessoais" />
        <div className="space-y-4 mt-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="first_name" className="text-xs font-medium">Nome *</Label>
              <Input id="first_name" value={profile.first_name} onChange={(e) => setProfile({ ...profile, first_name: e.target.value })} placeholder="João" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="last_name" className="text-xs font-medium">Sobrenome *</Label>
              <Input id="last_name" value={profile.last_name} onChange={(e) => setProfile({ ...profile, last_name: e.target.value })} placeholder="Silva" className="h-9" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="username" className="text-xs font-medium">Nome de Utilizador</Label>
            <Input id="username" value={profile.username} onChange={(e) => setProfile({ ...profile, username: e.target.value })} className="h-9" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="gender" className="text-xs font-medium">Género *</Label>
            <Select value={profile.gender} onValueChange={(value: 'male' | 'female') => setProfile({ ...profile, gender: value })}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Masculino</SelectItem>
                <SelectItem value="female">Feminino</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-xs font-medium">Telefone *</Label>
            <Input id="phone" type="tel" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="+351 912 345 678" className="h-9" />
            <div className="flex items-center gap-3">
              <VerificationBadge verified={profile.phone_verified} label="Telefone" />
              <VerificationBadge verified={profile.email_verified} label="Email" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Musical Info Section */}
      <motion.div variants={itemVariants}>
        <SectionTitle icon={<Music className="w-4 h-4" />} title="Perfil Musical" />
        <div className="space-y-4 mt-3">
          <div className="space-y-1.5">
            <Label htmlFor="instrument" className="text-xs font-medium">Instrumento</Label>
            <Input id="instrument" value={profile.instrument} onChange={(e) => setProfile({ ...profile, instrument: e.target.value })} placeholder="Guitarra, Piano, Bateria..." className="h-9" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="skill_level" className="text-xs font-medium">Nível</Label>
            <Select
              value={profile.skill_level}
              onValueChange={(value: 'beginner' | 'intermediate' | 'advanced' | 'professional') => setProfile({ ...profile, skill_level: value })}
            >
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Iniciante</SelectItem>
                <SelectItem value="intermediate">Intermediário</SelectItem>
                <SelectItem value="advanced">Avançado</SelectItem>
                <SelectItem value="professional">Profissional</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bio" className="text-xs font-medium">Bio</Label>
            <Textarea id="bio" value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} rows={3} placeholder="Conte um pouco sobre si e o seu estilo musical..." className="resize-none" />
          </div>
        </div>
      </motion.div>

      {/* Location Section */}
      <motion.div variants={itemVariants}>
        <SectionTitle icon={<MapPin className="w-4 h-4" />} title="Localização" />
        <div className="space-y-4 mt-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="city" className="text-xs font-medium">Cidade</Label>
              <Input id="city" value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} placeholder="Lisboa" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="country" className="text-xs font-medium">País</Label>
              <Input id="country" value={profile.country} onChange={(e) => setProfile({ ...profile, country: e.target.value })} placeholder="Portugal" className="h-9" />
            </div>
          </div>

          <div className="p-3 rounded-lg bg-secondary/50 border border-border">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Privacidade:</strong> A sua localização aproximada é mostrada no mapa. O local exato do encontro é combinado após confirmação mútua.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Save Button */}
      <motion.div variants={itemVariants}>
        <Button
          onClick={handleSave}
          disabled={loading}
          className="w-full h-11 font-semibold text-sm bg-gradient-to-r from-primary to-[hsl(var(--primary-glow))] hover:opacity-90 transition-opacity shadow-lg"
          style={{ boxShadow: 'var(--shadow-primary)' }}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              A guardar...
            </span>
          ) : (
            'Guardar Alterações'
          )}
        </Button>
      </motion.div>
    </motion.div>
  );

  if (embedded) {
    return formContent;
  }

  return (
    <div className="absolute top-0 right-0 h-full w-full max-w-md bg-background shadow-2xl z-30 overflow-y-auto">
      <Card className="border-0 rounded-none">
        <div className="border-b p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Meu Perfil</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <CardContent className="p-6">
          {formContent}
        </CardContent>
      </Card>
    </div>
  );
};

const SectionTitle = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
  <div className="flex items-center gap-2 pb-2 border-b border-border">
    <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center text-primary">
      {icon}
    </div>
    <h3 className="text-sm font-semibold text-foreground">{title}</h3>
  </div>
);

export default ProfilePanel;
