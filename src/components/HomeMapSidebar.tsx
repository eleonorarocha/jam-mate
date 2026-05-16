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
const GENDER_KEYS = ['male', 'female'] as const;

const dateLocaleMap: Record<string, Locale> = { pt, en: enUS, es, fr };
type Locale = typeof pt;

const HomeMapSidebar = ({
  filters,
  onFiltersChange,
  isCollapsed,
  onToggleCollapse,
  visibleCount = 0,
  isAuthenticated = true,
}: HomeMapSidebarProps) => {
  const activeFiltersCount = [
    filters.searchQuery,
    filters.city,
    filters.instrument,
    filters.skillLevel,
    filters.gender,
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
          <h2 className="font-semibold">Filtros</h2>
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
              Limpar
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
            {visibleCount} {visibleCount === 1 ? 'músico encontrado' : 'músicos encontrados'}
          </span>
        </div>
        {activeFiltersCount > 0 && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters} className="h-7 text-xs text-muted-foreground hover:text-foreground">
            Limpar filtros
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
              Pesquisar por nome
            </Label>
            <Input
              placeholder="Nome do músico..."
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
              Cidade / Região
            </Label>
            <Input
              placeholder="Ex: Lisboa, Porto..."
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
                Distância máxima
              </Label>
              <span className="text-sm text-muted-foreground">
                {filters.maxDistance === 0
                  ? 'Sem limite'
                  : `${filters.maxDistance} km`}
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
              <span>Sem limite</span>
              <span>500 km</span>
            </div>
          </div>

          <Separator />

          {/* Instrument Filter */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Music className="h-4 w-4" />
              Instrumento
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
                <SelectValue placeholder="Todos os instrumentos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os instrumentos</SelectItem>
                {instruments.map((instrument) => (
                  <SelectItem key={instrument} value={instrument}>
                    {instrument}
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
              Nível de experiência
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
                <SelectValue placeholder="Todos os níveis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os níveis</SelectItem>
                {skillLevels.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Gender Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Género</Label>
            <Select
              value={filters.gender}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  gender: value === 'all' ? '' : value,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {genders.map((gender) => (
                  <SelectItem key={gender.value} value={gender.value}>
                    {gender.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isAuthenticated && (
            <>
              <Separator />

              {/* Availability Date Filter */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <CalendarIcon className="h-4 w-4" />
                  Disponibilidade
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
                        ? format(new Date(filters.availabilityDate), "PPP", { locale: pt })
                        : "Selecionar data"}
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
                    Limpar data
                  </Button>
                )}
              </div>

              <Separator />

              {/* Favorites Only */}
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                  <Heart className="h-4 w-4 text-destructive" />
                  Apenas favoritos
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
