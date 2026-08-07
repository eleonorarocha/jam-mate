import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, Music, MapPin, User, ChevronRight, ChevronLeft, Loader2, CheckCircle, Disc3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AvatarCropper from '@/components/AvatarCropper';
import GenreSelector from '@/components/GenreSelector';

const STEPS = [
  { id: 'photo', title: 'Foto de Perfil', subtitle: 'Adicione uma foto para que outros músicos o reconheçam', icon: Camera },
  { id: 'music', title: 'Perfil Musical', subtitle: 'Diga-nos que instrumento toca e o seu nível', icon: Music },
  { id: 'genres', title: 'Géneros Musicais', subtitle: 'Escolha os estilos que toca ou gosta de tocar', icon: Disc3 },
  { id: 'location', title: 'Localização', subtitle: 'Para encontrar músicos perto de si', icon: MapPin },
  { id: 'bio', title: 'Sobre Si', subtitle: 'Conte um pouco sobre si e o seu estilo', icon: User },
];

const Onboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [cropperImage, setCropperImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    avatar_url: null as string | null,
    instrument: '',
    skill_level: 'beginner' as 'beginner' | 'intermediate' | 'advanced' | 'professional',
    city: '',
    country: '',
    bio: '',
    gender: '' as 'male' | 'female' | '',
    genres: [] as string[],
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Ficheiro inválido', description: 'Selecione uma imagem.', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Ficheiro grande', description: 'Máximo 5MB.', variant: 'destructive' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setCropperImage(reader.result as string);
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCroppedAvatar = async (croppedBlob: Blob) => {
    if (!user) return;
    setCropperImage(null);
    setUploadingAvatar(true);
    try {
      const filePath = `${user.id}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, croppedBlob, { upsert: true, contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      setForm(prev => ({ ...prev, avatar_url: avatarUrl }));

      await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', user.id);
      toast({ title: 'Foto carregada!' });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleFinish = async () => {
    if (!user) return;
    if (!form.instrument.trim()) {
      toast({ title: 'Instrumento obrigatório', description: 'Indique o seu instrumento principal.', variant: 'destructive' });
      setStep(1);
      return;
    }
    if (!form.gender) {
      toast({ title: 'Género obrigatório', description: 'Selecione o seu género.', variant: 'destructive' });
      setStep(1);
      return;
    }

    if (form.genres.length === 0) {
      toast({ title: 'Género musical obrigatório', description: 'Selecione pelo menos um género musical.', variant: 'destructive' });
      setStep(2);
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({
        instrument: form.instrument,
        skill_level: form.skill_level,
        city: form.city,
        country: form.country,
        bio: form.bio,
        gender: form.gender || null,
        genres: form.genres,
        onboarding_completed: true,
      }).eq('id', user.id);

      if (error) throw error;
      toast({ title: 'Perfil completo!', description: 'Bem-vindo ao JamMate!' });
      navigate('/');
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const next = () => {
    if (step === 2 && form.genres.length === 0) {
      toast({ title: 'Género musical obrigatório', description: 'Selecione pelo menos um género musical.', variant: 'destructive' });
      return;
    }
    setStep(s => Math.min(s + 1, STEPS.length - 1));
  };
  const prev = () => setStep(s => Math.max(s - 1, 0));
  const isLast = step === STEPS.length - 1;

  const initials = user?.user_metadata?.first_name?.[0]?.toUpperCase() || '?';

  const stepContent = () => {
    switch (step) {
      case 0:
        return (
          <div className="flex flex-col items-center gap-6">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground text-4xl font-bold shadow-lg ring-4 ring-background overflow-hidden">
                {uploadingAvatar ? (
                  <Loader2 className="w-10 h-10 animate-spin" />
                ) : form.avatar_url ? (
                  <img src={form.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
              <AvatarCropper
                imageSrc={cropperImage || ''}
                open={!!cropperImage}
                onClose={() => setCropperImage(null)}
                onCropComplete={handleCroppedAvatar}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute bottom-1 right-1 w-10 h-10 rounded-full bg-card border-2 border-border flex items-center justify-center shadow-md hover:bg-muted transition-colors disabled:opacity-50"
              >
                <Camera className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              Uma boa foto ajuda outros músicos a reconhecê-lo. Pode adicionar mais tarde se preferir.
            </p>
          </div>
        );
      case 1:
        return (
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Instrumento Principal *</Label>
              <Input
                value={form.instrument}
                onChange={e => setForm(prev => ({ ...prev, instrument: e.target.value }))}
                placeholder="Guitarra, Piano, Bateria, Voz..."
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Nível *</Label>
              <Select value={form.skill_level} onValueChange={(v: any) => setForm(prev => ({ ...prev, skill_level: v }))}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Iniciante</SelectItem>
                  <SelectItem value="intermediate">Intermediário</SelectItem>
                  <SelectItem value="advanced">Avançado</SelectItem>
                  <SelectItem value="professional">Profissional</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Género *</Label>
              <Select value={form.gender} onValueChange={(v: 'male' | 'female') => setForm(prev => ({ ...prev, gender: v }))}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Masculino</SelectItem>
                  <SelectItem value="female">Feminino</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <GenreSelector
              value={form.genres}
              onChange={(genres) => setForm(prev => ({ ...prev, genres }))}
            />
            <p className="text-xs text-muted-foreground">
              Selecione pelo menos um género. Pode alterar mais tarde no seu perfil.
            </p>
          </div>
        );
      case 3:
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Cidade</Label>
                <Input
                  value={form.city}
                  onChange={e => setForm(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="Lisboa"
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">País</Label>
                <Input
                  value={form.country}
                  onChange={e => setForm(prev => ({ ...prev, country: e.target.value }))}
                  placeholder="Portugal"
                  className="h-11"
                />
              </div>
            </div>
            <div className="p-3 rounded-lg bg-secondary/50 border border-border">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Privacidade:</strong> A sua localização aproximada é mostrada no mapa. O local exato do encontro é combinado após confirmação mútua.
              </p>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Bio</Label>
              <Textarea
                value={form.bio}
                onChange={e => setForm(prev => ({ ...prev, bio: e.target.value }))}
                placeholder="Conte um pouco sobre si, o seu estilo musical, o que procura numa jam session..."
                rows={5}
                className="resize-none"
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const CurrentIcon = STEPS[step].icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <button
                onClick={() => setStep(i)}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                  i === step
                    ? 'bg-primary text-primary-foreground shadow-lg scale-110'
                    : i < step
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {i < step ? <CheckCircle className="w-5 h-5" /> : i + 1}
              </button>
              {i < STEPS.length - 1 && (
                <div className={`w-8 h-0.5 rounded-full transition-colors ${i < step ? 'bg-primary' : 'bg-border'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="p-6 pb-4 text-center border-b border-border">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <CurrentIcon className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">{STEPS[step].title}</h2>
            <p className="text-sm text-muted-foreground mt-1">{STEPS[step].subtitle}</p>
          </div>

          {/* Content */}
          <div className="p-6 min-h-[240px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.3 }}
              >
                {stepContent()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="p-6 pt-4 border-t border-border flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={prev}
              disabled={step === 0}
              className="gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </Button>

            {isLast ? (
              <Button
                onClick={handleFinish}
                disabled={saving}
                className="gap-1 bg-gradient-to-r from-primary to-[hsl(var(--primary-glow))] hover:opacity-90 transition-opacity font-semibold"
                style={{ boxShadow: 'var(--shadow-primary)' }}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Começar
                    <CheckCircle className="w-4 h-4" />
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={next} className="gap-1">
                Seguinte
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Skip for photo/bio steps */}
        {(step === 0 || step === 4) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center mt-4"
          >
            <button
              onClick={next}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {step === 0 ? 'Saltar foto por agora →' : ''}
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default Onboarding;
