import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface Rating {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  rater: {
    username: string;
    avatar_url: string | null;
  };
  rated_user: {
    username: string;
    avatar_url: string | null;
  };
}

const Ratings = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [receivedRatings, setReceivedRatings] = useState<Rating[]>([]);
  const [givenRatings, setGivenRatings] = useState<Rating[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      loadRatings();
    }
  }, [user]);

  const loadRatings = async () => {
    if (!user) return;

    // Load received ratings
    const { data: received } = await supabase
      .from('ratings')
      .select(`
        id,
        rating,
        comment,
        created_at,
        rater:profiles!ratings_rater_id_fkey(username, avatar_url),
        rated_user:profiles!ratings_rated_user_id_fkey(username, avatar_url)
      `)
      .eq('rated_user_id', user.id)
      .order('created_at', { ascending: false });

    if (received) {
      setReceivedRatings(received as unknown as Rating[]);
    }

    // Load given ratings
    const { data: given } = await supabase
      .from('ratings')
      .select(`
        id,
        rating,
        comment,
        created_at,
        rater:profiles!ratings_rater_id_fkey(username, avatar_url),
        rated_user:profiles!ratings_rated_user_id_fkey(username, avatar_url)
      `)
      .eq('rater_id', user.id)
      .order('created_at', { ascending: false });

    if (given) {
      setGivenRatings(given as unknown as Rating[]);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
            }`}
          />
        ))}
      </div>
    );
  };

  const renderRatingCard = (rating: Rating, showRater: boolean) => {
    const profile = showRater ? rating.rater : rating.rated_user;
    
    return (
      <Card key={rating.id}>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Avatar>
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback>
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">{profile?.username || 'Utilizador'}</span>
                {renderStars(rating.rating)}
              </div>
              {rating.comment && (
                <p className="text-sm text-muted-foreground">{rating.comment}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {format(new Date(rating.created_at), "d 'de' MMMM 'de' yyyy", { locale: pt })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 pt-24 pb-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Avaliações</h1>
            <p className="text-muted-foreground">
              Veja as avaliações recebidas e enviadas
            </p>
          </div>

          <Tabs defaultValue="received" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="received">
                Recebidas ({receivedRatings.length})
              </TabsTrigger>
              <TabsTrigger value="given">
                Enviadas ({givenRatings.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="received" className="mt-6 space-y-4">
              {receivedRatings.length === 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Sem avaliações</CardTitle>
                    <CardDescription>
                      Ainda não recebeu nenhuma avaliação. Complete jam sessions para receber feedback!
                    </CardDescription>
                  </CardHeader>
                </Card>
              ) : (
                receivedRatings.map((rating) => renderRatingCard(rating, true))
              )}
            </TabsContent>

            <TabsContent value="given" className="mt-6 space-y-4">
              {givenRatings.length === 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Sem avaliações</CardTitle>
                    <CardDescription>
                      Ainda não avaliou ninguém. Após completar jam sessions, poderá avaliar os músicos.
                    </CardDescription>
                  </CardHeader>
                </Card>
              ) : (
                givenRatings.map((rating) => renderRatingCard(rating, false))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Ratings;
