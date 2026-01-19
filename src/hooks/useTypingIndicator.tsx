import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface TypingUser {
  oderId: string;
  username: string;
  isTyping: boolean;
}

export const useTypingIndicator = (conversationId: string | null, userId: string | null, username: string | null) => {
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [typingUsername, setTypingUsername] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!conversationId || !userId) return;

    const channelName = `typing:${[userId, conversationId].sort().join('-')}`;
    
    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const typingUsers = Object.entries(state)
          .filter(([key]) => key !== userId)
          .flatMap(([, presences]) => presences as any[])
          .filter((presence) => presence.isTyping);

        if (typingUsers.length > 0) {
          setIsOtherUserTyping(true);
          setTypingUsername(typingUsers[0].username || null);
        } else {
          setIsOtherUserTyping(false);
          setTypingUsername(null);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            oderId: conversationId,
            username: username,
            isTyping: false,
          });
        }
      });

    channelRef.current = channel;

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [conversationId, userId, username]);

  const setTyping = useCallback(async (isTyping: boolean) => {
    if (!channelRef.current || !conversationId) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Update presence
    await channelRef.current.track({
      oderId: conversationId,
      username: username,
      isTyping,
    });

    // Auto-stop typing after 3 seconds of inactivity
    if (isTyping) {
      typingTimeoutRef.current = setTimeout(async () => {
        await channelRef.current?.track({
          oderId: conversationId,
          username: username,
          isTyping: false,
        });
      }, 3000);
    }
  }, [conversationId, username]);

  return { isOtherUserTyping, typingUsername, setTyping };
};
