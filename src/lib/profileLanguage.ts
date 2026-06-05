import { supabase } from '@/integrations/supabase/client';
import i18n, { SUPPORTED_LANGUAGES } from '@/i18n';

const SUPPORTED = SUPPORTED_LANGUAGES.map((l) => l.code) as readonly string[];
const DEFAULT_FALLBACK = 'en';

/** Normalize any raw value (e.g. "pt-BR", "EN_US") to a supported PT/EN/ES/FR code. */
export function normalizeLanguage(raw: string | null | undefined): string {
  const code = (raw || '').toLowerCase().slice(0, 2);
  if (SUPPORTED.includes(code)) return code;
  const browser = typeof navigator !== 'undefined' ? navigator.language : '';
  const b = (browser || '').toLowerCase().slice(0, 2);
  if (SUPPORTED.includes(b)) return b;
  return DEFAULT_FALLBACK;
}

/**
 * Update profiles.language with automatic fallback.
 * If the server rejects the value (e.g. invalid code), retry once with a
 * normalized PT/EN/ES/FR fallback so the profile is never left in a bad state.
 */
export async function updateProfileLanguage(
  userId: string,
  raw: string | null | undefined,
): Promise<string> {
  const desired = normalizeLanguage(raw);
  const { error } = await supabase
    .from('profiles')
    .update({ language: desired })
    .eq('id', userId);

  if (!error) return desired;

  // Server rejected (e.g. validation trigger). Fall back and align i18n.
  const fallback = normalizeLanguage(i18n.resolvedLanguage || i18n.language);
  const safe = SUPPORTED.includes(fallback) ? fallback : DEFAULT_FALLBACK;
  await supabase.from('profiles').update({ language: safe }).eq('id', userId);
  if (i18n.resolvedLanguage !== safe) {
    try { await i18n.changeLanguage(safe); } catch { /* ignore */ }
  }
  // eslint-disable-next-line no-console
  console.warn(`[language] server rejected "${raw}", fell back to "${safe}"`, error.message);
  return safe;
}
