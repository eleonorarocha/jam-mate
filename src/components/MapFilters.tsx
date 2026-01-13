import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
import { Filter, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export interface MapFiltersState {
  instrument: string;
  skillLevel: string;
  gender: string;
}

interface MapFiltersProps {
  filters: MapFiltersState;
  onFiltersChange: (filters: MapFiltersState) => void;
}

const INSTRUMENTS = [
  'Guitarra',
  'Piano',
  'Bateria',
  'Baixo',
  'Violino',
  'Saxofone',
  'Trompete',
  'Flauta',
  'Violoncelo',
  'Voz',
  'Outro',
];

const SKILL_LEVELS = [
  { value: 'beginner', label: 'Iniciante' },
  { value: 'intermediate', label: 'Intermédio' },
  { value: 'advanced', label: 'Avançado' },
  { value: 'professional', label: 'Profissional' },
];

const GENDERS = [
  { value: 'male', label: 'Masculino' },
  { value: 'female', label: 'Feminino' },
  { value: 'other', label: 'Outro' },
  { value: 'prefer_not_to_say', label: 'Prefere não dizer' },
];

const MapFilters = ({ filters, onFiltersChange }: MapFiltersProps) => {
  const [open, setOpen] = useState(false);

  const activeFiltersCount = [
    filters.instrument,
    filters.skillLevel,
    filters.gender,
  ].filter(Boolean).length;

  const handleClearFilters = () => {
    onFiltersChange({
      instrument: '',
      skillLevel: '',
      gender: '',
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
