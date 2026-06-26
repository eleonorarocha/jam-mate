import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Image as ImageIcon, Video, Music2, Upload, Trash2, Globe, Lock, LayoutGrid } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

type MediaTypeFilter = 'all' | 'image' | 'video' | 'audio';

const TYPE_FILTERS: { key: MediaTypeFilter; label: string; icon: typeof ImageIcon }[] = [
  { key: 'all', label: 'Todos', icon: LayoutGrid },
  { key: 'image', label: 'Fotos', icon: ImageIcon },
  { key: 'video', label: 'Vídeos', icon: Video },
  { key: 'audio', label: 'Áudios', icon: Music2 },
];

interface MediaItem {
  id: string;
  media_type: 'image' | 'video' | 'audio';
  media_url: string;
  thumbnail_url: string | null;
  title: string | null;
  description: string | null;
  is_public: boolean;
  created_at: string;
  uploader_id: string;
}

const Gallery = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [myMedia, setMyMedia] = useState<MediaItem[]>([]);
  const [publicMedia, setPublicMedia] = useState<MediaItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: '', description: '', isPublic: false });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [myFilter, setMyFilter] = useState<MediaTypeFilter>('all');
  const [pubFilter, setPubFilter] = useState<MediaTypeFilter>('all');

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) loadMedia();
  }, [user]);

  const loadMedia = async () => {
    if (!user) return;
    const { data: userMedia } = await supabase.from('jam_media').select('*').eq('uploader_id', user.id).order('created_at', { ascending: false });
    if (userMedia) setMyMedia(userMedia as MediaItem[]);
    // Exclude the user's own files from the public gallery to avoid duplicates with "Os Meus Ficheiros"
    const { data: pubMedia } = await supabase.from('jam_media').select('*').eq('is_public', true).neq('uploader_id', user.id).order('created_at', { ascending: false }).limit(50);
    if (pubMedia) setPublicMedia(pubMedia as MediaItem[]);
  };

  const filterByType = (items: MediaItem[], filter: MediaTypeFilter) =>
    filter === 'all' ? items : items.filter((m) => m.media_type === filter);

  const countByType = (items: MediaItem[], filter: MediaTypeFilter) =>
    filter === 'all' ? items.length : items.filter((m) => m.media_type === filter).length;

  const getMediaType = (file: File): 'image' | 'video' | 'audio' | null => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    return null;
  };

  const handleUpload = async () => {
    if (!user || !selectedFile) return;
    const mediaType = getMediaType(selectedFile);
    if (!mediaType) {
      toast({ title: 'Tipo de ficheiro inválido', description: 'Por favor, selecione uma imagem, vídeo ou áudio.', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('jam-media').upload(fileName, selectedFile);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('jam-media').getPublicUrl(fileName);
      const { error: insertError } = await supabase.from('jam_media').insert({
        uploader_id: user.id, media_type: mediaType, media_url: urlData.publicUrl,
        title: uploadForm.title || null, description: uploadForm.description || null, is_public: uploadForm.isPublic,
      });
      if (insertError) throw insertError;
      toast({ title: 'Upload concluído!', description: 'O seu ficheiro foi carregado com sucesso.' });
      setShowUploadDialog(false);
      setSelectedFile(null);
      setUploadForm({ title: '', description: '', isPublic: false });
      loadMedia();
    } catch (error: any) {
      toast({ title: 'Erro no upload', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (mediaId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from('jam_media').delete().eq('id', mediaId).eq('uploader_id', user.id);
      if (error) throw error;
      toast({ title: 'Eliminado', description: 'O ficheiro foi eliminado.' });
      loadMedia();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const toggleVisibility = async (media: MediaItem) => {
    if (!user || media.uploader_id !== user.id) return;
    try {
      const { error } = await supabase.from('jam_media').update({ is_public: !media.is_public }).eq('id', media.id);
      if (error) throw error;
      loadMedia();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const renderMediaItem = (item: MediaItem, showControls: boolean = false) => {
    const isOwner = user?.id === item.uploader_id;
    return (
      <Card key={item.id} className="overflow-hidden group hover:border-primary/30 transition-colors">
        <div className="aspect-video bg-muted relative">
          {item.media_type === 'image' && <img src={item.media_url} alt={item.title || 'Jam media'} className="w-full h-full object-cover" />}
          {item.media_type === 'video' && <video src={item.media_url} controls className="w-full h-full object-cover" />}
          {item.media_type === 'audio' && (
            <div className="w-full h-full flex flex-col items-center justify-center p-4">
              <Music2 className="h-12 w-12 text-muted-foreground mb-4" />
              <audio src={item.media_url} controls className="w-full" />
            </div>
          )}
          <div className="absolute top-2 right-2">
            {item.is_public ? <Globe className="h-4 w-4 text-accent" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>
        <CardContent className="p-4">
          {item.title && <h4 className="font-medium mb-1">{item.title}</h4>}
          {item.description && <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>}
          {showControls && isOwner && (
            <div className="flex gap-2 mt-3">
              <Button variant="outline" size="sm" onClick={() => toggleVisibility(item)}>
                {item.is_public ? 'Tornar Privado' : 'Tornar Público'}
              </Button>
              <Button variant="destructive" size="sm" onClick={() => handleDelete(item.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
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
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/15 text-accent-foreground text-xs font-medium mb-3">
                <ImageIcon className="w-3 h-3" />
                Média
              </div>
              <h1 className="text-3xl font-bold">Galeria</h1>
              <p className="text-muted-foreground text-sm mt-1">Partilhe fotos, vídeos e gravações das suas jam sessions</p>
            </motion.div>
            <Button onClick={() => setShowUploadDialog(true)} className="bg-gradient-to-r from-primary to-[hsl(var(--primary-glow))] hover:opacity-90 transition-opacity">
              <Upload className="h-4 w-4 mr-2" />
              Carregar
            </Button>
          </div>

          <Tabs defaultValue="my-media" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="my-media">Os Meus Ficheiros</TabsTrigger>
              <TabsTrigger value="public">Galeria Pública</TabsTrigger>
            </TabsList>

            <TabsContent value="my-media" className="mt-6 space-y-4">
              <TypeFilterBar items={myMedia} active={myFilter} onChange={setMyFilter} />
              {(() => {
                const filtered = filterByType(myMedia, myFilter);
                if (myMedia.length === 0) {
                  return <Card><CardHeader><CardTitle className="text-lg">Sem ficheiros</CardTitle><CardDescription>Ainda não carregou nenhum ficheiro. Partilhe memórias das suas jam sessions!</CardDescription></CardHeader></Card>;
                }
                if (filtered.length === 0) {
                  return <Card><CardHeader><CardTitle className="text-lg">Nada nesta categoria</CardTitle><CardDescription>Não tem ficheiros deste tipo. Experimente outro filtro.</CardDescription></CardHeader></Card>;
                }
                return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{filtered.map((item) => renderMediaItem(item, true))}</div>;
              })()}
            </TabsContent>

            <TabsContent value="public" className="mt-6 space-y-4">
              <TypeFilterBar items={publicMedia} active={pubFilter} onChange={setPubFilter} />
              {(() => {
                const filtered = filterByType(publicMedia, pubFilter);
                if (publicMedia.length === 0) {
                  return <Card><CardHeader><CardTitle className="text-lg">Galeria vazia</CardTitle><CardDescription>Ainda não há ficheiros públicos de outros utilizadores.</CardDescription></CardHeader></Card>;
                }
                if (filtered.length === 0) {
                  return <Card><CardHeader><CardTitle className="text-lg">Nada nesta categoria</CardTitle><CardDescription>Sem ficheiros deste tipo na galeria pública.</CardDescription></CardHeader></Card>;
                }
                return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{filtered.map((item) => renderMediaItem(item, false))}</div>;
              })()}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Carregar Ficheiro</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="file">Ficheiro</Label>
              <Input id="file" type="file" accept="image/*,video/*,audio/*" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
              <p className="text-xs text-muted-foreground">Imagens, vídeos ou áudios (máx. 50MB)</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Título (opcional)</Label>
              <Input id="title" value={uploadForm.title} onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })} placeholder="Ex: Jam Session no Porto" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea id="description" value={uploadForm.description} onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })} placeholder="Descreva o momento..." rows={2} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="public">Partilhar publicamente</Label>
                <p className="text-xs text-muted-foreground">Visível para todos os utilizadores</p>
              </div>
              <Switch id="public" checked={uploadForm.isPublic} onCheckedChange={(checked) => setUploadForm({ ...uploadForm, isPublic: checked })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>Cancelar</Button>
            <Button onClick={handleUpload} disabled={!selectedFile || uploading}>{uploading ? 'A carregar...' : 'Carregar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface TypeFilterBarProps {
  items: MediaItem[];
  active: MediaTypeFilter;
  onChange: (next: MediaTypeFilter) => void;
}

const TypeFilterBar = ({ items, active, onChange }: TypeFilterBarProps) => {
  const counts = useMemo(() => ({
    all: items.length,
    image: items.filter((i) => i.media_type === 'image').length,
    video: items.filter((i) => i.media_type === 'video').length,
    audio: items.filter((i) => i.media_type === 'audio').length,
  }), [items]);

  return (
    <div className="flex flex-wrap gap-2">
      {TYPE_FILTERS.map(({ key, label, icon: Icon }) => {
        const isActive = active === key;
        return (
          <Button
            key={key}
            type="button"
            size="sm"
            variant={isActive ? 'default' : 'outline'}
            onClick={() => onChange(key)}
            className="gap-1.5"
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            <span className={`ml-1 text-xs ${isActive ? 'opacity-90' : 'text-muted-foreground'}`}>
              {counts[key]}
            </span>
          </Button>
        );
      })}
    </div>
  );
};

export default Gallery;
