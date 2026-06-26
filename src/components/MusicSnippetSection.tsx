import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Music2, Upload, Trash2, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { usePro } from '@/hooks/usePro';
import UpgradeProDialog from './UpgradeProDialog';

const MAX_BYTES = 4 * 1024 * 1024; // 4MB safety net (60s @ 128kbps ≈ 1MB)
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
  const { isPro, limits } = usePro();
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) loadSnippets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadSnippets = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('music_snippets')
      .select('id, title, audio_url, storage_path, duration_seconds')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    const list = data ?? [];
    setSnippets(list);

    const urls: Record<string, string> = {};
    await Promise.all(
      list.map(async (s) => {
        const { data: signed } = await supabase.storage
          .from('music-snippets')
          .createSignedUrl(s.storage_path, 60 * 60);
        if (signed?.signedUrl) urls[s.id] = signed.signedUrl;
      })
    );
    setSignedUrls(urls);
  };

  const atLimit = snippets.length >= limits.maxSnippets;

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

    if (atLimit) {
      setUpgradeOpen(true);
      if (fileRef.current) fileRef.current.value = '';
      return;
    }

    if (!title.trim()) {
      toast({ title: 'Adiciona um título', description: 'Dá um nome ao teu snippet antes de fazer upload.', variant: 'destructive' });
      if (fileRef.current) fileRef.current.value = '';
      return;
    }

    if (file.size > MAX_BYTES) {
      toast({ title: 'Ficheiro muito grande', description: 'O máximo é ~4MB. Tenta um MP3 a 128kbps.', variant: 'destructive' });
      if (fileRef.current) fileRef.current.value = '';
      return;
    }

    setLoading(true);
    try {
      const duration = await probeDuration(file);
      if (duration > limits.maxSeconds + 0.5) {
        toast({
          title: 'Demasiado longo',
          description: isPro
            ? `O snippet Pro tem no máximo ${limits.maxSeconds}s. Este tem ${Math.round(duration)}s.`
            : `O snippet grátis tem no máximo ${limits.maxSeconds}s. Faz upgrade para Pro para até ${60}s.`,
          variant: 'destructive',
        });
        setLoading(false);
        return;
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
          duration_seconds: Math.min(duration, limits.maxSeconds),
        })
        .select('id, title, audio_url, storage_path, duration_seconds')
        .single();
      if (insErr) {
        // Trigger errors (limit reached / too long) → cleanup storage
        await supabase.storage.from('music-snippets').remove([path]);
        throw insErr;
      }

      setSnippets((prev) => [...prev, inserted]);
      const { data: s } = await supabase.storage.from('music-snippets').createSignedUrl(path, 60 * 60);
      if (s?.signedUrl) setSignedUrls((prev) => ({ ...prev, [inserted.id]: s.signedUrl }));
      setTitle('');
      toast({ title: 'Snippet publicado!', description: 'Já está disponível no teu perfil público.' });
    } catch (err: any) {
      toast({ title: 'Erro no upload', description: err.message || 'Tenta novamente.', variant: 'destructive' });
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDelete = async (snippet: Snippet) => {
    if (!user) return;
    setLoading(true);
    try {
      await supabase.storage.from('music-snippets').remove([snippet.storage_path]);
      await supabase.from('music_snippets').delete().eq('id', snippet.id);
      setSnippets((prev) => prev.filter((s) => s.id !== snippet.id));
      setSignedUrls((prev) => {
        const next = { ...prev };
        delete next[snippet.id];
        return next;
      });
      toast({ title: 'Snippet removido' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 flex items-start gap-2">
        <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
        <div className="text-xs text-muted-foreground leading-relaxed flex-1">
          <p>
            Partilha excertos da tua música (até <strong className="text-foreground">{limits.maxSeconds}s</strong>) para que outros músicos possam ouvir o teu som.
          </p>
          <p className="mt-1">
            {isPro ? (
              <span className="text-foreground">Plano Pro: até {limits.maxSnippets} snippets.</span>
            ) : (
              <>
                <span className="text-foreground">Plano grátis: {limits.maxSnippets} snippet de {limits.maxSeconds}s.</span>{' '}
                <button
                  type="button"
                  onClick={() => setUpgradeOpen(true)}
                  className="text-primary underline-offset-2 hover:underline font-medium"
                >
                  Upgrade para Pro
                </button>
              </>
            )}
          </p>
        </div>
      </div>

      {snippets.length > 0 && (
        <div className="space-y-2">
          {snippets.map((snippet) => (
            <div key={snippet.id} className="rounded-lg border border-border bg-card p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Music2 className="w-4 h-4 text-primary" />
                <span className="truncate flex-1">{snippet.title}</span>
                <span className="text-xs text-muted-foreground">{Math.round(snippet.duration_seconds)}s</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleDelete(snippet)}
                  disabled={loading}
                  aria-label="Remover snippet"
                >
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </Button>
              </div>
              {signedUrls[snippet.id] && (
                <audio controls src={signedUrls[snippet.id]} className="w-full" preload="metadata" />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        {snippets.length} / {limits.maxSnippets} snippets usados
      </div>

      <div className="space-y-2">
        <Label htmlFor="snippet-title" className="text-sm">Título do próximo snippet</Label>
        <Input
          id="snippet-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: Solo de improviso em Em"
          maxLength={80}
          disabled={atLimit}
        />
      </div>

      <input
        ref={fileRef}
        type="file"
        accept={ACCEPTED}
        onChange={handleUpload}
        className="hidden"
      />

      {atLimit ? (
        <Button
          type="button"
          variant="default"
          className="w-full"
          onClick={() => setUpgradeOpen(true)}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          {isPro ? 'Limite Pro atingido' : 'Upgrade para Pro para adicionar mais'}
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => fileRef.current?.click()}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Upload className="w-4 h-4 mr-2" />
          )}
          Carregar snippet
        </Button>
      )}

      <UpgradeProDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </div>
  );
};

export default MusicSnippetSection;
