import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const SKILL_LEVELS = [
  { value: 'beginner', label: 'Iniciante' },
  { value: 'intermediate', label: 'Intermédio' },
  { value: 'advanced', label: 'Avançado' },
  { value: 'professional', label: 'Profissional' },
];

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

interface PartnerPreferencesProps {
  userId: string;
}

const PartnerPreferences = ({ userId }: PartnerPreferencesProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);

  useEffect(() => {
    loadPreferences();
  }, [userId]);

  const loadPreferences = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('preferred_skill_levels, preferred_instruments')
      .eq('id', userId)
      .single();

    if (data && !error) {
      setSelectedLevels(data.preferred_skill_levels || []);
      setSelectedInstruments(data.preferred_instruments || []);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        preferred_skill_levels: selectedLevels,
        preferred_instruments: selectedInstruments,
      })
      .eq('id', userId);

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível guardar as preferências.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Preferências guardadas!',
        description: 'As suas preferências de parceiros foram atualizadas.',
      });
    }
    setSaving(false);
  };

  const toggleLevel = (level: string) => {
    setSelectedLevels((prev) =>
      prev.includes(level)
        ? prev.filter((l) => l !== level)
        : [...prev, level]
    );
  };

  const toggleInstrument = (instrument: string) => {
    setSelectedInstruments((prev) =>
      prev.includes(instrument)
        ? prev.filter((i) => i !== instrument)
        : [...prev, instrument]
    );
  };

  const selectAllLevels = () => {
    if (selectedLevels.length === SKILL_LEVELS.length) {
      setSelectedLevels([]);
    } else {
      setSelectedLevels(SKILL_LEVELS.map((l) => l.value));
    }
  };

  const selectAllInstruments = () => {
    if (selectedInstruments.length === INSTRUMENTS.length) {
      setSelectedInstruments([]);
    } else {
      setSelectedInstruments([...INSTRUMENTS]);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-8 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Preferências de Parceiros
        </CardTitle>
        <CardDescription>
          Defina com que tipo de músicos gostaria de tocar. Deixe vazio para aceitar todos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Níveis de experiência</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={selectAllLevels}
              className="text-xs"
            >
              {selectedLevels.length === SKILL_LEVELS.length ? 'Limpar todos' : 'Selecionar todos'}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {selectedLevels.length === 0
              ? 'Aceita todos os níveis'
              : `Aceita: ${selectedLevels.length} nível(is)`}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {SKILL_LEVELS.map((level) => (
              <div key={level.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`level-${level.value}`}
                  checked={selectedLevels.includes(level.value)}
                  onCheckedChange={() => toggleLevel(level.value)}
                />
                <label
                  htmlFor={`level-${level.value}`}
                  className="text-sm cursor-pointer"
                >
                  {level.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Instrumentos</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={selectAllInstruments}
              className="text-xs"
            >
              {selectedInstruments.length === INSTRUMENTS.length ? 'Limpar todos' : 'Selecionar todos'}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {selectedInstruments.length === 0
              ? 'Aceita todos os instrumentos'
              : `Aceita: ${selectedInstruments.length} instrumento(s)`}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {INSTRUMENTS.map((instrument) => (
              <div key={instrument} className="flex items-center space-x-2">
                <Checkbox
                  id={`instrument-${instrument}`}
                  checked={selectedInstruments.includes(instrument)}
                  onCheckedChange={() => toggleInstrument(instrument)}
                />
                <label
                  htmlFor={`instrument-${instrument}`}
                  className="text-sm cursor-pointer"
                >
                  {instrument}
                </label>
              </div>
            ))}
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? 'A guardar...' : 'Guardar Preferências'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default PartnerPreferences;
