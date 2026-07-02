import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  MapPin, 
  Star, 
  MessageSquare, 
  Calendar, 
  Music, 
  User,
  CheckCircle,
  Ban,
  Heart
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useBlockedUsers } from '@/hooks/useBlockedUsers';
import Header from '@/components/Header';
import BookingDialog from '@/components/BookingDialog';
import BlockUserButton from '@/components/BlockUserButton';
import FavoriteButton from '@/components/FavoriteButton';
import JsonLd from '@/components/JsonLd';
import PublicMusicSnippet from '@/components/PublicMusicSnippet';

interface ProfileData {
  id: string;
  username: string;
  first_name: string | null;
  bio: string | null;
  instrument: string;
  skill_level: string;
  city: string | null;
  country: string | null;
  average_rating: number | null;
  total_ratings: number | null;
  avatar_url: string | null;
  gender: string | null;
  phone_verified: boolean | null;
  email_verified: boolean | null;
}

interface Rating {
  id: string;
  rating: number;
  comment: string | null;
  punctuality_rating: number | null;
  respect_rating: number | null;
  location_rating: number | null;
  enjoyment_rating: number | null;
  created_at: string;
  rater_id: string;
}

const genderLabels: Record<string, string> = {
  male: 'Masculino',
  female: 'Feminino',
  other: 'Outro',
  prefer_not_to_say: 'Prefere não dizer',
};

const skillLevelLabels: Record<string, string> = {
  beginner: 'Iniciante',
  intermediate: 'Intermediário',
  advanced: 'Avançado',
  professional: 'Profissional',
};

const PublicProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { isBlocked } = useBlockedUsers();
  
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBooking, setShowBooking] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    if (id) {
      loadProfile();
      loadRatings();
    }
  }, [id]);

  const loadProfile = async () => {
    if (!id) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, first_name, bio, instrument, skill_level, city, country, average_rating, total_ratings, avatar_url, gender')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      toast({
        title: 'Erro',
        description: 'Perfil não encontrado.',
        variant: 'destructive',
      });
      navigate('/map');
      return;
    }

    const { data: sensitive } = await supabase.rpc('get_profile_sensitive', { _profile_id: id });
    const s = sensitive?.[0];
    setProfile({ ...data, phone_verified: s?.phone_verified ?? null, email_verified: s?.email_verified ?? null });
    setIsVerified(s?.phone_verified || s?.email_verified || false);
    setLoading(false);
  };

  const loadRatings = async () => {
    if (!id) return;

    const { data } = await supabase
      .from('ratings')
      .select('id, rating, comment, punctuality_rating, respect_rating, location_rating, enjoyment_rating, created_at, rater_id')
      .eq('rated_user_id', id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      setRatings(data);
    }
  };

  const handleMessage = async () => {
    if (!user) {
      toast({
        title: 'Sessão necessária',
        description: 'Faça login para enviar mensagens.',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    if (!profile) return;

    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: profile.id,
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
      navigate('/messages');
    }
  };

  const handleBooking = () => {
    if (!user) {
      toast({
        title: 'Sessão necessária',
        description: 'Faça login para agendar.',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }
    setShowBooking(true);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  const isOwnProfile = user?.id === profile.id;

  const personSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.first_name || profile.username,
    alternateName: profile.username,
    identifier: profile.id,
    url: `/profile/${profile.id}`,
    description: profile.bio || `${profile.instrument} no JamMate.`,
    jobTitle: 'Músico',
    knowsAbout: profile.instrument ? [profile.instrument] : undefined,
    image: profile.avatar_url || undefined,
    address: (profile.city || profile.country)
      ? {
          '@type': 'PostalAddress',
          addressLocality: profile.city || undefined,
          addressCountry: profile.country || undefined,
        }
      : undefined,
    aggregateRating:
      profile.average_rating && profile.total_ratings
        ? {
            '@type': 'AggregateRating',
            ratingValue: profile.average_rating,
            ratingCount: profile.total_ratings,
            bestRating: 5,
            worstRating: 1,
          }
        : undefined,
  };

  return (
    <div className="min-h-screen bg-background">
      <JsonLd id={`profile-${profile.id}`} data={personSchema} />
      <Header />
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Main Profile Card */}
          <Card className="md:col-span-2">
            <CardHeader className="pb-4">
              <div className="flex items-start gap-4">
                <Avatar className="h-20 w-20 border-2 border-primary">
                  <AvatarImage src={profile.avatar_url || undefined} alt={profile.username} />
                  <AvatarFallback className="text-2xl bg-primary/20 text-primary">
                    {profile.username?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-2xl">{profile.first_name || profile.username}</CardTitle>
                    {isVerified && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Verificado
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground">@{profile.username}</p>
                  {(profile.city || profile.country) && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                      <MapPin className="h-3 w-3" />
                      {profile.city}{profile.country ? `, ${profile.country}` : ''}
                    </div>
                  )}
                </div>
                {!isOwnProfile && (
                  <FavoriteButton musicianId={profile.id} size="default" />
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Info Badges */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Music className="h-3 w-3" />
                  {profile.instrument || t('map.popup.no_instrument')}
                </Badge>
                {profile.skill_level ? (
                  <Badge variant="outline">
                    {skillLevelLabels[profile.skill_level] || profile.skill_level}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    {t('map.popup.no_skill_level')}
                  </Badge>
                )}
                {profile.gender && profile.gender !== 'prefer_not_to_say' && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {genderLabels[profile.gender] || profile.gender}
                  </Badge>
                )}
              </div>

              {/* Bio */}
              {profile.bio && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-2">Sobre</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">{profile.bio}</p>
                  </div>
                </>
              )}

              {/* Music Snippet */}
              <Separator />
              <div>
                <h3 className="font-semibold mb-2">O som</h3>
                <PublicMusicSnippet userId={profile.id} />
              </div>

              {/* Action Buttons */}
              {!isOwnProfile && (
                <>
                  <Separator />
                  <div className="flex flex-wrap gap-3">
                    <Button className="flex-1" onClick={handleMessage}>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Enviar Mensagem
                    </Button>
                    <Button variant="secondary" className="flex-1" onClick={handleBooking}>
                      <Calendar className="h-4 w-4 mr-2" />
                      Agendar Jam
                    </Button>
                  </div>
                  <div className="pt-2">
                    <BlockUserButton 
                      userId={profile.id} 
                      username={profile.username}
                      variant="outline"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Rating Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Star className="h-5 w-5 fill-primary text-primary" />
                Avaliações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                {profile.average_rating != null ? (
                  <>
                    <div className="text-4xl font-bold text-primary">
                      {profile.average_rating.toFixed(1)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {profile.total_ratings || 0} avaliações
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t('map.popup.no_rating')}
                  </p>
                )}
              </div>

              {ratings.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    {ratings.slice(0, 3).map((rating) => (
                      <div key={rating.id} className="text-sm">
                        <div className="flex items-center gap-1 mb-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3 w-3 ${
                                i < rating.rating
                                  ? 'fill-primary text-primary'
                                  : 'text-muted-foreground'
                              }`}
                            />
                          ))}
                        </div>
                        {rating.comment && (
                          <p className="text-muted-foreground line-clamp-2">
                            "{rating.comment}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {ratings.length === 0 && (
                <p className="text-sm text-muted-foreground text-center">
                  Ainda não há avaliações.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detailed Ratings Section */}
        {ratings.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Todas as Avaliações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {ratings.map((rating) => (
                  <div key={rating.id} className="border-b pb-4 last:border-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < rating.rating
                                ? 'fill-primary text-primary'
                                : 'text-muted-foreground'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(rating.created_at).toLocaleDateString('pt-PT')}
                      </span>
                    </div>
                    
                    {/* Detailed Criteria */}
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-2">
                      {rating.punctuality_rating && (
                        <span>Pontualidade: {rating.punctuality_rating}/5</span>
                      )}
                      {rating.respect_rating && (
                        <span>Respeito: {rating.respect_rating}/5</span>
                      )}
                      {rating.location_rating && (
                        <span>Local: {rating.location_rating}/5</span>
                      )}
                      {rating.enjoyment_rating && (
                        <span>Diversão: {rating.enjoyment_rating}/5</span>
                      )}
                    </div>
                    
                    {rating.comment && (
                      <p className="text-sm text-muted-foreground">"{rating.comment}"</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {showBooking && profile && (
        <BookingDialog
          musicianId={profile.id}
          onClose={() => setShowBooking(false)}
        />
      )}
    </div>
  );
};

export default PublicProfile;