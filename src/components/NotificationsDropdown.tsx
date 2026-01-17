import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Clock, User, Check, XCircle, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import RejectBookingDialog from './RejectBookingDialog';

interface PendingBooking {
  id: string;
  scheduled_date: string;
  duration_hours: number;
  message: string | null;
  musician_id: string;
  requester_id: string;
  requester: {
    username: string;
    full_name: string | null;
    instrument: string;
  };
}

const NotificationsDropdown = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [pendingBookings, setPendingBookings] = useState<PendingBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingBookingId, setUpdatingBookingId] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [bookingToReject, setBookingToReject] = useState<PendingBooking | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchPendingBookings = async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          scheduled_date,
          duration_hours,
          message,
          musician_id,
          requester_id,
          requester:profiles!bookings_requester_id_fkey(username, full_name, instrument)
        `)
        .eq('musician_id', user.id)
        .eq('status', 'pending')
        .order('scheduled_date', { ascending: true });

      if (!error && data) {
        setPendingBookings(data as any);
      }
      setLoading(false);
    };

    fetchPendingBookings();

    const channel = supabase
      .channel('pending-bookings-dropdown')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `musician_id=eq.${user.id}`,
        },
        () => {
          fetchPendingBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleUpdateBookingStatus = async (
    booking: PendingBooking, 
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

  const handleRejectClick = (booking: PendingBooking) => {
    setBookingToReject(booking);
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = (reason: string) => {
    if (bookingToReject) {
      handleUpdateBookingStatus(bookingToReject, 'rejected', reason);
    }
  };

  const pendingCount = pendingBookings.length;

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
            {pendingCount > 0 && (
              <Badge 
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                variant="destructive"
              >
                {pendingCount > 9 ? '9+' : pendingCount}
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
              <h3 className="font-semibold">Pedidos Pendentes</h3>
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
          
          <ScrollArea className="max-h-[400px]">
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
        </PopoverContent>
      </Popover>

      <RejectBookingDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        onConfirm={handleRejectConfirm}
        isLoading={updatingBookingId !== null}
        musicianName={bookingToReject?.requester?.full_name || bookingToReject?.requester?.username || 'o músico'}
      />
    </>
  );
};

export default NotificationsDropdown;
