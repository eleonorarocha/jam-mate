import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, MapPin, Star, MessageSquare, Calendar, CheckCircle, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import BookingDialog from './BookingDialog';

interface MusicianPopupProps {
  musician: {
    id: string;
    username: string;
    instrument: string;
    skill_level: string;
    city: string | null;
    country: string | null;
    latitude: number | null;
    longitude: number | null;
    average_rating: number | null;
    total_ratings: number | null;
    avatar_url: string | null;
    bio: string | null;
  };
  onClose: () => void;
}

const MusicianPopup = ({ musician, onClose }: MusicianPopupProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showBooking, setShowBooking] = useState(false);
  const [hasAcceptedBooking, setHasAcceptedBooking] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  // Check if there's an accepted booking and get verification status
  useEffect(() => {
    const checkBookingAndVerification = async () => {
      if (!user) return;

      // Check for accepted/completed booking
      const { data: booking } = await supabase
        .from('bookings')
        .select('id')
        .or(`and(requester_id.eq.${user.id},musician_id.eq.${musician.id}),and(musician_id.eq.${user.id},requester_id.eq.${musician.id})`)
        .in('status', ['accepted', 'completed'])
        .limit(1)
        .single();

      setHasAcceptedBooking(!!booking);

      // Get verification status (public field)
      const { data: profile } = await supabase
        .from('profiles')
        .select('phone_verified, email_verified, identity_verified')
        .eq('id', musician.id)
        .single();

      setIsVerified(profile?.phone_verified || profile?.email_verified || false);
    };

    checkBookingAndVerification();
  }, [user, musician.id]);

  const handleMessage = async () => {
    if (!user) return;

    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: musician.id,
      content: 'Olá! Gostaria de conversar sobre uma jam session.',
    });

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar a mensagem.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Mensagem enviada!',
        description: 'A sua mensagem foi enviada com sucesso.',
      });
      onClose();
    }
  };

  // Only show username publicly - name is protected
  const displayName = musician.username;

  return (
    <>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 w-full max-w-md p-4">
        <Card className="shadow-2xl">
          <CardHeader className="relative pb-4">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
            <div className="flex items-start gap-4">
              {musician.avatar_url && (
                <img
                  src={musician.avatar_url}
                  alt={displayName}
                  className="w-16 h-16 rounded-full object-cover border-2 border-primary"
                />
              )}
              <div className="flex-1">
                <CardTitle className="text-xl mb-1">
                  {displayName}
                </CardTitle>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                  <MapPin className="h-3 w-3" />
                  {musician.city}, {musician.country}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-primary text-primary" />
                    <span className="text-sm font-medium">
                      {musician.average_rating?.toFixed(1) || '0.0'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({musician.total_ratings || 0} avaliações)
                    </span>
                  </div>
                  {isVerified && (
                    <Badge variant="secondary" className="text-xs flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Verificado
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <Badge variant="secondary">{musician.instrument || 'Não especificado'}</Badge>
              <Badge variant="outline">{musician.skill_level}</Badge>
            </div>
            
            {musician.bio && (
              <p className="text-sm text-muted-foreground">{musician.bio}</p>
            )}

            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">
                <strong>Nota:</strong> O local exato do encontro é combinado entre os participantes 
                após confirmação mútua do agendamento.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={handleMessage}
                disabled={user?.id === musician.id}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Mensagem
              </Button>
              <Button
                className="flex-1"
                variant="secondary"
                onClick={() => setShowBooking(true)}
                disabled={user?.id === musician.id}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Agendar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {showBooking && (
        <BookingDialog
          musicianId={musician.id}
          onClose={() => setShowBooking(false)}
        />
      )}
    </>
  );
};

export default MusicianPopup;