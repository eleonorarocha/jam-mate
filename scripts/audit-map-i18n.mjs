#!/usr/bin/env node
// Auditoria automática de chaves i18n.
// Falha (exit 1) se qualquer chave usada estiver ausente em PT/EN/ES/FR.
// Cobertura:
//   - `map.*`   → componentes do mapa
//   - `pages.*` → títulos/metadados das rotas (todo o src/)
//   - `nav.*`   → menu de navegação e links entre páginas (todo o src/)
//   - `auth.*`  → ecrãs de autenticação (login/registo/recuperação) (todo o src/)
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const LOCALES = ['pt', 'en', 'es', 'fr'];
const LOCALE_DIR = join(ROOT, 'src/i18n/locales');

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

const NAMESPACES = ['map.', 'pages.', 'nav.', 'auth.'];

function read(file) {
  try { return readFileSync(join(ROOT, file), 'utf8'); } catch { return ''; }
}

function walkDir(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walkDir(p, out);
    else if (['.ts', '.tsx', '.js', '.jsx'].includes(extname(p))) out.push(p);
  }
  return out;
}

function extractKeys(src, prefixes) {
  const keys = new Set();
  // t('key', ...) ou t("key", ...)
  const tRe = /\bt\(\s*['"]([^'"`]+)['"]/g;
  // Strings literais "pages.x.title" usadas noutros contextos (ex.: ROUTE_TITLE_KEYS).
  const litRe = /['"]((?:map|pages|nav|auth)\.[a-zA-Z0-9_.]+)['"]/g;
  for (const re of [tRe, litRe]) {
    let m;
    while ((m = re.exec(src))) {
      const k = m[1];
      if (prefixes.some((p) => k.startsWith(p))) keys.add(k);
    }
  }
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
// map.* — só nos ficheiros do mapa
for (const f of MAP_FILES) {
  for (const k of extractKeys(read(f), ['map.'])) usedKeys.add(k);
}
// pages.* + nav.* + auth.* — varre todo o src/
for (const f of walkDir(join(ROOT, 'src'))) {
  for (const k of extractKeys(readFileSync(f, 'utf8'), ['pages.', 'nav.', 'auth.'])) usedKeys.add(k);
}

const locales = {};
for (const lng of LOCALES) {
  locales[lng] = flatten(JSON.parse(readFileSync(join(LOCALE_DIR, `${lng}.json`), 'utf8')));
}

const missing = {};
for (const key of usedKeys) {
  for (const lng of LOCALES) {
    const v = locales[lng][key];
    if (v === undefined || v === null || (typeof v === 'string' && v.trim() === '')) {
      (missing[lng] ||= []).push(key);
    }
  }
}

const total = Object.values(missing).reduce((a, b) => a + b.length, 0);
console.log(`[i18n-audit] ${usedKeys.size} chaves em uso (${NAMESPACES.join(', ')}), ${LOCALES.length} idiomas verificados.`);

if (total > 0) {
  console.error('\n❌ Chaves i18n em falta:');
  for (const lng of LOCALES) {
    if (missing[lng]?.length) {
      console.error(`  [${lng}] ${missing[lng].length}:`);
      for (const k of missing[lng]) console.error(`    - ${k}`);
    }
  }
  process.exit(1);
}

console.log('✅ Todas as chaves i18n estão presentes em PT/EN/ES/FR.');
