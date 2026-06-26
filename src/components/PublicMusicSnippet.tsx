import { useEffect, useState } from 'react';
import { Music2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  userId: string;
}

interface Snippet {
  id: string;
  title: string;
  duration_seconds: number;
  storage_path: string;
}

const PublicMusicSnippet = ({ userId }: Props) => {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('music_snippets')
        .select('id, title, duration_seconds, storage_path')
        .eq('user_id', userId)
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
    load();
  }, [userId]);

  if (snippets.length === 0) return null;

  return (
    <div className="space-y-2">
      {snippets.map((snippet) => (
        <div key={snippet.id} className="rounded-lg border border-border bg-card/50 p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Music2 className="w-4 h-4 text-primary" />
            <span className="truncate">{snippet.title}</span>
            <span className="text-xs text-muted-foreground ml-auto">{Math.round(snippet.duration_seconds)}s</span>
          </div>
          {signedUrls[snippet.id] && (
            <audio controls src={signedUrls[snippet.id]} className="w-full" preload="metadata" />
          )}
        </div>
      ))}
    </div>
  );
};

export default PublicMusicSnippet;
