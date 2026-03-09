import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, CalendarDays, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface SearchBarProps {
  onSearch?: (location: string, date: Date | undefined, coordinates?: [number, number]) => void;
}

interface GeocoderSuggestion {
  id: string;
  place_name: string;
  text: string;
  center: [number, number];
}

const SearchBar = ({ onSearch }: SearchBarProps) => {
  const [location, setLocation] = useState('');
  const [date, setDate] = useState<Date | undefined>();
  const [suggestions, setSuggestions] = useState<GeocoderSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSearch = () => {
    setShowSuggestions(false);
    if (onSearch) {
      onSearch(location, date);
    } else {
      const params = new URLSearchParams();
      if (location) params.set('location', location);
      if (date) params.set('date', date.toISOString());
      navigate(`/map?${params.toString()}`);
    }
  };

  const fetchSuggestions = async (query: string) => {
    const token = localStorage.getItem('mapbox_token');
    if (!token || query.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&types=place,locality,neighborhood&language=pt&limit=5`
      );
      const data = await res.json();
      setSuggestions(data.features || []);
    } catch {
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (location.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(location);
      setShowSuggestions(true);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [location]);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selectSuggestion = (suggestion: GeocoderSuggestion) => {
    setLocation(suggestion.text);
    setSuggestions([]);
    setShowSuggestions(false);
    // Trigger search with coordinates to center the map
    if (onSearch) {
      onSearch(suggestion.text, date, suggestion.center);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto" ref={containerRef}>
      <div className="flex items-center gap-2 p-2 bg-card border border-border rounded-full shadow-lg">
        <div className="flex-1 relative flex items-center gap-2 px-4">
          <MapPin className="h-5 w-5 text-muted-foreground shrink-0" />
          <Input
            type="text"
            placeholder="Onde? (cidade, região...)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch();
            }}
            className="border-0 shadow-none focus-visible:ring-0 bg-transparent"
          />
          {isLoading && (
            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin shrink-0" />
          )}

          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-xl shadow-xl z-50 overflow-hidden">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => selectSuggestion(s)}
                  className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-accent transition-colors text-sm"
                >
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-foreground truncate">{s.place_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div className="h-8 w-px bg-border" />
        
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-2 px-4 py-2 hover:bg-muted rounded-full transition-colors">
              <CalendarDays className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {date ? format(date, 'dd MMM', { locale: pt }) : 'Quando?'}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              locale={pt}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        
        <Button 
          onClick={handleSearch} 
          size="icon" 
          className="rounded-full h-12 w-12 shrink-0"
        >
          <Search className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default SearchBar;
