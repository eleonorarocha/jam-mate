import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Check, XCircle, Ban, Send, RefreshCw, Circle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

const userTimeZone =
  (typeof Intl !== 'undefined' && Intl.DateTimeFormat().resolvedOptions().timeZone) || 'UTC';

interface BookingEvent {
  id: string;
  event_type: string;
  actor_id: string | null;
  reason: string | null;
  created_at: string;
}

interface BookingHistoryProps {
  bookingId: string;
}

const EVENT_META: Record<string, { label: string; Icon: any; className: string }> = {
  requested: { label: 'Pedido enviado', Icon: Send, className: 'text-blue-600 dark:text-blue-400' },
  pending: { label: 'Pedido pendente', Icon: Circle, className: 'text-yellow-600 dark:text-yellow-400' },
  accepted: { label: 'Reserva aceite', Icon: Check, className: 'text-green-600 dark:text-green-400' },
  rejected: { label: 'Pedido recusado', Icon: XCircle, className: 'text-red-600 dark:text-red-400' },
  cancelled: { label: 'Reserva cancelada', Icon: Ban, className: 'text-destructive' },
  completed: { label: 'Sessão concluída', Icon: Check, className: 'text-green-600 dark:text-green-400' },
  rescheduled: { label: 'Reagendada', Icon: RefreshCw, className: 'text-primary' },
};

const BookingHistory = ({ bookingId }: BookingHistoryProps) => {
  const [events, setEvents] = useState<BookingEvent[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const { data } = await supabase
        .from('booking_events' as any)
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true });
      if (active && data) setEvents(data as any);
    };
    load();

    const channel = supabase
      .channel(`booking-events-${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'booking_events',
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload) => {
          setEvents((prev) => {
            if (prev.some((e) => e.id === (payload.new as any).id)) return prev;
            return [...prev, payload.new as any];
          });
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [bookingId]);

  if (events.length === 0) return null;

  return (
    <div className="pt-2 border-t">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-full justify-between h-8 px-2 text-xs"
        onClick={() => setOpen((v) => !v)}
      >
        <span>Histórico ({events.length})</span>
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </Button>
      {open && (
        <ol className="mt-2 space-y-2 pl-1">
          {events.map((e) => {
            const meta = EVENT_META[e.event_type] ?? {
              label: e.event_type,
              Icon: Circle,
              className: 'text-muted-foreground',
            };
            const Icon = meta.Icon;
            return (
              <li key={e.id} className="flex gap-2 text-xs">
                <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${meta.className}`} />
                <div className="flex-1">
                  <p className="font-medium">{meta.label}</p>
                  <p className="text-muted-foreground">
                    {format(parseISO(e.created_at), "d MMM yyyy 'às' HH:mm", { locale: pt })}
                  </p>
                  {e.reason?.trim() && (
                    <p className="text-muted-foreground italic mt-0.5">"{e.reason}"</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
};

export default BookingHistory;
