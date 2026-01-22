import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface FavoriteMusician {
  id: string;
  musician_id: string;
  created_at: string;
  profile?: {
    id: string;
    username: string;
    avatar_url: string | null;
    instrument: string;
    skill_level: string;
    city: string | null;
    average_rating: number | null;
  };
}

export const useFavorites = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [favorites, setFavorites] = useState<FavoriteMusician[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const loadFavorites = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: favoritesData } = await supabase
      .from('favorites')
      .select('id, musician_id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (favoritesData && favoritesData.length > 0) {
      const musicianIds = favoritesData.map(f => f.musician_id);
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, instrument, skill_level, city, average_rating')
        .in('id', musicianIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const enrichedData: FavoriteMusician[] = favoritesData.map(fav => ({
        ...fav,
        profile: profileMap.get(fav.musician_id) as FavoriteMusician['profile']
      }));

      setFavorites(enrichedData);
      setFavoriteIds(new Set(favoritesData.map(f => f.musician_id)));
    } else {
      setFavorites([]);
      setFavoriteIds(new Set());
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const addFavorite = useCallback(async (musicianId: string) => {
    if (!user) return false;

    const { error } = await supabase
      .from('favorites')
      .insert({
        user_id: user.id,
        musician_id: musicianId,
      });

    if (error) {
      if (error.code === '23505') {
        toast({
          title: 'Já está nos favoritos',
          description: 'Este músico já está na sua lista de favoritos.',
        });
      } else {
        toast({
          title: 'Erro',
          description: 'Não foi possível adicionar aos favoritos.',
          variant: 'destructive',
        });
      }
      return false;
    }

    toast({
      title: 'Adicionado aos favoritos',
      description: 'Músico adicionado à sua lista de favoritos.',
    });

    await loadFavorites();
    return true;
  }, [user, toast, loadFavorites]);

  const removeFavorite = useCallback(async (musicianId: string) => {
    if (!user) return false;

    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('musician_id', musicianId);

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível remover dos favoritos.',
        variant: 'destructive',
      });
      return false;
    }

    toast({
      title: 'Removido dos favoritos',
      description: 'Músico removido da sua lista de favoritos.',
    });

    await loadFavorites();
    return true;
  }, [user, toast, loadFavorites]);

  const toggleFavorite = useCallback(async (musicianId: string) => {
    if (favoriteIds.has(musicianId)) {
      return removeFavorite(musicianId);
    } else {
      return addFavorite(musicianId);
    }
  }, [favoriteIds, addFavorite, removeFavorite]);

  const isFavorite = useCallback((musicianId: string) => {
    return favoriteIds.has(musicianId);
  }, [favoriteIds]);

  return {
    favorites,
    favoriteIds,
    loading,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
    refresh: loadFavorites,
  };
};
