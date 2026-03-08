import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useUnreadMessages = () => {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  const fetchCount = async () => {
    if (!user) return;
    const { count: unread } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .eq('read', false);
    setCount(unread ?? 0);
  };

  useEffect(() => {
    if (!user) return;
    fetchCount();

    const channel = supabase
      .channel('unread-messages-header')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${user.id}`,
      }, () => fetchCount())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return count;
};
