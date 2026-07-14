import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { CalendarIcon, CheckCircle2, ChevronLeft, Clock, Loader2, MessageSquare, User } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface BookingDialogProps {
  musicianId: string;
  onClose: () => void;
}

type Step = 'form' | 'review' | 'sent';

interface MusicianInfo {
  username: string | null;
  first_name: string | null;
  instrument: string | null;
  avatar_url: string | null;
}

const BookingDialog = ({ musicianId, onClose }: BookingDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>('form');
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState<string>('20:00');
  const [duration, setDuration] = useState<string>('2');
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [musician, setMusician] = useState<MusicianInfo | null>(null);
  const [busySlots, setBusySlots] = useState<Array<{ start: Date; end: Date }>>([]);
  const [busyLoading, setBusyLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: profile }, { data: slots }] = await Promise.all([
        supabase
          .from('profiles')
          .select('username, first_name, instrument, avatar_url')
          .eq('id', musicianId)
          .maybeSingle(),
        supabase.rpc('get_musician_busy_slots', { _musician_id: musicianId }),
      ]);
      if (cancelled) return;
      setMusician(profile as MusicianInfo | null);
      const mapped = (slots ?? []).map((s: any) => {
        const start = new Date(s.scheduled_date);
        const end = new Date(start.getTime() + (s.duration_hours ?? 0) * 3600_000);
        return { start, end };
      });
      setBusySlots(mapped);
      setBusyLoading(false);
    })();
    return () => { cancelled = true; };
  }, [musicianId]);

  const musicianName = musician?.first_name || musician?.username || 'músico';

  const buildScheduledDate = (): Date | null => {
    if (!date) return null;
    const [hh, mm] = time.split(':').map((v) => parseInt(v, 10));
    if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
    const d = new Date(date);
    d.setHours(hh, mm, 0, 0);
    return d;
  };

  const scheduled = buildScheduledDate();
  const isPast = scheduled ? scheduled.getTime() <= Date.now() : false;

  // A day is fully blocked when 24h are covered by busy slots — rare, so we
  // just mark a day as unavailable when there is at least one busy slot AND
  // every hour between 8h and 24h is already occupied.
  const isDayFullyBooked = (d: Date) => {
    const dayStart = new Date(d); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(d); dayEnd.setHours(23, 59, 59, 999);
    const daySlots = busySlots.filter((s) => s.end > dayStart && s.start < dayEnd);
    if (daySlots.length === 0) return false;
    // Consider blocked if any slot covers the typical evening (18h-23h) fully
    let covered = 0;
    for (let h = 8; h < 24; h++) {
      const hourStart = new Date(d); hourStart.setHours(h, 0, 0, 0);
      const hourEnd = new Date(hourStart.getTime() + 3600_000);
      if (daySlots.some((s) => s.start < hourEnd && s.end > hourStart)) covered++;
    }
    return covered >= 16;
  };

  const durationHours = parseInt(duration, 10);
  const requestedEnd = scheduled
    ? new Date(scheduled.getTime() + (Number.isNaN(durationHours) ? 0 : durationHours) * 3600_000)
    : null;

  const conflictingSlot = scheduled && requestedEnd
    ? busySlots.find((s) => s.start < requestedEnd && s.end > scheduled)
    : null;

  const hasConflict = !!conflictingSlot;

  const canReview = !!scheduled && !isPast && durationHours > 0 && !hasConflict && !busyLoading;

  const sameDayBusy = date
    ? busySlots
        .filter((s) => {
          const sd = new Date(s.start); sd.setHours(0, 0, 0, 0);
          const dd = new Date(date); dd.setHours(0, 0, 0, 0);
          return sd.getTime() === dd.getTime();
        })
        .sort((a, b) => a.start.getTime() - b.start.getTime())
    : [];


  const handleGoReview = () => {
    if (!canReview) return;
    setStep('review');
  };

  const handleSubmit = async () => {
    if (!user || !scheduled) return;
    setLoading(true);

    try {
      const { error } = await supabase.from('bookings').insert({
        requester_id: user.id,
        musician_id: musicianId,
        scheduled_date: scheduled.toISOString(),
        duration_hours: parseInt(duration, 10),
        message: message || null,
      });
      if (error) throw error;

      // Fire-and-forget email notification; the musician also gets a realtime
      // in-app notification via useRealtimeNotifications (INSERT on bookings).
      supabase.functions
        .invoke('send-booking-notification', {
          body: {
            musicianId,
            requesterId: user.id,
            scheduledDate: scheduled.toISOString(),
            durationHours: parseInt(duration, 10),
            message: message || undefined,
          },
        })
        .catch((err) => console.error('send-booking-notification failed:', err));

      setStep('sent');
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message ?? 'Não foi possível enviar o pedido.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formattedDate = scheduled
    ? format(scheduled, "EEEE, d 'de' MMMM 'às' HH:mm", { locale: pt })
    : '';

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        {step === 'form' && (
          <>
            <DialogHeader>
              <DialogTitle>Agendar Jam Session</DialogTitle>
              <DialogDescription>
                Escolha a data, hora e duração para tocar com {musicianName}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Data</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !date && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "d 'de' MMMM 'de' yyyy", { locale: pt }) : 'Escolher data'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      disabled={(d) =>
                        d < new Date(new Date().setHours(0, 0, 0, 0)) || isDayFullyBooked(d)
                      }
                      initialFocus
                      className={cn('p-3 pointer-events-auto')}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="time">Hora</Label>
                  <div className="relative">
                    <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="time"
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duração (h)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="1"
                    max="8"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Mensagem (opcional)</Label>
                <Textarea
                  id="message"
                  placeholder="Descreva o tipo de jam que pretende, estilos, local sugerido..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground text-right">{message.length}/500</p>
              </div>

              {date && sameDayBusy.length > 0 && (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs space-y-1">
                  <p className="font-medium text-amber-700 dark:text-amber-400">
                    {musicianName} já tem {sameDayBusy.length} sessão{sameDayBusy.length > 1 ? 'ões' : ''} neste dia:
                  </p>
                  <ul className="text-muted-foreground space-y-0.5">
                    {sameDayBusy.map((s, i) => (
                      <li key={i}>
                        • {format(s.start, 'HH:mm', { locale: pt })} – {format(s.end, 'HH:mm', { locale: pt })}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {isPast && date && (
                <p className="text-sm text-destructive">A data/hora escolhida já passou.</p>
              )}

              {hasConflict && !isPast && (
                <p className="text-sm text-destructive">
                  Este horário choca com uma reserva existente
                  {conflictingSlot
                    ? ` (${format(conflictingSlot.start, 'HH:mm')}–${format(conflictingSlot.end, 'HH:mm')})`
                    : ''}
                  . Escolha outra hora.
                </p>
              )}
            </div>


            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="ghost" onClick={onClose}>Cancelar</Button>
              <Button onClick={handleGoReview} disabled={!canReview}>
                Rever pedido
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'review' && (
          <>
            <DialogHeader>
              <DialogTitle>Confirmar pedido</DialogTitle>
              <DialogDescription>
                Reveja os detalhes antes de enviar a {musicianName}.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-lg border bg-muted/40 p-4 space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <div className="text-muted-foreground text-xs">Músico</div>
                  <div className="font-medium">{musicianName}{musician?.instrument ? ` · ${musician.instrument}` : ''}</div>
                </div>
              </div>
              <Separator />
              <div className="flex items-start gap-3">
                <CalendarIcon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <div className="text-muted-foreground text-xs">Quando</div>
                  <div className="font-medium capitalize">{formattedDate}</div>
                </div>
              </div>
              <Separator />
              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <div className="text-muted-foreground text-xs">Duração</div>
                  <div className="font-medium">{duration} hora{parseInt(duration, 10) > 1 ? 's' : ''}</div>
                </div>
              </div>
              {message && (
                <>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <div className="text-muted-foreground text-xs">Mensagem</div>
                      <div className="italic">"{message}"</div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="ghost" onClick={() => setStep('form')} disabled={loading}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    A enviar...
                  </>
                ) : (
                  'Confirmar e enviar'
                )}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'sent' && (
          <>
            <DialogHeader>
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <DialogTitle className="text-center">Pedido enviado!</DialogTitle>
              <DialogDescription className="text-center">
                {musicianName} vai receber uma notificação e um email com os detalhes.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-lg border bg-muted/40 p-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Quando</span>
                <span className="font-medium text-right capitalize">{formattedDate}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Duração</span>
                <span className="font-medium">{duration}h</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Estado</span>
                <span className="font-medium text-primary">A aguardar resposta</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Pode acompanhar o pedido em "Calendário". Vamos notificá-lo assim que {musicianName} responder.
            </p>

            <DialogFooter>
              <Button onClick={onClose} className="w-full">Fechar</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BookingDialog;
