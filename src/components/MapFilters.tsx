import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Filter, X, MapPin, Heart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

export interface MapFiltersState {
  instrument: string;
  skillLevel: string;
  gender: string;
  maxDistance: number; // in km, 0 means no limit
  favoritesOnly: boolean;
}

interface MapFiltersProps {
  filters: MapFiltersState;
  onFiltersChange: (filters: MapFiltersState) => void;
}

const INSTRUMENT_KEYS = [
  'Guitarra', 'Piano', 'Bateria', 'Baixo', 'Violino', 'Saxofone',
  'Trompete', 'Flauta', 'Violoncelo', 'Voz', 'Outro',
];

const SKILL_LEVEL_KEYS = ['beginner', 'intermediate', 'advanced', 'professional'] as const;

const MapFilters = ({ filters, onFiltersChange }: MapFiltersProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const activeFiltersCount = [
    filters.instrument,
    filters.skillLevel,
    filters.maxDistance > 0,
    filters.favoritesOnly,
  ].filter(Boolean).length;

  const handleClearFilters = () => {
    onFiltersChange({
      instrument: '',
      skillLevel: '',
      gender: '',
      maxDistance: 0,
      favoritesOnly: false,
    });
  };

  const handleFilterChange = (key: keyof MapFiltersState, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value === 'all' ? '' : value,
    });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="bg-background/95 backdrop-blur shadow-lg"
        >
          <Filter className="h-4 w-4 mr-2" />
          {t('map.filters')}
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            {t('map.filter_musicians')}
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="text-muted-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                {t('map.clear')}
              </Button>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Favorites Only Filter */}
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2 cursor-pointer">
              <Heart className="h-4 w-4 text-red-500" />
              {t('map.show_only_favorites')}
            </Label>
            <Switch
              checked={filters.favoritesOnly}
              onCheckedChange={(checked) =>
                onFiltersChange({ ...filters, favoritesOnly: checked })
              }
            />
          </div>

          {/* Distance Filter */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {t('map.max_distance')}
              </Label>
              <span className="text-sm font-medium">
                {filters.maxDistance === 0 ? t('map.no_limit') : `${filters.maxDistance} km`}
              </span>
            </div>
            <Slider
              value={[filters.maxDistance]}
              onValueChange={(value) => onFiltersChange({ ...filters, maxDistance: value[0] })}
              max={500}
              step={10}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              {filters.maxDistance === 0
                ? t('map.showing_all')
                : t('map.showing_within', { km: filters.maxDistance })}
            </p>
          </div>

          <div className="space-y-2">
            <Label>{t('map.instrument')}</Label>
            <Select
              value={filters.instrument || 'all'}
              onValueChange={(value) => handleFilterChange('instrument', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('map.all_instruments')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('map.all_instruments')}</SelectItem>
                {INSTRUMENT_KEYS.map((instrument) => (
                  <SelectItem key={instrument} value={instrument}>
                    {t(`map.instruments.${instrument}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('map.level')}</Label>
            <Select
              value={filters.skillLevel || 'all'}
              onValueChange={(value) => handleFilterChange('skillLevel', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('map.all_levels')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('map.all_levels')}</SelectItem>
                {SKILL_LEVEL_KEYS.map((level) => (
                  <SelectItem key={level} value={level}>
                    {t(`map.skill.${level}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('map.gender')}</Label>
            <Select
              value={filters.gender || 'all'}
              onValueChange={(value) => handleFilterChange('gender', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('map.all_genders')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('map.all_genders')}</SelectItem>
                {GENDER_KEYS.map((g) => (
                  <SelectItem key={g} value={g}>
                    {t(`map.gender_opts.${g}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MapFilters;
