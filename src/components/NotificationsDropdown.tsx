import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellRing, BellOff, Clock, User, Check, XCircle, Calendar, RefreshCw, History, CheckCheck, MessageSquare, Music, AlarmClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import RejectBookingDialog from './RejectBookingDialog';
import RescheduleBookingDialog from './RescheduleBookingDialog';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface BookingNotification {
  id: string;
  scheduled_date: string;
  duration_hours: number;
  message: string | null;
  musician_id: string;
  requester_id: string;
  status: string;
  requester?: {
    username: string;
    full_name: string | null;
    instrument: string;
  };
  musician?: {
    username: string;
    full_name: string | null;
    instrument: string;
  };
}

interface NotificationHistoryItem {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

const NotificationsDropdown = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [pendingBookings, setPendingBookings] = useState<BookingNotification[]>([]);
  const [rejectedBookings, setRejectedBookings] = useState<BookingNotification[]>([]);
  const [history, setHistory] = useState<NotificationHistoryItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [updatingBookingId, setUpdatingBookingId] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [bookingToReject, setBookingToReject] = useState<BookingNotification | null>(null);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [bookingToReschedule, setBookingToReschedule] = useState<BookingNotification | null>(null);
  const [open, setOpen] = useState(false);
  const { isSupported, isSubscribed, permission, requestPermission } = usePushNotifications();

  useEffect(() => {
    if (!user) return;

    const fetchBookings = async () => {
      // Fetch pending bookings (where user is the musician)
      const { data: pending, error: pendingError } = await supabase
        .from('bookings')
        .select(`
          id,
          scheduled_date,
          duration_hours,
          message,
          musician_id,
          requester_id,
          status,
          requester:profiles!bookings_requester_id_fkey(username, full_name, instrument)
        `)
        .eq('musician_id', user.id)
        .eq('status', 'pending')
        .order('scheduled_date', { ascending: true });

      if (!pendingError && pending) {
        setPendingBookings(pending as any);
      }

      // Fetch rejected bookings (where user is the requester)
      const { data: rejected, error: rejectedError } = await supabase
        .from('bookings')
        .select(`
          id,
          scheduled_date,
          duration_hours,
          message,
          musician_id,
          requester_id,
          status,
          musician:profiles!bookings_musician_id_fkey(username, full_name, instrument)
        `)
        .eq('requester_id', user.id)
        .eq('status', 'rejected')
        .order('scheduled_date', { ascending: false })
        .limit(10);

      if (!rejectedError && rejected) {
        setRejectedBookings(rejected as any);
      }

      setLoading(false);
    };

    fetchBookings();

    const channel = supabase
      .channel('bookings-dropdown')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
        },
        () => {
          fetchBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Fetch notification history
  useEffect(() => {
    if (!user) return;

    const fetchHistory = async () => {
      setLoadingHistory(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        setHistory(data as any as NotificationHistoryItem[]);
        setUnreadCount((data as any[]).filter((n: any) => !n.read).length);
      }
      setLoadingHistory(false);
    };

    fetchHistory();

    const channel = supabase
      .channel('notifications-history')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, () => fetchHistory())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const markAllRead = async () => {
    if (!user) return;
    await supabase
      .from('notifications')
      .update({ read: true } as any)
      .eq('user_id', user.id)
      .eq('read', false);
    setHistory(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'message': return <MessageSquare className="h-4 w-4 text-primary" />;
      case 'booking': return <Music className="h-4 w-4 text-primary" />;
      case 'reminder': return <AlarmClock className="h-4 w-4 text-amber-500" />;
      default: return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const handleUpdateBookingStatus = async (
    booking: BookingNotification, 
    newStatus: 'accepted' | 'rejected', 
    rejectionReason?: string
  ) => {
    if (!user) return;
    
    setUpdatingBookingId(booking.id);
    
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', booking.id);

      if (error) throw error;

      // Send email notification
      const functionName = newStatus === 'accepted' ? 'send-booking-accepted' : 'send-booking-rejected';
      await supabase.functions.invoke(functionName, {
        body: {
          bookingId: booking.id,
          musicianId: booking.musician_id,
          requesterId: booking.requester_id,
          scheduledDate: booking.scheduled_date,
          durationHours: booking.duration_hours,
          ...(newStatus === 'rejected' && { rejectionReason }),
        },
      });

      toast({
        title: newStatus === 'accepted' ? 'Jam aceite!' : 'Pedido recusado',
        description: 'O músico foi notificado por email.',
      });

      // Remove from local state
      setPendingBookings(prev => prev.filter(b => b.id !== booking.id));
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUpdatingBookingId(null);
      setRejectDialogOpen(false);
      setBookingToReject(null);
    }
  };

  const handleRejectClick = (booking: BookingNotification) => {
    setBookingToReject(booking);
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = (reason: string) => {
    if (bookingToReject) {
      handleUpdateBookingStatus(bookingToReject, 'rejected', reason);
    }
  };

  const handleRescheduleClick = (booking: BookingNotification) => {
    setBookingToReschedule(booking);
    setRescheduleDialogOpen(true);
  };

  const handleRescheduleSuccess = () => {
    setRejectedBookings(prev => prev.filter(b => b.id !== bookingToReschedule?.id));
    setBookingToReschedule(null);
  };

  const pendingCount = pendingBookings.length;
  const rejectedCount = rejectedBookings.length;
  const totalCount = pendingCount + rejectedCount + unreadCount;

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative"
          >
            <Bell className="h-5 w-5" />
            {totalCount > 0 && (
              <Badge 
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                variant="destructive"
              >
                {totalCount > 9 ? '9+' : totalCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-96 p-0 bg-background border border-border shadow-lg" 
          align="end"
          sideOffset={8}
        >
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Notificações</h3>
              <div className="flex items-center gap-1">
                {isSupported && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          if (permission === 'default') requestPermission();
                        }}
                        disabled={permission === 'denied'}
                      >
                        {permission === 'denied' ? (
                          <BellOff className="h-4 w-4 text-muted-foreground" />
                        ) : isSubscribed ? (
                          <BellRing className="h-4 w-4 text-primary" />
                        ) : (
                          <Bell className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {permission === 'denied'
                          ? 'Notificações bloqueadas'
                          : isSubscribed
                          ? 'Push ativas'
                          : 'Ativar push'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                )}
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setOpen(false);
                    navigate('/calendar');
                  }}
                >
                  <Calendar className="h-4 w-4 mr-1" />
                  Ver Agenda
                </Button>
              </div>
            </div>
          </div>
          
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="w-full grid grid-cols-3 rounded-none border-b border-border h-10">
              <TabsTrigger value="pending" className="relative text-xs">
                Pedidos
                {pendingCount > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {pendingCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="rejected" className="relative text-xs">
                Recusados
                {rejectedCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {rejectedCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="history" className="relative text-xs">
                Histórico
                {unreadCount > 0 && (
                  <Badge variant="outline" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="pending" className="mt-0">
              <ScrollArea className="max-h-[350px]">
                {loading ? (
                  <div className="p-8 text-center text-muted-foreground">
                    A carregar...
                  </div>
                ) : pendingBookings.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Sem pedidos pendentes</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {pendingBookings.map((booking) => (
                      <div key={booking.id} className="p-4 hover:bg-accent/50 transition-colors">
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <User className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">
                                {booking.requester?.full_name || booking.requester?.username}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {booking.requester?.instrument}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>
                              {format(parseISO(booking.scheduled_date), "d MMM 'às' HH:mm", { locale: pt })} 
                              {' - '}{booking.duration_hours}h
                            </span>
                          </div>
                          
                          {booking.message && (
                            <p className="text-sm text-muted-foreground border-l-2 border-primary pl-2 truncate">
                              {booking.message}
                            </p>
                          )}
                          
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1 bg-green-600 hover:bg-green-700"
                              disabled={updatingBookingId === booking.id}
                              onClick={() => handleUpdateBookingStatus(booking, 'accepted')}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Aceitar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="flex-1"
                              disabled={updatingBookingId === booking.id}
                              onClick={() => handleRejectClick(booking)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Recusar
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="rejected" className="mt-0">
              <ScrollArea className="max-h-[350px]">
                {loading ? (
                  <div className="p-8 text-center text-muted-foreground">
                    A carregar...
                  </div>
                ) : rejectedBookings.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <XCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Sem pedidos recusados</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {rejectedBookings.map((booking) => (
                      <div key={booking.id} className="p-4 hover:bg-accent/50 transition-colors">
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                              <XCircle className="h-5 w-5 text-destructive" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">
                                {booking.musician?.full_name || booking.musician?.username}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {booking.musician?.instrument}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>
                              {format(parseISO(booking.scheduled_date), "d MMM 'às' HH:mm", { locale: pt })}
                            </span>
                          </div>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={() => handleRescheduleClick(booking)}
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Reagendar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </PopoverContent>
      </Popover>

      <RejectBookingDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        onConfirm={handleRejectConfirm}
        isLoading={updatingBookingId !== null}
        musicianName={bookingToReject?.requester?.full_name || bookingToReject?.requester?.username || 'o músico'}
      />

      {bookingToReschedule && (
        <RescheduleBookingDialog
          open={rescheduleDialogOpen}
          onOpenChange={setRescheduleDialogOpen}
          bookingId={bookingToReschedule.id}
          musicianId={bookingToReschedule.musician_id}
          musicianName={bookingToReschedule.musician?.full_name || bookingToReschedule.musician?.username || 'Músico'}
          originalDate={bookingToReschedule.scheduled_date}
          onSuccess={handleRescheduleSuccess}
        />
      )}
    </>
  );
};

export default NotificationsDropdown;