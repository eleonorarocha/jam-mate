import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface RescheduleBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  musicianId: string;
  musicianName: string;
  originalDate: string;
  onSuccess: () => void;
}

const RescheduleBookingDialog = ({
  open,
  onOpenChange,
  bookingId,
  musicianId,
  musicianName,
  originalDate,
  onSuccess,
}: RescheduleBookingDialogProps) => {
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
      // Create a new booking request (instead of updating the rejected one)
      const { error } = await supabase.from('bookings').insert({
        requester_id: user.id,
        musician_id: musicianId,
        scheduled_date: date,
        duration_hours: parseInt(duration),
        message: message || `Reagendamento do pedido anterior (${new Date(originalDate).toLocaleDateString('pt-PT')})`,
      });

      if (error) throw error;

      // Send email notification to musician
      await supabase.functions.invoke('send-booking-notification', {
        body: {
          musicianId,
          requesterId: user.id,
          scheduledDate: date,
          durationHours: parseInt(duration),
          message: message || `Reagendamento do pedido anterior`,
        },
      });

      toast({
        title: 'Pedido reenviado!',
        description: 'O músico irá receber o novo pedido de agendamento.',
      });
      
      onSuccess();
      onOpenChange(false);
      resetForm();
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

  const resetForm = () => {
    setDate('');
    setDuration('2');
    setMessage('');
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reagendar Jam Session</DialogTitle>
          <DialogDescription>
            Enviar um novo pedido de jam session para {musicianName} com uma nova data.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reschedule-date">Nova Data e Hora</Label>
            <Input
              id="reschedule-date"
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reschedule-duration">Duração (horas)</Label>
            <Input
              id="reschedule-duration"
              type="number"
              min="1"
              max="8"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reschedule-message">Mensagem (opcional)</Label>
            <Textarea
              id="reschedule-message"
              placeholder="Ex: Seria possível neste novo horário?"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? 'A enviar...' : 'Enviar Novo Pedido'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RescheduleBookingDialog;
