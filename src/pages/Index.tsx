import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Music, MapPin, MessageSquare, Star, Users, Calendar, Search } from 'lucide-react';
import Header from '@/components/Header';
import mapPreview from '@/assets/map-preview.jpg';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import MapComponent from '@/components/MapComponent';
import HomeMapSidebar, { HomeFiltersState } from '@/components/HomeMapSidebar';
import { MapFiltersState } from '@/components/MapFilters';

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [mapboxToken, setMapboxToken] = useState('');
  const [tokenSaved, setTokenSaved] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('jammate_sidebar_collapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const [visibleMusiciansCount, setVisibleMusiciansCount] = useState(0);
  const [filters, setFilters] = useState<HomeFiltersState>(() => {
    const saved = localStorage.getItem('jammate_filters');
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return {
      searchQuery: '',
      city: '',
      instrument: '',
      skillLevel: '',
      gender: '',
      maxDistance: 0,
      favoritesOnly: false,
      availabilityDate: '',
    };
  });

  // Persist filters to localStorage
  useEffect(() => {
    localStorage.setItem('jammate_filters', JSON.stringify(filters));
  }, [filters]);

  useEffect(() => {
    localStorage.setItem('jammate_sidebar_collapsed', JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Convert HomeFiltersState to MapFiltersState for MapComponent
  const mapFilters: MapFiltersState & { searchQuery?: string; city?: string; availabilityDate?: string } = {
    instrument: filters.instrument,
    skillLevel: filters.skillLevel,
    gender: filters.gender,
    maxDistance: filters.maxDistance,
    favoritesOnly: filters.favoritesOnly,
    searchQuery: filters.searchQuery,
    city: filters.city,
    availabilityDate: filters.availabilityDate,
  };

  const handleSaveToken = () => {
    if (mapboxToken.trim()) {
      localStorage.setItem('mapbox_token', mapboxToken);
      setTokenSaved(true);
      toast({
        title: 'Token guardado!',
        description: 'Pode agora ver o mapa.',
      });
    }
  };

  const savedToken = localStorage.getItem('mapbox_token');
  const hasMapToken = tokenSaved || savedToken;

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">A carregar...</p>
        </div>
      </div>
    );
  }

  // Logged in user without token - show token input
  if (user && !hasMapToken) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-24 flex items-center justify-center p-4">
          <div className="max-w-md w-full space-y-4 bg-card p-6 rounded-lg border">
            <div>
              <h2 className="text-2xl font-bold mb-2">Configure o Mapbox</h2>
              <p className="text-muted-foreground mb-4">
                Para visualizar o mapa, precisa de um token público do Mapbox.
                Pode obtê-lo em{' '}
                <a
                  href="https://mapbox.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  mapbox.com
                </a>
              </p>
            </div>
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="Cole aqui o seu token público do Mapbox"
                value={mapboxToken}
                onChange={(e) => setMapboxToken(e.target.value)}
              />
              <Button onClick={handleSaveToken} className="w-full">
                Guardar Token
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Logged in user with token - show map with sidebar
  if (user && hasMapToken) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-1 flex pt-16">
          {/* Sidebar with filters */}
          <HomeMapSidebar
            filters={filters}
            onFiltersChange={setFilters}
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            visibleCount={visibleMusiciansCount}
          />
          
          {/* Map */}
          <div className="flex-1 relative">
            <MapComponent 
              token={savedToken || mapboxToken} 
              filters={mapFilters}
              onFilteredCountChange={setVisibleMusiciansCount}
            />
          </div>
        </div>
      </div>
    );
  }

  // Not logged in - show landing page
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4">
        <div className="container mx-auto text-center space-y-8 max-w-4xl">
          <motion.div
            className="flex justify-center mb-8"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
          >
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center">
              <Music className="w-12 h-12 text-primary" />
            </div>
          </motion.div>
          
          <motion.h1
            className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            JamMate
          </motion.h1>
          
          <motion.p
            className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            Encontre músicos perto de si e organize jam sessions incríveis
          </motion.p>

          <motion.div
            className="flex gap-4 justify-center pt-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            <Button size="lg" onClick={() => navigate('/auth')}>
              Começar Agora
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/auth')}>
              Já tenho conta
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Map Preview Section */}
      <motion.section
        className="py-16 px-4"
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.7 }}
      >
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-center mb-4">Explore músicos perto de si</h2>
          <p className="text-muted-foreground text-center mb-8 max-w-2xl mx-auto">
            Descubra músicos na sua zona, filtre por instrumento e nível, e encontre o parceiro ideal para a sua próxima jam.
          </p>
          <motion.div
            className="relative rounded-2xl overflow-hidden border border-border shadow-xl"
            whileHover={{ scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <img 
              src={mapPreview} 
              alt="Prévia do mapa com músicos" 
              className="w-full h-[400px] object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent flex flex-col items-center justify-end pb-10 px-4">
              <div className="flex items-center gap-2 mb-3">
                <Search className="w-5 h-5 text-primary" />
                <span className="text-lg font-semibold">Encontre músicos na sua área</span>
              </div>
              <p className="text-sm text-muted-foreground mb-5 text-center max-w-md">
                Crie uma conta gratuita para explorar o mapa interativo, filtrar por instrumento, nível e muito mais.
              </p>
              <Button size="lg" onClick={() => navigate('/auth')}>
                Criar Conta e Explorar o Mapa
              </Button>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <motion.h2
            className="text-3xl font-bold text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
          >
            Como funciona
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: MapPin, title: 'Descubra Músicos', desc: 'Veja músicos registados no mapa próximo de si' },
              { icon: MessageSquare, title: 'Converse e Agende', desc: 'Envie mensagens e marque jam sessions' },
              { icon: Star, title: 'Avalie Experiências', desc: 'Deixe avaliações e construa reputação' },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                className="p-6 rounded-lg bg-card border border-border text-center"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                whileHover={{ y: -6, boxShadow: '0 12px 24px -8px hsl(var(--primary) / 0.15)' }}
              >
                <feature.icon className="w-8 h-8 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Community Section */}
      <motion.section
        className="py-16 px-4"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6 }}
      >
        <div className="container mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          >
            <Users className="w-12 h-12 text-primary mx-auto mb-6" />
          </motion.div>
          <h2 className="text-3xl font-bold mb-4">Comunidade de Músicos</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Junte-se a uma comunidade vibrante de músicos apaixonados. 
            Partilhe experiências, aprenda com outros e cresça musicalmente.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {[
              { icon: Calendar, title: 'Agende Jam Sessions', desc: 'Organize encontros musicais facilmente' },
              { icon: Star, title: 'Avaliações Verificadas', desc: 'Sistema de avaliação detalhado' },
              { icon: Music, title: 'Galeria de Jams', desc: 'Partilhe fotos e gravações' },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                className="p-4 bg-card rounded-lg border"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: i * 0.12 }}
                whileHover={{ y: -4 }}
              >
                <item.icon className="w-6 h-6 text-primary mb-2 mx-auto" />
                <h4 className="font-medium mb-1">{item.title}</h4>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* CTA Section */}
      <motion.section
        className="py-16 px-4"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6 }}
      >
        <div className="container mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold mb-4">Pronto para tocar?</h2>
          <p className="text-muted-foreground mb-8">
            Junte-se a centenas de músicos que já encontraram parceiros para jam sessions
          </p>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
            <Button size="lg" onClick={() => navigate('/auth')}>
              Criar Conta Gratuita
            </Button>
          </motion.div>
        </div>
      </motion.section>
    </div>
  );
};

export default Index;
