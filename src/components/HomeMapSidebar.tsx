import { useState } from 'react';
import { format } from 'date-fns';
import { pt, enUS, es, fr } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  MapPin,
  Music,
  GraduationCap,
  Heart,
  X,
  Filter,
  ChevronLeft,
  ChevronRight,
  Users,
  CalendarIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface HomeFiltersState {
  searchQuery: string;
  city: string;
  instrument: string;
  skillLevel: string;
  gender: string;
  maxDistance: number;
  favoritesOnly: boolean;
  availabilityDate: string;
}

interface HomeMapSidebarProps {
  filters: HomeFiltersState;
  onFiltersChange: (filters: HomeFiltersState) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  visibleCount?: number;
  isAuthenticated?: boolean;
}

const instruments = [
  'Guitarra',
  'Baixo',
  'Bateria',
  'Teclado',
  'Piano',
  'Violino',
  'Saxofone',
  'Trompete',
  'Flauta',
  'Voz',
  'Violoncelo',
  'Ukulele',
  'Harmónica',
  'Acordeão',
  'Outro',
];

const SKILL_LEVEL_KEYS = ['beginner', 'intermediate', 'advanced', 'professional'] as const;


const dateLocaleMap: Record<string, typeof pt> = { pt, en: enUS, es, fr };

const HomeMapSidebar = ({
  filters,
  onFiltersChange,
  isCollapsed,
  onToggleCollapse,
  visibleCount = 0,
  isAuthenticated = true,
}: HomeMapSidebarProps) => {
  const { t, i18n } = useTranslation();
  const dateLocale = dateLocaleMap[i18n.language?.split('-')[0]] || enUS;
  const activeFiltersCount = [
    filters.searchQuery,
    filters.city,
    filters.instrument,
    filters.skillLevel,
    filters.maxDistance > 0,
    filters.favoritesOnly,
    filters.availabilityDate,
  ].filter(Boolean).length;

  const handleClearFilters = () => {
    onFiltersChange({
      searchQuery: '',
      city: '',
      instrument: '',
      skillLevel: '',
      gender: '',
      maxDistance: 0,
      favoritesOnly: false,
      availabilityDate: '',
    });
  };

  if (isCollapsed) {
    return (
      <div className="w-14 bg-card border-r border-border flex flex-col items-center py-4 gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="mb-2"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
        <div className="relative">
          <Filter className="h-5 w-5 text-muted-foreground" />
          {activeFiltersCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {activeFiltersCount}
            </Badge>
          )}
        </div>
        <Search className="h-5 w-5 text-muted-foreground" />
        <MapPin className="h-5 w-5 text-muted-foreground" />
        <Music className="h-5 w-5 text-muted-foreground" />
        <GraduationCap className="h-5 w-5 text-muted-foreground" />
        <Heart className="h-5 w-5 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="w-80 bg-card border-r border-border flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">{t('map.filters')}</h2>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {activeFiltersCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="h-8 px-2 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              {t('map.clear')}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Results Count + Clear Filters */}
      <div className="px-4 py-3 bg-muted/50 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            {t(visibleCount === 1 ? 'map.musicians_found_one' : 'map.musicians_found_other', { count: visibleCount })}
          </span>
        </div>
        {activeFiltersCount > 0 && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters} className="h-7 text-xs text-muted-foreground hover:text-foreground">
            {t('map.clear_all_filters')}
          </Button>
        )}
      </div>

      {/* Filters Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Search by Name */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Search className="h-4 w-4" />
              {t('map.search_by_name')}
            </Label>
            <Input
              placeholder={t('map.musician_name_ph')}
              value={filters.searchQuery}
              onChange={(e) =>
                onFiltersChange({ ...filters, searchQuery: e.target.value })
              }
            />
          </div>

          <Separator />

          {/* City/Region Filter */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="h-4 w-4" />
              {t('map.city_region')}
            </Label>
            <Input
              placeholder={t('map.city_region_ph')}
              value={filters.city}
              onChange={(e) =>
                onFiltersChange({ ...filters, city: e.target.value })
              }
            />
          </div>

          <Separator />

          {/* Distance Filter */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <MapPin className="h-4 w-4" />
                {t('map.max_distance')}
              </Label>
              <span className="text-sm text-muted-foreground">
                {filters.maxDistance === 0
                  ? t('map.no_limit')
                  : `${filters.maxDistance} ${t('map.km_suffix')}`}
              </span>
            </div>
            <Slider
              value={[filters.maxDistance]}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, maxDistance: value[0] })
              }
              max={500}
              step={10}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t('map.no_limit')}</span>
              <span>500 {t('map.km_suffix')}</span>
            </div>
          </div>

          <Separator />

          {/* Instrument Filter */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Music className="h-4 w-4" />
              {t('map.instrument')}
            </Label>
            <Select
              value={filters.instrument}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  instrument: value === 'all' ? '' : value,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t('map.all_instruments')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('map.all_instruments')}</SelectItem>
                {instruments.map((instrument) => (
                  <SelectItem key={instrument} value={instrument}>
                    {t(`map.instruments.${instrument}`, { defaultValue: instrument })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Skill Level Filter */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <GraduationCap className="h-4 w-4" />
              {t('map.experience_level')}
            </Label>
            <Select
              value={filters.skillLevel}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  skillLevel: value === 'all' ? '' : value,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t('map.all_levels')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('map.all_levels')}</SelectItem>
                {SKILL_LEVEL_KEYS.map((key) => (
                  <SelectItem key={key} value={key}>
                    {t(`map.skill.${key}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />



          {isAuthenticated && (
            <>
              <Separator />

              {/* Availability Date Filter */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <CalendarIcon className="h-4 w-4" />
                  {t('map.availability')}
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !filters.availabilityDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.availabilityDate
                        ? format(new Date(filters.availabilityDate), "PPP", { locale: dateLocale })
                        : t('map.select_date')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.availabilityDate ? new Date(filters.availabilityDate) : undefined}
                      onSelect={(date) =>
                        onFiltersChange({
                          ...filters,
                          availabilityDate: date ? date.toISOString() : '',
                        })
                      }
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                {filters.availabilityDate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onFiltersChange({ ...filters, availabilityDate: '' })}
                    className="h-7 text-xs text-muted-foreground hover:text-foreground w-full"
                  >
                    <X className="h-3 w-3 mr-1" />
                    {t('map.clear_date')}
                  </Button>
                )}
              </div>

              <Separator />

              {/* Favorites Only */}
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                  <Heart className="h-4 w-4 text-destructive" />
                  {t('map.favorites_only')}
                </Label>
                <Switch
                  checked={filters.favoritesOnly}
                  onCheckedChange={(checked) =>
                    onFiltersChange({ ...filters, favoritesOnly: checked })
                  }
                />
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default HomeMapSidebar;
