import { useState } from 'react';
import { Star } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface RatingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  musicianId: string;
  musicianName: string;
  onRatingComplete?: () => void;
}

interface RatingCategory {
  key: 'location' | 'respect' | 'punctuality' | 'enjoyment';
  label: string;
  description: string;
}

const ratingCategories: RatingCategory[] = [
  { key: 'location', label: 'Local', description: 'O local foi adequado?' },
  { key: 'respect', label: 'Respeito', description: 'Foi respeitoso/a?' },
  { key: 'punctuality', label: 'Pontualidade', description: 'Foi pontual?' },
  { key: 'enjoyment', label: 'Gostei?', description: 'Gostou da experiência?' },
];

const RatingDialog = ({
  isOpen,
  onClose,
  bookingId,
  musicianId,
  musicianName,
  onRatingComplete,
}: RatingDialogProps) => {
  const [ratings, setRatings] = useState({
    location: 0,
    respect: 0,
    punctuality: 0,
    enjoyment: 0,
  });
  const [hoveredRatings, setHoveredRatings] = useState({
    location: 0,
    respect: 0,
    punctuality: 0,
    enjoyment: 0,
  });
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const calculateOverallRating = () => {
    const values = Object.values(ratings).filter(r => r > 0);
    if (values.length === 0) return 0;
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  };

  const allRatingsSet = Object.values(ratings).every(r => r > 0);

  const handleSubmit = async () => {
    if (!user || !allRatingsSet) return;

    setLoading(true);
    try {
      const overallRating = calculateOverallRating();

      const { error } = await supabase.from('ratings').insert({
        booking_id: bookingId,
        rated_user_id: musicianId,
        rater_id: user.id,
        rating: overallRating,
        location_rating: ratings.location,
        respect_rating: ratings.respect,
        punctuality_rating: ratings.punctuality,
        enjoyment_rating: ratings.enjoyment,
        comment: comment.trim() || null,
      });

      if (error) throw error;

      toast({
        title: 'Avaliação enviada!',
        description: 'Obrigado pelo seu feedback. Ajuda a manter a comunidade segura.',
      });

      onRatingComplete?.();
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

  const renderStars = (category: RatingCategory['key']) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRatings({ ...ratings, [category]: star })}
            onMouseEnter={() => setHoveredRatings({ ...hoveredRatings, [category]: star })}
            onMouseLeave={() => setHoveredRatings({ ...hoveredRatings, [category]: 0 })}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={`h-6 w-6 ${
                star <= (hoveredRatings[category] || ratings[category])
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-muted-foreground'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Avaliar Jam Session</DialogTitle>
          <DialogDescription>
            Como foi a sua experiência com {musicianName}? A sua avaliação ajuda a manter a comunidade segura.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {ratingCategories.map((category) => (
            <div key={category.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">{category.label}</Label>
                  <p className="text-xs text-muted-foreground">{category.description}</p>
                </div>
                {renderStars(category.key)}
              </div>
            </div>
          ))}

          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-4">
              <span className="font-medium">Média Geral</span>
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-5 w-5 ${
                        star <= calculateOverallRating()
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-muted-foreground'
                      }`}
                    />
                  ))}
                </div>
                <span className="font-bold">{calculateOverallRating()}/5</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Comentário</Label>
            <Textarea
              id="comment"
              placeholder="Partilhe mais detalhes sobre a sua experiência..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              O seu comentário ajuda outros músicos a tomarem decisões informadas.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!allRatingsSet || loading}>
            {loading ? 'A enviar...' : 'Enviar Avaliação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RatingDialog;