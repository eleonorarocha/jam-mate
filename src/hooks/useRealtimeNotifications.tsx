import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useNotificationSound } from '@/hooks/useNotificationSound';

export const useRealtimeNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const playSound = useNotificationSound();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    // Prevent double-subscription in strict mode
    if (initializedRef.current) return;
    initializedRef.current = true;

    // Listen for new messages
    const messagesChannel = supabase
      .channel('realtime-messages-notif')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        async (payload) => {
          const msg = payload.new as any;
          // Don't notify for own messages
          if (msg.sender_id === user.id) return;

          // Fetch sender name
          const { data: sender } = await supabase
            .from('profiles')
            .select('username, full_name')
            .eq('id', msg.sender_id)
            .single();

          const name = sender?.full_name || sender?.username || 'Alguém';

          toast({
            title: `💬 Nova mensagem de ${name}`,
            description: msg.content?.length > 60 ? msg.content.slice(0, 60) + '…' : msg.content,
          });
          playSound('message');
        }
      )
      .subscribe();

    // Listen for new/updated bookings
    const bookingsChannel = supabase
      .channel('realtime-bookings-notif')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bookings',
          filter: `musician_id=eq.${user.id}`,
        },
        async (payload) => {
          const booking = payload.new as any;
          const { data: requester } = await supabase
            .from('profiles')
            .select('username, full_name')
            .eq('id', booking.requester_id)
            .single();

          const name = requester?.full_name || requester?.username || 'Um músico';

          toast({
            title: '🎵 Novo pedido de jam!',
            description: `${name} quer tocar consigo.`,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `requester_id=eq.${user.id}`,
        },
        async (payload) => {
          const booking = payload.new as any;
          const oldStatus = (payload.old as any)?.status;
          if (booking.status === oldStatus) return;

          const { data: musician } = await supabase
            .from('profiles')
            .select('username, full_name')
            .eq('id', booking.musician_id)
            .single();

          const name = musician?.full_name || musician?.username || 'O músico';

          if (booking.status === 'accepted') {
            toast({
              title: '✅ Jam aceite!',
              description: `${name} aceitou o seu pedido.`,
            });
          } else if (booking.status === 'rejected') {
            toast({
              title: '❌ Pedido recusado',
              description: `${name} recusou o seu pedido.`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      initializedRef.current = false;
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(bookingsChannel);
    };
  }, [user, toast]);
};
