import { useEffect, useState } from 'react';
import { Map as MapIcon, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const WARN_THRESHOLD = 250;
const ACTION_THRESHOLD = 300;

/**
 * Monitor de escala do mapa.
 * Conta perfis com coordenadas preenchidas e avisa quando se aproxima do limiar
 * a partir do qual é preciso implementar bounding box (ver docs/mapa-escalabilidade.md).
 */
const MapScaleCard = () => {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { count: c } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('onboarding_completed', true)
        .not('latitude', 'is', null);
      if (active) setCount(c ?? 0);
    })();
    return () => {
      active = false;
    };
  }, []);

  const value = count ?? 0;
  const level = value >= ACTION_THRESHOLD ? 'action' : value >= WARN_THRESHOLD ? 'warn' : 'ok';
  const pct = Math.min(100, (value / ACTION_THRESHOLD) * 100);

  const tone = {
    ok: { border: 'border-border', bar: 'bg-primary', text: 'text-muted-foreground' },
    warn: { border: 'border-amber-500/50', bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
    action: { border: 'border-destructive/60', bar: 'bg-destructive', text: 'text-destructive' },
  }[level];

  const message =
    level === 'action'
      ? 'Limiar atingido: implementar bounding box no mapa (ver docs/mapa-escalabilidade.md).'
      : level === 'warn'
        ? 'Aproxima-se do limiar: planear o bounding box (ver docs/mapa-escalabilidade.md).'
        : 'Dentro do normal. Carregamento do mapa sem filtro geográfico é suficiente.';

  return (
    <div className={`bg-card border ${tone.border} rounded-xl p-4`}>
      <div className="flex items-center gap-2 mb-2">
        {level === 'ok' ? (
          <MapIcon className="w-4 h-4 text-primary" />
        ) : (
          <AlertTriangle className={`w-4 h-4 ${tone.text}`} />
        )}
        <h3 className="text-sm font-semibold">Escala do mapa</h3>
      </div>

      <p className="text-2xl font-bold">
        {count === null ? '—' : value}
        <span className="text-sm font-normal text-muted-foreground"> / {ACTION_THRESHOLD}</span>
      </p>
      <p className="text-xs text-muted-foreground mb-2">Perfis com coordenadas preenchidas</p>

      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden" aria-hidden="true">
        <div className={`h-full ${tone.bar} transition-all`} style={{ width: `${pct}%` }} />
      </div>

      <p className={`text-xs mt-2 ${tone.text}`}>{message}</p>
    </div>
  );
};

export default MapScaleCard;
