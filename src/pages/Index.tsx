import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import MapComponent from '@/components/MapComponent';
import HomeMapSidebar, { HomeFiltersState } from '@/components/HomeMapSidebar';
import { MapFiltersState } from '@/components/MapFilters';
import MapboxTokenForm from '@/components/landing/MapboxTokenForm';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
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

  useEffect(() => {
    localStorage.setItem('jammate_filters', JSON.stringify(filters));
  }, [filters]);

  useEffect(() => {
    localStorage.setItem('jammate_sidebar_collapsed', JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Check onboarding status
  useEffect(() => {
    if (!user) {
      setCheckingOnboarding(false);
      return;
    }
    supabase.from('profiles').select('onboarding_completed').eq('id', user.id).single()
      .then(({ data }) => {
        if (data && !data.onboarding_completed) {
          navigate('/onboarding');
        }
        setCheckingOnboarding(false);
      });
  }, [user, navigate]);

  const mapFilters: MapFiltersState & { searchQuery?: string; city?: string; availabilityDate?: string } = {
    instrument: filters.instrument,
    skillLevel: filters.skillLevel,
    gender: filters.gender,
    maxDistance: user ? filters.maxDistance : 0, // Distance filter only for logged users
    favoritesOnly: user ? filters.favoritesOnly : false,
    searchQuery: filters.searchQuery,
    city: filters.city,
    availabilityDate: user ? filters.availabilityDate : '',
  };

  if (loading || checkingOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">A carregar...</p>
        </div>
      </div>
    );
  }

  const savedToken = localStorage.getItem('mapbox_token');
  const hasMapToken = tokenSaved || savedToken;

  // No token at all - show token form (for anyone)
  if (!hasMapToken) {
    return <MapboxTokenForm onTokenSaved={() => setTokenSaved(true)} />;
  }

  // Map view for everyone (authenticated or not)
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <div className="flex-1 flex pt-16">
        <HomeMapSidebar
          filters={filters}
          onFiltersChange={setFilters}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          visibleCount={visibleMusiciansCount}
          isAuthenticated={!!user}
        />
        <div className="flex-1 relative">
          <MapComponent
            token={savedToken || ''}
            filters={mapFilters}
            onFilteredCountChange={setVisibleMusiciansCount}
            isAuthenticated={!!user}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;
