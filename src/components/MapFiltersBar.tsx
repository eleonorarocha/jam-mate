import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, SlidersHorizontal, MapPin, CalendarIcon, X } from 'lucide-react';
import { format, type Locale } from 'date-fns';
import { pt, enUS, es, fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { MapFiltersState } from './MapFilters';

const dateLocales: Record<string, Locale> = { pt, en: enUS, es, fr };

interface ExtendedFilters extends MapFiltersState {
  searchQuery?: string;
  city?: string;
  availabilityDate?: string;
}

interface MapFiltersBarProps {
  filters: ExtendedFilters;
  onFiltersChange: (filters: ExtendedFilters) => void;
}

const INSTRUMENT_KEYS = [
  'Guitarra', 'Piano', 'Bateria', 'Baixo', 'Violino', 'Saxofone',
  'Trompete', 'Flauta', 'Violoncelo', 'Voz', 'Ukulele', 'Outro'
];

const MapFiltersBar = ({ filters, onFiltersChange }: MapFiltersBarProps) => {
  const { t, i18n } = useTranslation();
  const dateLocale = dateLocales[i18n.language?.split('-')[0]] || enUS;
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);

  const updateFilter = <K extends keyof ExtendedFilters>(key: K, value: ExtendedFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      instrument: '',
      skillLevel: '',
      gender: '',
      maxDistance: 0,
      favoritesOnly: false,
      searchQuery: '',
      city: '',
      availabilityDate: '',
    });
  };

  const activeFiltersCount = [
    filters.instrument,
    filters.skillLevel,
    filters.gender,
    filters.maxDistance > 0,
    filters.favoritesOnly,
    filters.availabilityDate,
  ].filter(Boolean).length;

  return (
    <div className="flex items-center gap-2 p-3 bg-background border-b">
      {/* Search by name */}
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('map.search_musician')}
          value={filters.searchQuery || ''}
          onChange={(e) => updateFilter('searchQuery', e.target.value)}
          className="pl-9"
        />
      </div>

      {/* City search */}
      <div className="relative flex-1 max-w-xs">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('map.city_country')}
          value={filters.city || ''}
          onChange={(e) => updateFilter('city', e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Instrument quick filter */}
      <Select
        value={filters.instrument || 'all'}
        onValueChange={(v) => updateFilter('instrument', v === 'all' ? '' : v)}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder={t('map.instrument')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('map.all')}</SelectItem>
          {INSTRUMENT_KEYS.map((inst) => (
            <SelectItem key={inst} value={inst}>{t(`map.instruments.${inst}`)}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Date picker */}
      <Popover open={dateOpen} onOpenChange={setDateOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn(
            'w-[160px] justify-start text-left font-normal',
            filters.availabilityDate && 'text-foreground'
          )}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {filters.availabilityDate
              ? format(new Date(filters.availabilityDate), 'd MMM', { locale: dateLocale })
              : t('map.availability')}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={filters.availabilityDate ? new Date(filters.availabilityDate) : undefined}
            onSelect={(date) => {
              updateFilter('availabilityDate', date ? date.toISOString() : '');
              setDateOpen(false);
            }}
            disabled={(date) => date < new Date()}
            locale={dateLocale}
          />
          {filters.availabilityDate && (
            <div className="p-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => {
                  updateFilter('availabilityDate', '');
                  setDateOpen(false);
                }}
              >
                {t('map.clear_date')}
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Advanced filters sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" className="relative">
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            {t('map.filters')}
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{t('map.advanced_filters')}</SheetTitle>
          </SheetHeader>
          
          <div className="mt-6 space-y-6">
            {/* Skill Level */}
            <div className="space-y-2">
              <Label>{t('map.level')}</Label>
              <Select
                value={filters.skillLevel || 'all'}
                onValueChange={(v) => updateFilter('skillLevel', v === 'all' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('map.all_levels')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('map.all_levels')}</SelectItem>
                  <SelectItem value="beginner">{t('map.skill.beginner')}</SelectItem>
                  <SelectItem value="intermediate">{t('map.skill.intermediate')}</SelectItem>
                  <SelectItem value="advanced">{t('map.skill.advanced')}</SelectItem>
                  <SelectItem value="professional">{t('map.skill.professional')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Gender */}
            <div className="space-y-2">
              <Label>{t('map.gender')}</Label>
              <Select
                value={filters.gender || 'all'}
                onValueChange={(v) => updateFilter('gender', v === 'all' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('map.all')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('map.all')}</SelectItem>
                  <SelectItem value="male">{t('map.gender_opts.male')}</SelectItem>
                  <SelectItem value="female">{t('map.gender_opts.female')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Distance */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>{t('map.max_distance')}</Label>
                <span className="text-sm text-muted-foreground">
                  {filters.maxDistance > 0 ? `${filters.maxDistance} km` : t('map.no_limit')}
                </span>
              </div>
              <Slider
                value={[filters.maxDistance]}
                onValueChange={([v]) => updateFilter('maxDistance', v)}
                max={500}
                step={10}
              />
            </div>

            {/* Favorites only */}
            <div className="flex items-center justify-between">
              <Label htmlFor="favorites-only">{t('map.favorites_only')}</Label>
              <Switch
                id="favorites-only"
                checked={filters.favoritesOnly}
                onCheckedChange={(v) => updateFilter('favoritesOnly', v)}
              />
            </div>

            {/* Clear filters */}
            {activeFiltersCount > 0 && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  clearFilters();
                  setIsSheetOpen(false);
                }}
              >
                <X className="h-4 w-4 mr-2" />
                {t('map.clear_all_filters')}
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default MapFiltersBar;
