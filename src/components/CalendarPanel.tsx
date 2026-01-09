import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { X, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, isSameDay, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';

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
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

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
        .in('status', ['pending', 'accepted'])
        .order('scheduled_date', { ascending: true });

      if (!error && data) {
        setBookings(data as any);
      }
      setLoading(false);
    };

    fetchBookings();

    const channel = supabase
      .channel('bookings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `requester_id=eq.${user.id},musician_id=eq.${user.id}`,
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
                      <Card key={booking.id} className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium">
                                  {booking.profiles.full_name || booking.profiles.username}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {booking.profiles.instrument}
                                </p>
                              </div>
                            </div>
                            <Badge className={getStatusColor(booking.status)}>
                              {getStatusLabel(booking.status)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>
                              {format(parseISO(booking.scheduled_date), 'HH:mm')} -{' '}
                              {booking.duration_hours}h
                            </span>
                          </div>
                          {booking.message && (
                            <p className="text-sm text-muted-foreground border-l-2 border-primary pl-2">
                              {booking.message}
                            </p>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </CardContent>
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
                      <Card key={booking.id} className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium">
                                  {booking.profiles.full_name || booking.profiles.username}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {booking.profiles.instrument}
                                </p>
                              </div>
                            </div>
                            <Badge className={getStatusColor(booking.status)}>
                              {getStatusLabel(booking.status)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>
                              {format(parseISO(booking.scheduled_date), 'HH:mm')} -{' '}
                              {booking.duration_hours}h
                            </span>
                          </div>
                          {booking.message && (
                            <p className="text-sm text-muted-foreground border-l-2 border-primary pl-2">
                              {booking.message}
                            </p>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CalendarPanel;
