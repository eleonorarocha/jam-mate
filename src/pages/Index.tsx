import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Music, MapPin, MessageSquare, Star, Users, Calendar } from 'lucide-react';
import Header from '@/components/Header';
import SearchBar from '@/components/SearchBar';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4">
        <div className="container mx-auto text-center space-y-8 max-w-4xl">
          <div className="flex justify-center mb-8">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center">
              <Music className="w-12 h-12 text-primary" />
            </div>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            JamMate
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            Encontre músicos perto de si e organize jam sessions incríveis
          </p>

          {/* Search Bar */}
          <div className="pt-8">
            <SearchBar />
          </div>

          {!user && (
            <div className="flex gap-4 justify-center pt-8">
              <Button size="lg" onClick={() => navigate('/auth')}>
                Começar Agora
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/auth')}>
                Já tenho conta
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">Como funciona</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-lg bg-card border border-border text-center">
              <MapPin className="w-8 h-8 text-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Descubra Músicos</h3>
              <p className="text-sm text-muted-foreground">
                Veja músicos registados no mapa próximo de si
              </p>
            </div>
            
            <div className="p-6 rounded-lg bg-card border border-border text-center">
              <MessageSquare className="w-8 h-8 text-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Converse e Agende</h3>
              <p className="text-sm text-muted-foreground">
                Envie mensagens e marque jam sessions
              </p>
            </div>
            
            <div className="p-6 rounded-lg bg-card border border-border text-center">
              <Star className="w-8 h-8 text-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Avalie Experiências</h3>
              <p className="text-sm text-muted-foreground">
                Deixe avaliações e construa reputação
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Community Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl text-center">
          <Users className="w-12 h-12 text-primary mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4">Comunidade de Músicos</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Junte-se a uma comunidade vibrante de músicos apaixonados. 
            Partilhe experiências, aprenda com outros e cresça musicalmente.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="p-4 bg-card rounded-lg border">
              <Calendar className="w-6 h-6 text-primary mb-2 mx-auto" />
              <h4 className="font-medium mb-1">Agende Jam Sessions</h4>
              <p className="text-sm text-muted-foreground">
                Organize encontros musicais facilmente
              </p>
            </div>
            <div className="p-4 bg-card rounded-lg border">
              <Star className="w-6 h-6 text-primary mb-2 mx-auto" />
              <h4 className="font-medium mb-1">Avaliações Verificadas</h4>
              <p className="text-sm text-muted-foreground">
                Sistema de avaliação detalhado
              </p>
            </div>
            <div className="p-4 bg-card rounded-lg border">
              <Music className="w-6 h-6 text-primary mb-2 mx-auto" />
              <h4 className="font-medium mb-1">Galeria de Jams</h4>
              <p className="text-sm text-muted-foreground">
                Partilhe fotos e gravações
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!user && (
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold mb-4">Pronto para tocar?</h2>
            <p className="text-muted-foreground mb-8">
              Junte-se a centenas de músicos que já encontraram parceiros para jam sessions
            </p>
            <Button size="lg" onClick={() => navigate('/auth')}>
              Criar Conta Gratuita
            </Button>
          </div>
        </section>
      )}
    </div>
  );
};

export default Index;