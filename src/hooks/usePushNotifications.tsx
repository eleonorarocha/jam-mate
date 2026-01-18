import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export const usePushNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    // Check if push notifications are supported
    const supported = 'Notification' in window && 'serviceWorker' in navigator;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
      setIsSubscribed(Notification.permission === 'granted');
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      toast({
        title: 'Não suportado',
        description: 'O seu navegador não suporta notificações push.',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      setIsSubscribed(result === 'granted');

      if (result === 'granted') {
        toast({
          title: 'Notificações ativadas!',
          description: 'Irá receber alertas quando tiver novos pedidos de booking.',
        });
        return true;
      } else if (result === 'denied') {
        toast({
          title: 'Notificações bloqueadas',
          description: 'Pode ativar nas definições do navegador.',
          variant: 'destructive',
        });
      }
      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, [isSupported, toast]);

  const showNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (!isSubscribed) return;

    try {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        tag: 'booking-notification',
        ...options,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }, [isSubscribed]);

  // Listen for new booking requests in real-time
  useEffect(() => {
    if (!user || !isSubscribed) return;

    const channel = supabase
      .channel('push-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bookings',
          filter: `musician_id=eq.${user.id}`,
        },
        async (payload) => {
          const newBooking = payload.new as { 
            requester_id: string; 
            scheduled_date: string;
            status: string;
          };
          
          if (newBooking.status !== 'pending') return;

          // Fetch requester info
          const { data: requester } = await supabase
            .from('profiles')
            .select('username, full_name, instrument')
            .eq('id', newBooking.requester_id)
            .single();

          const name = requester?.full_name || requester?.username || 'Alguém';
          const instrument = requester?.instrument || 'músico';

          showNotification('Novo Pedido de Jam! 🎵', {
            body: `${name} (${instrument}) quer marcar uma jam session consigo!`,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isSubscribed, showNotification]);

  return {
    isSupported,
    isSubscribed,
    permission,
    requestPermission,
    showNotification,
  };
};
