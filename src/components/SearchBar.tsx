import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface SearchBarProps {
  onSearch?: (location: string, date: Date | undefined) => void;
}

const SearchBar = ({ onSearch }: SearchBarProps) => {
  const [location, setLocation] = useState('');
  const [date, setDate] = useState<Date | undefined>();
  const navigate = useNavigate();

  const handleSearch = () => {
    if (onSearch) {
      onSearch(location, date);
    } else {
      const params = new URLSearchParams();
      if (location) params.set('location', location);
      if (date) params.set('date', date.toISOString());
      navigate(`/map?${params.toString()}`);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="flex items-center gap-2 p-2 bg-card border border-border rounded-full shadow-lg">
        <div className="flex-1 flex items-center gap-2 px-4">
          <MapPin className="h-5 w-5 text-muted-foreground shrink-0" />
          <Input
            type="text"
            placeholder="Onde? (cidade, região...)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="border-0 shadow-none focus-visible:ring-0 bg-transparent"
          />
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
