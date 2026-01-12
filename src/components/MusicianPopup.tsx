import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, MapPin, Star, MessageSquare, Calendar, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import BookingDialog from './BookingDialog';

interface MusicianPopupProps {
  musician: {
    id: string;
    username: string;
    instrument: string;
    city: string | null;
    country: string | null;
    average_rating: number | null;
    total_ratings: number | null;
    avatar_url: string | null;
  };
  onClose: () => void;
}

const MusicianPopup = ({ musician, onClose }: MusicianPopupProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [showBooking, setShowBooking] = useState(false);

  const handleViewProfile = () => {
    navigate(`/profile/${musician.id}`);
  };

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

  return (
    <>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 w-full max-w-sm p-4">
        <Card className="shadow-2xl">
          <CardHeader className="relative pb-3">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden border-2 border-primary">
                {musician.avatar_url ? (
                  <img
                    src={musician.avatar_url}
                    alt={musician.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-lg font-semibold text-primary">
                    {musician.username?.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <button 
                  onClick={handleViewProfile}
                  className="text-left hover:underline"
                >
                  <CardTitle className="text-lg">{musician.username}</CardTitle>
                </button>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {musician.city}{musician.country ? `, ${musician.country}` : ''}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="flex items-center justify-between">
              <Badge variant="secondary">{musician.instrument || 'Instrumento não especificado'}</Badge>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-primary text-primary" />
                <span className="text-sm font-medium">
                  {musician.average_rating?.toFixed(1) || '0.0'}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({musician.total_ratings || 0})
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleViewProfile}
                className="w-full"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Ver Perfil Completo
              </Button>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={handleMessage}
                  disabled={user?.id === musician.id}
                >
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Mensagem
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  variant="secondary"
                  onClick={() => setShowBooking(true)}
                  disabled={user?.id === musician.id}
                >
                  <Calendar className="h-4 w-4 mr-1" />
                  Agendar
                </Button>
              </div>
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