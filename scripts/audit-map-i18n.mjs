#!/usr/bin/env node
// Auditoria automática de chaves i18n usadas nos componentes do mapa.
// Falha (exit 1) se qualquer chave estiver ausente em PT/EN/ES/FR.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const LOCALES = ['pt', 'en', 'es', 'fr'];
const LOCALE_DIR = join(ROOT, 'src/i18n/locales');

// Componentes/páginas relacionadas com o mapa
const MAP_FILES = [
  'src/components/MapComponent.tsx',
  'src/components/MapFilters.tsx',
  'src/components/MapFiltersBar.tsx',
  'src/components/MusicianPopup.tsx',
  'src/components/MusiciansList.tsx',
  'src/components/MusicianCard.tsx',
  'src/components/HomeMapSidebar.tsx',
  'src/components/SearchBar.tsx',
  'src/pages/Map.tsx',
];

function walkSource(file) {
  try { return readFileSync(join(ROOT, file), 'utf8'); }
  catch { return ''; }
}

// Extrai chaves de t('...') / t("...") restritas ao namespace map.*
function extractMapKeys(src) {
  const keys = new Set();
  const re = /\bt\(\s*['"]([^'"`]+)['"]/g;
  let m;
  while ((m = re.exec(src))) {
    const k = m[1];
    if (k.startsWith('map.')) keys.add(k);
  }
  // Padrão pluralizado dinâmico: t(cond ? 'map.x_one' : 'map.x_other', ...)
  // já é capturado pelo regex acima visto que cada literal aparece individualmente.
  return keys;
}

function flatten(obj, prefix = '') {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(out, flatten(v, key));
    else out[key] = v;
  }
  return out;
}

const usedKeys = new Set();
for (const f of MAP_FILES) {
  for (const k of extractMapKeys(walkSource(f))) usedKeys.add(k);
}

const locales = {};
for (const lng of LOCALES) {
  const json = JSON.parse(readFileSync(join(LOCALE_DIR, `${lng}.json`), 'utf8'));
  locales[lng] = flatten(json);
}

const missing = {};
for (const key of usedKeys) {
  for (const lng of LOCALES) {
    const val = locales[lng][key];
    if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
      (missing[lng] ||= []).push(key);
    }
  }
}

const total = Object.values(missing).reduce((a, b) => a + b.length, 0);

console.log(`[i18n-audit] ${usedKeys.size} chaves do mapa em uso, ${LOCALES.length} idiomas verificados.`);

if (total > 0) {
  console.error('\n❌ Chaves i18n do mapa em falta:');
  for (const lng of LOCALES) {
    if (missing[lng]?.length) {
      console.error(`  [${lng}] ${missing[lng].length}:`);
      for (const k of missing[lng]) console.error(`    - ${k}`);
    }
  }
  process.exit(1);
}

console.log('✅ Todas as chaves i18n do mapa estão presentes em PT/EN/ES/FR.');
