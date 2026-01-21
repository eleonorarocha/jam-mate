import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface BlockedUser {
  id: string;
  blocked_id: string;
  created_at: string;
  profile?: {
    username: string;
    avatar_url: string | null;
    instrument: string;
  };
}

export const useBlockedUsers = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const loadBlockedUsers = useCallback(async () => {
    if (!user) return;

    const { data: blocksData } = await supabase
      .from('blocked_users')
      .select('id, blocked_id, created_at')
      .eq('blocker_id', user.id)
      .order('created_at', { ascending: false });

    if (blocksData && blocksData.length > 0) {
      // Fetch profiles separately
      const profileIds = blocksData.map(b => b.blocked_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, instrument')
        .in('id', profileIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      const enrichedData: BlockedUser[] = blocksData.map(block => ({
        ...block,
        profile: profileMap.get(block.blocked_id) as BlockedUser['profile']
      }));

      setBlockedUsers(enrichedData);
      setBlockedIds(new Set(blocksData.map(b => b.blocked_id)));
    } else {
      setBlockedUsers([]);
      setBlockedIds(new Set());
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadBlockedUsers();
  }, [loadBlockedUsers]);

  const blockUser = useCallback(async (blockedId: string) => {
    if (!user) return false;

    const { error } = await supabase
      .from('blocked_users')
      .insert({
        blocker_id: user.id,
        blocked_id: blockedId,
      });

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível bloquear o utilizador.',
        variant: 'destructive',
      });
      return false;
    }

    toast({
      title: 'Utilizador bloqueado',
      description: 'Este utilizador não poderá contactá-lo.',
    });

    await loadBlockedUsers();
    return true;
  }, [user, toast, loadBlockedUsers]);

  const unblockUser = useCallback(async (blockedId: string) => {
    if (!user) return false;

    const { error } = await supabase
      .from('blocked_users')
      .delete()
      .eq('blocker_id', user.id)
      .eq('blocked_id', blockedId);

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível desbloquear o utilizador.',
        variant: 'destructive',
      });
      return false;
    }

    toast({
      title: 'Utilizador desbloqueado',
      description: 'Este utilizador pode agora contactá-lo.',
    });

    await loadBlockedUsers();
    return true;
  }, [user, toast, loadBlockedUsers]);

  const isBlocked = useCallback((userId: string) => {
    return blockedIds.has(userId);
  }, [blockedIds]);

  return {
    blockedUsers,
    blockedIds,
    loading,
    blockUser,
    unblockUser,
    isBlocked,
    refresh: loadBlockedUsers,
  };
};
