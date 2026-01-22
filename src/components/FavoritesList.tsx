import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Heart, MapPin, Star, Music, ExternalLink } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import FavoriteButton from './FavoriteButton';

const skillLevelLabels: Record<string, string> = {
  beginner: 'Iniciante',
  intermediate: 'Intermédio',
  advanced: 'Avançado',
  professional: 'Profissional',
};

const FavoritesList = () => {
  const navigate = useNavigate();
  const { favorites, loading } = useFavorites();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            Músicos Favoritos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-red-500 fill-red-500" />
          Músicos Favoritos
          {favorites.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {favorites.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {favorites.length === 0 ? (
          <div className="text-center py-8">
            <Heart className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">
              Ainda não tem músicos favoritos.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Explore o mapa e adicione músicos aos seus favoritos.
            </p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => navigate('/map')}
            >
              <MapPin className="h-4 w-4 mr-2" />
              Explorar mapa
            </Button>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {favorites.map((fav) => (
                <div
                  key={fav.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-accent/50 hover:bg-accent transition-colors group"
                >
                  <Avatar 
                    className="h-12 w-12 cursor-pointer"
                    onClick={() => navigate(`/profile/${fav.musician_id}`)}
                  >
                    <AvatarImage src={fav.profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary">
                      {fav.profile?.username?.charAt(0).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p 
                        className="font-medium truncate cursor-pointer hover:underline"
                        onClick={() => navigate(`/profile/${fav.musician_id}`)}
                      >
                        {fav.profile?.username || 'Utilizador'}
                      </p>
                      {fav.profile?.average_rating && fav.profile.average_rating > 0 && (
                        <div className="flex items-center gap-0.5 text-sm">
                          <Star className="h-3 w-3 fill-primary text-primary" />
                          <span>{fav.profile.average_rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Music className="h-3 w-3" />
                      <span className="truncate">{fav.profile?.instrument}</span>
                      <span>•</span>
                      <span>{skillLevelLabels[fav.profile?.skill_level || ''] || fav.profile?.skill_level}</span>
                    </div>
                    {fav.profile?.city && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <MapPin className="h-3 w-3" />
                        {fav.profile.city}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => navigate(`/profile/${fav.musician_id}`)}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <FavoriteButton musicianId={fav.musician_id} />
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default FavoritesList;
