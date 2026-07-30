import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { X, Clock, User, Check, XCircle, RefreshCw, Ban, Copy, CalendarPlus } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format, isSameDay, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import RejectBookingDialog from './RejectBookingDialog';
import RescheduleBookingDialog from './RescheduleBookingDialog';
import CancelBookingDialog from './CancelBookingDialog';
import BookingHistory from './BookingHistory';
import { useUserTimeZone } from '@/hooks/useUserTimeZone';
import { buildIcsCalendar, downloadIcs } from '@/lib/ics';

const formatBookingTime = (iso: string, timeZone: string) => {
  const d = parseISO(iso);
  const time = new Intl.DateTimeFormat('pt-PT', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
  const offsetPart = new Intl.DateTimeFormat('pt-PT', {
    timeZone,
    timeZoneName: 'shortOffset',
  })
    .formatToParts(d)
    .find((p) => p.type === 'timeZoneName');
  return { time, offset: offsetPart?.value ?? '' };
};

interface CalendarPanelProps {
  onClose: () => void;
  embedded?: boolean;
}

interface Booking {
  id: string;
  scheduled_date: string;
  duration_hours: number;
  status: string;
  message: string | null;
  cancellation_reason: string | null;
  musician_id: string;
  requester_id: string;
  profiles: {
    username: string;
    full_name: string | null;
    instrument: string;
  };
}

const CalendarPanel = ({ onClose, embedded = false }: CalendarPanelProps) => {
  const { user } = useAuth();
  const { timeZone, localTimeZone, showLocalTime } = useUserTimeZone();
  const showDualTime = showLocalTime && timeZone !== localTimeZone;
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingBookingId, setUpdatingBookingId] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [bookingToReject, setBookingToReject] = useState<Booking | null>(null);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [bookingToReschedule, setBookingToReschedule] = useState<Booking | null>(null);
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  const [copiedBookingId, setCopiedBookingId] = useState<string | null>(null);

  const handleCancelBooking = async (reason: string) => {
    if (!user || !bookingToCancel) return;
    setUpdatingBookingId(bookingToCancel.id);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          cancellation_reason: reason || null,
        } as any)
        .eq('id', bookingToCancel.id);
      if (error) throw error;

      toast({
        title: 'Reserva cancelada',
        description: 'A outra parte vai ser notificada.',
      });

      // Optimistic update; realtime will confirm.
      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingToCancel.id
            ? { ...b, status: 'cancelled', cancellation_reason: reason || null }
            : b
        )
      );
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message ?? 'Não foi possível cancelar.',
        variant: 'destructive',
      });
    } finally {
      setUpdatingBookingId(null);
      setBookingToCancel(null);
    }
  };

  const handleUpdateBookingStatus = async (booking: Booking, newStatus: 'accepted' | 'rejected', rejectionReason?: string) => {
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
        description: newStatus === 'accepted' 
          ? 'O músico foi notificado por email.' 
          : 'O músico foi notificado por email.',
      });

      // Update local state
      setBookings(prev => prev.map(b => 
        b.id === booking.id ? { ...b, status: newStatus } : b
      ));
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

  const handleRejectClick = (booking: Booking) => {
    setBookingToReject(booking);
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = (reason: string) => {
    if (bookingToReject) {
      handleUpdateBookingStatus(bookingToReject, 'rejected', reason);
    }
  };

  const handleRescheduleClick = (booking: Booking) => {
    setBookingToReschedule(booking);
    setRescheduleDialogOpen(true);
  };

  const handleRescheduleSuccess = () => {
    setRescheduleDialogOpen(false);
    setBookingToReschedule(null);
  };

  const buildTimeTooltip = (iso: string) => {
    const d = parseISO(iso);
    const makeFull = (tz: string) =>
      new Intl.DateTimeFormat('pt-PT', {
        timeZone: tz,
        dateStyle: 'full',
        timeStyle: 'long',
      }).format(d);
    const makeOffset = (tz: string) =>
      new Intl.DateTimeFormat('pt-PT', { timeZone: tz, timeZoneName: 'shortOffset' })
        .formatToParts(d)
        .find((p) => p.type === 'timeZoneName')?.value ?? '';

    const selectedFull = `Fuso selecionado (${timeZone}): ${makeFull(timeZone)} (${makeOffset(timeZone)})`;
    if (timeZone === localTimeZone) return selectedFull;
    const localFull = `Hora local (${localTimeZone}): ${makeFull(localTimeZone)} (${makeOffset(localTimeZone)})`;
    return `${selectedFull}\n${localFull}`;
  };

  const handleCopyTime = async (text: string, bookingId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedBookingId(bookingId);
      toast({
        title: 'Copiado',
        description: 'Data e hora copiadas para a área de transferência.',
      });
      setTimeout(() => setCopiedBookingId((prev) => (prev === bookingId ? null : prev)), 2000);
    } catch {
      toast({
        title: 'Erro ao copiar',
        description: 'Não foi possível aceder à área de transferência.',
        variant: 'destructive',
      });
    }
  };

  const handleExportIcs = (booking: Booking) => {
    try {
      const start = parseISO(booking.scheduled_date);
      const end = new Date(start.getTime() + booking.duration_hours * 60 * 60 * 1000);
      const partner = booking.profiles.full_name || booking.profiles.username;
      const ics = buildIcsCalendar([
        {
          uid: `booking-${booking.id}@jammate`,
          start,
          end,
          title: `Jam session com ${partner}`,
          description: [
            `Músico: ${partner} (${booking.profiles.instrument})`,
            `Estado: ${getStatusLabel(booking.status)}`,
            booking.message ? `Mensagem: ${booking.message}` : null,
          ]
            .filter(Boolean)
            .join('\n'),
          url: `${window.location.origin}/calendar`,
          status:
            booking.status === 'accepted'
              ? 'CONFIRMED'
              : booking.status === 'pending'
              ? 'TENTATIVE'
              : 'CANCELLED',
        },
      ]);
      downloadIcs(`jam-session-${format(start, 'yyyy-MM-dd-HHmm')}.ics`, ics);
      toast({
        title: 'Ficheiro .ics criado',
        description: 'Importa-o no Google Calendar ou Apple Calendar.',
      });
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível gerar o ficheiro .ics.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (!user) return;

    const fetchBookings = async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          profiles!bookings_musician_id_fkey(username, full_name, instrument)
        `)
        .or(`requester_id.eq.${user.id},musician_id.eq.${user.id}`)
        .in('status', ['pending', 'accepted', 'rejected', 'cancelled'])
        .order('scheduled_date', { ascending: true });

      if (!error && data) {
        setBookings(data as any);
      }
      setLoading(false);
    };

    fetchBookings();

    // Two channels: postgres_changes filters are single-condition (AND), so
    // subscribe once per column we care about. RLS still limits payloads.
    const asRequester = supabase
      .channel(`bookings-req-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `requester_id=eq.${user.id}` },
        () => fetchBookings()
      )
      .subscribe();

    const asMusician = supabase
      .channel(`bookings-mus-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `musician_id=eq.${user.id}` },
        () => fetchBookings()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(asRequester);
      supabase.removeChannel(asMusician);
    };
  }, [user]);

  const bookingsForSelectedDate = bookings.filter((booking) =>
    isSameDay(parseISO(booking.scheduled_date), selectedDate)
  );

  const datesWithBookings = bookings.map((b) => parseISO(b.scheduled_date));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-500/20 text-green-700 dark:text-green-400';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400';
      case 'rejected':
        return 'bg-red-500/20 text-red-700 dark:text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-700 dark:text-gray-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'Confirmado';
      case 'pending':
        return 'Pendente';
      case 'rejected':
        return 'Rejeitado';
      case 'completed':
        return 'Concluído';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const BookingCard = ({ booking }: { booking: Booking }) => {
    const isPending = booking.status === 'pending';
    const isAccepted = booking.status === 'accepted';
    const isRejected = booking.status === 'rejected';
    const isReceivedRequest = isPending && booking.musician_id === user?.id;
    const canReschedule = isRejected && booking.requester_id === user?.id;
    const canCancel =
      (isPending || isAccepted) &&
      (booking.requester_id === user?.id || booking.musician_id === user?.id);
    const cancelLabel = isPending && booking.requester_id === user?.id ? 'Cancelar pedido' : 'Cancelar reserva';

    const t = formatBookingTime(booking.scheduled_date, timeZone);
    const timeTooltip = buildTimeTooltip(booking.scheduled_date);
    const timeParts = [`${t.time} ${t.offset}`];
    if (showDualTime) {
      const l = formatBookingTime(booking.scheduled_date, localTimeZone);
      timeParts.push(`(local: ${l.time} ${l.offset})`);
    }
    timeParts.push(`${booking.duration_hours}h`);

    return (
      <Card key={booking.id} className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">{booking.profiles.full_name || booking.profiles.username}</p>
                <p className="text-sm text-muted-foreground">{booking.profiles.instrument}</p>
              </div>
            </div>
            <Badge className={getStatusColor(booking.status)}>{getStatusLabel(booking.status)}</Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <time dateTime={booking.scheduled_date} title={timeTooltip}>
              {timeParts.join(' · ')}
            </time>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
              aria-label="Copiar data e hora completas"
              title="Copiar data e hora completas"
              onClick={() => handleCopyTime(timeTooltip, booking.id)}
            >
              {copiedBookingId === booking.id ? (
                <Check className="h-3 w-3 text-green-600" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
              aria-label="Exportar para calendário (.ics)"
              title="Exportar para calendário (.ics)"
              onClick={() => handleExportIcs(booking)}
            >
              <CalendarPlus className="h-3 w-3" />
            </Button>
          </div>
          {booking.message && (
            <p className="text-sm text-muted-foreground border-l-2 border-primary pl-2">{booking.message}</p>
          )}
          {booking.status === 'cancelled' && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-2 space-y-1">
              <p className="text-xs font-medium text-destructive">Motivo do cancelamento</p>
              <p className="text-sm text-muted-foreground">
                {booking.cancellation_reason?.trim() || 'Sem motivo indicado.'}
              </p>
            </div>
          )}
          {isReceivedRequest && (
            <div className="flex gap-2 pt-2">
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
          )}
          {canReschedule && (
            <div className="pt-2">
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
          )}
          {canCancel && !isReceivedRequest && (
            <div className="pt-2">
              <Button
                size="sm"
                variant="outline"
                className="w-full text-destructive hover:text-destructive"
                disabled={updatingBookingId === booking.id}
                onClick={() => setBookingToCancel(booking)}
              >
                <Ban className="h-4 w-4 mr-1" />
                {cancelLabel}
              </Button>
            </div>
          )}
          <BookingHistory bookingId={booking.id} />
        </div>
      </Card>
    );
  };

  if (embedded) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex flex-col items-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                locale={pt}
                modifiers={{
                  booked: datesWithBookings,
                }}
                modifiersStyles={{
                  booked: {
                    fontWeight: 'bold',
                    textDecoration: 'underline',
                  },
                }}
                className="rounded-md border pointer-events-auto"
              />
            </div>

            <div className="flex flex-col">
              <h3 className="text-lg font-semibold mb-4">
                {format(selectedDate, "d 'de' MMMM 'de' yyyy", { locale: pt })}
              </h3>
              <ScrollArea className="h-[300px] pr-4">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    A carregar...
                  </div>
                ) : bookingsForSelectedDate.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Sem jam sessions agendadas para este dia.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bookingsForSelectedDate.map((booking) => (
                      <BookingCard key={booking.id} booking={booking} />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </CardContent>
        
        <RejectBookingDialog
          open={rejectDialogOpen}
          onOpenChange={setRejectDialogOpen}
          onConfirm={handleRejectConfirm}
          isLoading={updatingBookingId !== null}
          musicianName={bookingToReject?.profiles.full_name || bookingToReject?.profiles.username || 'o músico'}
        />
        
        {bookingToReschedule && (
          <RescheduleBookingDialog
            open={rescheduleDialogOpen}
            onOpenChange={setRescheduleDialogOpen}
            bookingId={bookingToReschedule.id}
            musicianId={bookingToReschedule.musician_id}
            musicianName={bookingToReschedule.profiles.full_name || bookingToReschedule.profiles.username}
            originalDate={bookingToReschedule.scheduled_date}
            onSuccess={handleRescheduleSuccess}
          />
        )}

        <CancelBookingDialog
          open={!!bookingToCancel}
          onOpenChange={(open) => !open && setBookingToCancel(null)}
          onConfirm={handleCancelBooking}
          isLoading={updatingBookingId !== null}
          isAccepted={bookingToCancel?.status === 'accepted'}
        />
      </Card>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-2xl font-bold">Agenda de Jam Sessions</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden">
          <div className="grid md:grid-cols-2 gap-6 h-full">
            <div className="flex flex-col items-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                locale={pt}
                modifiers={{
                  booked: datesWithBookings,
                }}
                modifiersStyles={{
                  booked: {
                    fontWeight: 'bold',
                    textDecoration: 'underline',
                  },
                }}
                className="rounded-md border pointer-events-auto"
              />
            </div>

            <div className="flex flex-col">
              <h3 className="text-lg font-semibold mb-4">
                {format(selectedDate, "d 'de' MMMM 'de' yyyy", { locale: pt })}
              </h3>
              <ScrollArea className="flex-1 pr-4">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    A carregar...
                  </div>
                ) : bookingsForSelectedDate.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Sem jam sessions agendadas para este dia.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bookingsForSelectedDate.map((booking) => (
                      <BookingCard key={booking.id} booking={booking} />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <RejectBookingDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        onConfirm={handleRejectConfirm}
        isLoading={updatingBookingId !== null}
        musicianName={bookingToReject?.profiles.full_name || bookingToReject?.profiles.username || 'o músico'}
      />
      
      {bookingToReschedule && (
        <RescheduleBookingDialog
          open={rescheduleDialogOpen}
          onOpenChange={setRescheduleDialogOpen}
          bookingId={bookingToReschedule.id}
          musicianId={bookingToReschedule.musician_id}
          musicianName={bookingToReschedule.profiles.full_name || bookingToReschedule.profiles.username}
          originalDate={bookingToReschedule.scheduled_date}
          onSuccess={handleRescheduleSuccess}
        />
      )}

      <CancelBookingDialog
        open={!!bookingToCancel}
        onOpenChange={(open) => !open && setBookingToCancel(null)}
        onConfirm={handleCancelBooking}
        isLoading={updatingBookingId !== null}
        isAccepted={bookingToCancel?.status === 'accepted'}
      />
    </div>
  );
};

export default CalendarPanel;
