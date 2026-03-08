import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, CheckCheck, X, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useBlockedUsers } from '@/hooks/useBlockedUsers';
import TypingIndicator from '@/components/TypingIndicator';

interface MessagesPanelProps {
  onClose: () => void;
  embedded?: boolean;
}

const MessagesPanel = ({ onClose, embedded = false }: MessagesPanelProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { blockedIds } = useBlockedUsers();
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [userProfile, setUserProfile] = useState<{ username: string } | null>(null);

  // Load current user's profile for typing indicator
  useEffect(() => {
    if (!user) return;
    
    const loadUserProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();
      
      if (data) {
        setUserProfile(data);
      }
    };
    
    loadUserProfile();
  }, [user]);

  const { isOtherUserTyping, typingUsername, setTyping } = useTypingIndicator(
    selectedConversation?.id || null,
    user?.id || null,
    userProfile?.username || null
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (e.target.value.length > 0) {
      setTyping(true);
    } else {
      setTyping(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    loadConversations();
    
    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => {
          loadConversations();
          if (selectedConversation) {
            loadMessages(selectedConversation.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedConversation]);

  const loadConversations = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('messages')
      .select('*, sender:profiles!sender_id(*), receiver:profiles!receiver_id(*)')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (data) {
      const uniqueConversations = Array.from(
        new Map(
          data
            .filter((msg) => {
              // Filter out messages from/to blocked users
              const otherId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
              return !blockedIds.has(otherId);
            })
            .map((msg) => {
              const otherId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
              const other = msg.sender_id === user.id ? msg.receiver : msg.sender;
              return [otherId, { id: otherId, profile: other, lastMessage: msg }];
            })
        ).values()
      );
      setConversations(uniqueConversations);
    }
  };

  const loadMessages = async (otherUserId: string) => {
    if (!user) return;

    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data);
      
      const unreadIds = data
        .filter((msg) => msg.receiver_id === user.id && !msg.read)
        .map((msg) => msg.id);
      
      if (unreadIds.length > 0) {
        await supabase
          .from('messages')
          .update({ read: true })
          .in('id', unreadIds);
      }
    }
  };

  const sendMessage = async () => {
    if (!user || !selectedConversation || !newMessage.trim()) return;

    // Stop typing indicator when sending
    setTyping(false);

    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: selectedConversation.id,
      content: newMessage,
    });

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar a mensagem.',
        variant: 'destructive',
      });
    } else {
      setNewMessage('');
    }
  };

  const containerClass = embedded 
    ? "h-[600px] border rounded-lg flex"
    : "absolute top-0 right-0 h-full w-full max-w-2xl bg-background/95 backdrop-blur-sm shadow-2xl z-30 flex";

  return (
    <div className={containerClass}>
      <div className="w-1/3 border-r border-border">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold">Conversas</h3>
        </div>
        <ScrollArea className="h-[calc(100vh-73px)]">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => {
                setSelectedConversation(conv);
                loadMessages(conv.id);
              }}
              className={`w-full p-4 text-left border-b border-border hover:bg-accent/50 transition-colors ${
                selectedConversation?.id === conv.id ? 'bg-accent' : ''
              }`}
            >
              <p className="font-medium">{conv.profile?.username}</p>
              <p className="text-sm text-muted-foreground truncate">
                {conv.lastMessage?.content}
              </p>
            </button>
          ))}
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold">
            {selectedConversation?.profile?.username || 'Mensagens'}
          </h3>
          {!embedded && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        {selectedConversation ? (
          <>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((msg) => {
                  const isSentByMe = msg.sender_id === user?.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isSentByMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] p-3 rounded-lg ${
                          isSentByMe
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-accent'
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <p className="text-xs opacity-70">
                            {new Date(msg.created_at).toLocaleTimeString('pt-PT', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                          {isSentByMe && (
                            msg.read ? (
                              <CheckCheck className="h-3.5 w-3.5 text-blue-400" />
                            ) : (
                              <Check className="h-3.5 w-3.5 opacity-70" />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
            
            {/* Typing indicator */}
            {isOtherUserTyping && (
              <TypingIndicator username={typingUsername} />
            )}
            
            <div className="p-4 border-t border-border flex gap-2">
              <Input
                placeholder="Escreva a sua mensagem..."
                value={newMessage}
                onChange={handleInputChange}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              />
              <Button onClick={sendMessage} size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Selecione uma conversa
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesPanel;
