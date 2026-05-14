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
const GENDER_KEYS = ['male', 'female', 'other', 'prefer_not_to_say'] as const;

const MapFilters = ({ filters, onFiltersChange }: MapFiltersProps) => {
  const [open, setOpen] = useState(false);

  const activeFiltersCount = [
    filters.instrument,
    filters.skillLevel,
    filters.gender,
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
          Filtros
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
            Filtrar músicos
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="text-muted-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Favorites Only Filter */}
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2 cursor-pointer">
              <Heart className="h-4 w-4 text-red-500" />
              Mostrar apenas favoritos
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
                Distância máxima
              </Label>
              <span className="text-sm font-medium">
                {filters.maxDistance === 0 ? 'Sem limite' : `${filters.maxDistance} km`}
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
                ? 'A mostrar todos os músicos' 
                : `A mostrar músicos até ${filters.maxDistance} km de si`}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Instrumento</Label>
            <Select
              value={filters.instrument || 'all'}
              onValueChange={(value) => handleFilterChange('instrument', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os instrumentos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os instrumentos</SelectItem>
                {INSTRUMENTS.map((instrument) => (
                  <SelectItem key={instrument} value={instrument}>
                    {instrument}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Nível</Label>
            <Select
              value={filters.skillLevel || 'all'}
              onValueChange={(value) => handleFilterChange('skillLevel', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os níveis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os níveis</SelectItem>
                {SKILL_LEVELS.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Género</Label>
            <Select
              value={filters.gender || 'all'}
              onValueChange={(value) => handleFilterChange('gender', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os géneros" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os géneros</SelectItem>
                {GENDERS.map((gender) => (
                  <SelectItem key={gender.value} value={gender.value}>
                    {gender.label}
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
