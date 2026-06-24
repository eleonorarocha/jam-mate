import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Music2, Upload, Trash2, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const MAX_SECONDS = 30;
const MAX_BYTES = 2 * 1024 * 1024; // 2MB cap as safety net (30s @ 128kbps ≈ 0.5MB)
const ACCEPTED = 'audio/mpeg,audio/mp3,audio/mp4,audio/aac,audio/x-m4a,audio/wav,audio/webm,audio/ogg';

interface Snippet {
  id: string;
  title: string;
  audio_url: string;
  storage_path: string;
  duration_seconds: number;
}

const MusicSnippetSection = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [snippet, setSnippet] = useState<Snippet | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) loadSnippet();
  }, [user]);

  const loadSnippet = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('music_snippets')
      .select('id, title, audio_url, storage_path, duration_seconds')
      .eq('user_id', user.id)
      .maybeSingle();
    setSnippet(data);
    if (data) {
      setTitle(data.title);
      const { data: s } = await supabase.storage
        .from('music-snippets')
        .createSignedUrl(data.storage_path, 60 * 60);
      setSignedUrl(s?.signedUrl ?? null);
    }
  };

  const probeDuration = (file: File): Promise<number> =>
    new Promise((resolve, reject) => {
      const audio = document.createElement('audio');
      audio.preload = 'metadata';
      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(audio.src);
        resolve(audio.duration);
      };
      audio.onerror = () => reject(new Error('Não foi possível ler o ficheiro de áudio.'));
      audio.src = URL.createObjectURL(file);
    });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!title.trim()) {
      toast({ title: 'Adiciona um título', description: 'Dá um nome ao teu snippet antes de fazer upload.', variant: 'destructive' });
      if (fileRef.current) fileRef.current.value = '';
      return;
    }

    if (file.size > MAX_BYTES) {
      toast({ title: 'Ficheiro muito grande', description: 'O máximo é ~2MB. Tenta um MP3 a 128kbps.', variant: 'destructive' });
      if (fileRef.current) fileRef.current.value = '';
      return;
    }

    setLoading(true);
    try {
      const duration = await probeDuration(file);
      if (duration > MAX_SECONDS + 0.5) {
        toast({ title: 'Demasiado longo', description: `O snippet grátis tem no máximo ${MAX_SECONDS}s. Este tem ${Math.round(duration)}s.`, variant: 'destructive' });
        setLoading(false);
        return;
      }

      // delete previous if exists
      if (snippet) {
        await supabase.storage.from('music-snippets').remove([snippet.storage_path]);
        await supabase.from('music_snippets').delete().eq('id', snippet.id);
      }

      const ext = file.name.split('.').pop()?.toLowerCase() || 'mp3';
      const path = `${user.id}/snippet-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('music-snippets')
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from('music-snippets').getPublicUrl(path);

      const { data: inserted, error: insErr } = await supabase
        .from('music_snippets')
        .insert({
          user_id: user.id,
          title: title.trim(),
          audio_url: pub.publicUrl,
          storage_path: path,
          duration_seconds: Math.min(duration, MAX_SECONDS),
        })
        .select('id, title, audio_url, storage_path, duration_seconds')
        .single();
      if (insErr) throw insErr;

      setSnippet(inserted);
      const { data: s } = await supabase.storage.from('music-snippets').createSignedUrl(path, 60 * 60);
      setSignedUrl(s?.signedUrl ?? null);
      toast({ title: 'Snippet publicado!', description: 'Já está disponível no teu perfil público.' });
    } catch (err: any) {
      toast({ title: 'Erro no upload', description: err.message || 'Tenta novamente.', variant: 'destructive' });
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    if (!snippet || !user) return;
    setLoading(true);
    try {
      await supabase.storage.from('music-snippets').remove([snippet.storage_path]);
      await supabase.from('music_snippets').delete().eq('id', snippet.id);
      setSnippet(null);
      setSignedUrl(null);
      setTitle('');
      toast({ title: 'Snippet removido' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 flex items-start gap-2">
        <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          Partilha um excerto da tua música (até <strong className="text-foreground">{MAX_SECONDS}s</strong>) para que outros músicos possam ouvir o teu som antes de te contactarem. <span className="text-foreground">Plano grátis: 1 snippet.</span>
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="snippet-title" className="text-sm">Título</Label>
        <Input
          id="snippet-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: Solo de improviso em Em"
          maxLength={80}
        />
      </div>

      {snippet && signedUrl && (
        <div className="rounded-lg border border-border bg-card p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Music2 className="w-4 h-4 text-primary" />
            <span className="truncate">{snippet.title}</span>
            <span className="text-xs text-muted-foreground ml-auto">{Math.round(snippet.duration_seconds)}s</span>
          </div>
          <audio controls src={signedUrl} className="w-full" preload="metadata" />
        </div>
      )}

      <div className="flex gap-2">
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPTED}
          onChange={handleUpload}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => fileRef.current?.click()}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Upload className="w-4 h-4 mr-2" />
          )}
          {snippet ? 'Substituir snippet' : 'Carregar snippet'}
        </Button>
        {snippet && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleDelete}
            disabled={loading}
            aria-label="Remover snippet"
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default MusicSnippetSection;
