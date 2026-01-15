import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface BookingDialogProps {
  musicianId: string;
  onClose: () => void;
}

const BookingDialog = ({ musicianId, onClose }: BookingDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [date, setDate] = useState('');
  const [duration, setDuration] = useState('2');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      const { error } = await supabase.from('bookings').insert({
        requester_id: user.id,
        musician_id: musicianId,
        scheduled_date: date,
        duration_hours: parseInt(duration),
        message: message,
      });

      if (error) throw error;

      // Send email notification to musician
      await supabase.functions.invoke('send-booking-notification', {
        body: {
          musicianId,
          requesterId: user.id,
          scheduledDate: date,
          durationHours: parseInt(duration),
          message: message || undefined,
        },
      });

      toast({
        title: 'Pedido enviado!',
        description: 'O músico irá receber o seu pedido de agendamento.',
      });
      onClose();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agendar Jam Session</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date">Data e Hora</Label>
            <Input
              id="date"
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="duration">Duração (horas)</Label>
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
          <div className="space-y-2">
            <Label htmlFor="message">Mensagem (opcional)</Label>
            <Textarea
              id="message"
              placeholder="Descreva o tipo de jam que pretende..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'A enviar...' : 'Enviar Pedido'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BookingDialog;
