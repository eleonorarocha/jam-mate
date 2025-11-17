import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Music, MapPin, MessageSquare, Star } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="text-center space-y-8 max-w-4xl">
        <div className="flex justify-center mb-8">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center">
            <Music className="w-12 h-12 text-primary" />
          </div>
        </div>
        
        <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          JamConnect
        </h1>
        
        <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
          Encontre músicos perto de si e organize jam sessions incríveis
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="p-6 rounded-lg bg-card border border-border">
            <MapPin className="w-8 h-8 text-primary mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Descubra Músicos</h3>
            <p className="text-sm text-muted-foreground">
              Veja músicos registados no mapa próximo de si
            </p>
          </div>
          
          <div className="p-6 rounded-lg bg-card border border-border">
            <MessageSquare className="w-8 h-8 text-primary mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Converse e Agende</h3>
            <p className="text-sm text-muted-foreground">
              Envie mensagens e marque jam sessions
            </p>
          </div>
          
          <div className="p-6 rounded-lg bg-card border border-border">
            <Star className="w-8 h-8 text-primary mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Avalie Experiências</h3>
            <p className="text-sm text-muted-foreground">
              Deixe avaliações e construa reputação
            </p>
          </div>
        </div>

        <div className="flex gap-4 justify-center mt-12">
          <Button size="lg" onClick={() => navigate('/auth')}>
            Começar Agora
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate('/auth')}>
            Já tenho conta
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
