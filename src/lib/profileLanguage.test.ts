import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { normalizeLanguage } from './profileLanguage';

describe('normalizeLanguage', () => {
  let originalNavigatorLanguage: string | undefined;

  beforeEach(() => {
    originalNavigatorLanguage = (globalThis as any).navigator?.language;
  });

  afterEach(() => {
    vi.stubGlobal('navigator', { language: originalNavigatorLanguage });
    vi.unstubAllGlobals();
  });

  // Regional variants must collapse to supported 2-letter codes
  it.each([
    { input: 'pt-BR', expected: 'pt' },
    { input: 'pt-br', expected: 'pt' },
    { input: 'es-ES', expected: 'es' },
    { input: 'es-419', expected: 'es' },
    { input: 'fr-CA', expected: 'fr' },
    { input: 'fr-FR', expected: 'fr' },
    { input: 'en-GB', expected: 'en' },
    { input: 'en-US', expected: 'en' },
    { input: 'EN-us', expected: 'en' },
  ])('maps "$input" -> "$expected"', ({ input, expected }) => {
    vi.stubGlobal('navigator', { language: '' });
    expect(normalizeLanguage(input)).toBe(expected);
  });

  // Already-normalized codes pass through
  it.each([
    { input: 'pt', expected: 'pt' },
    { input: 'en', expected: 'en' },
    { input: 'es', expected: 'es' },
    { input: 'fr', expected: 'fr' },
  ])('keeps "$input" as "$expected"', ({ input, expected }) => {
    vi.stubGlobal('navigator', { language: '' });
    expect(normalizeLanguage(input)).toBe(expected);
  });

  // Null / empty / whitespace fallback chain
  it('falls back to navigator.language when raw is empty', () => {
    vi.stubGlobal('navigator', { language: 'es-ES' });
    expect(normalizeLanguage('')).toBe('es');
  });

  it('falls back to navigator.language when raw is null', () => {
    vi.stubGlobal('navigator', { language: 'fr-CA' });
    expect(normalizeLanguage(null)).toBe('fr');
  });

  it('falls back to navigator.language when raw is unsupported', () => {
    vi.stubGlobal('navigator', { language: 'pt-BR' });
    expect(normalizeLanguage('de-DE')).toBe('pt');
  });

  // Ultimate fallback to 'en' when nothing matches
  it('falls back to "en" when both raw and navigator.language are unsupported', () => {
    vi.stubGlobal('navigator', { language: 'de-DE' });
    expect(normalizeLanguage('it-IT')).toBe('en');
  });

  it('falls back to "en" when navigator is undefined and raw is unsupported', () => {
    vi.stubGlobal('navigator', undefined as any);
    expect(normalizeLanguage('zh-CN')).toBe('en');
  });
});
