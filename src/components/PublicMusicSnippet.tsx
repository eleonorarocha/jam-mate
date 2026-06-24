import { useEffect, useState } from 'react';
import { Music2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  userId: string;
}

const PublicMusicSnippet = ({ userId }: Props) => {
  const [snippet, setSnippet] = useState<{ title: string; duration_seconds: number; storage_path: string } | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('music_snippets')
        .select('title, duration_seconds, storage_path')
        .eq('user_id', userId)
        .maybeSingle();
      if (!data) return;
      setSnippet(data);
      const { data: s } = await supabase.storage
        .from('music-snippets')
        .createSignedUrl(data.storage_path, 60 * 60);
      setSignedUrl(s?.signedUrl ?? null);
    };
    load();
  }, [userId]);

  if (!snippet || !signedUrl) return null;

  return (
    <div className="rounded-lg border border-border bg-card/50 p-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Music2 className="w-4 h-4 text-primary" />
        <span className="truncate">{snippet.title}</span>
        <span className="text-xs text-muted-foreground ml-auto">{Math.round(snippet.duration_seconds)}s</span>
      </div>
      <audio controls src={signedUrl} className="w-full" preload="metadata" />
    </div>
  );
};

export default PublicMusicSnippet;
