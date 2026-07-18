import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const browserTz =
  (typeof Intl !== 'undefined' && Intl.DateTimeFormat().resolvedOptions().timeZone) || 'UTC';

export const AUTO_TZ = 'auto';

export const TIME_ZONE_OPTIONS: { value: string; label: string }[] = [
  { value: AUTO_TZ, label: `Local (auto · ${browserTz})` },
  { value: 'UTC', label: 'UTC (GMT+0)' },
  { value: 'Atlantic/Azores', label: 'Açores (GMT−1)' },
  { value: 'Europe/Lisbon', label: 'Lisboa (GMT+0/+1)' },
  { value: 'Europe/London', label: 'Londres (GMT+0/+1)' },
  { value: 'Europe/Madrid', label: 'Madrid (GMT+1/+2)' },
  { value: 'Europe/Paris', label: 'Paris (GMT+1/+2)' },
  { value: 'Europe/Berlin', label: 'Berlim (GMT+1/+2)' },
  { value: 'Africa/Luanda', label: 'Luanda (GMT+1)' },
  { value: 'Africa/Maputo', label: 'Maputo (GMT+2)' },
  { value: 'America/New_York', label: 'Nova Iorque (GMT−5/−4)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (GMT−8/−7)' },
  { value: 'America/Sao_Paulo', label: 'São Paulo (GMT−3)' },
  { value: 'Asia/Tokyo', label: 'Tóquio (GMT+9)' },
  { value: 'Australia/Sydney', label: 'Sydney (GMT+10/+11)' },
];

export const resolveTimeZone = (pref: string | null | undefined): string => {
  if (!pref || pref === AUTO_TZ) return browserTz;
  return pref;
};

let cachedPref: string | null | undefined;
const listeners = new Set<(tz: string | null | undefined) => void>();

export const setUserTimeZonePref = (pref: string | null | undefined) => {
  cachedPref = pref;
  listeners.forEach((l) => l(pref));
};

export function useUserTimeZone(): { timeZone: string; preference: string } {
  const { user } = useAuth();
  const [pref, setPref] = useState<string | null | undefined>(cachedPref);

  useEffect(() => {
    const listener = (v: string | null | undefined) => setPref(v);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    if (cachedPref !== undefined) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('time_zone')
        .eq('id', user.id)
        .maybeSingle();
      if (!active) return;
      const tz = (data as any)?.time_zone ?? null;
      cachedPref = tz;
      setUserTimeZonePref(tz);
    })();
    return () => {
      active = false;
    };
  }, [user]);

  return {
    timeZone: resolveTimeZone(pref),
    preference: pref ?? AUTO_TZ,
  };
}
