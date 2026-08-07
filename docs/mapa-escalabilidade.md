# Escalabilidade do mapa — diagnóstico e plano de bounding box

Documento de referência. **Nada aqui está implementado**, à excepção do limite de segurança
(`MAP_PROFILE_LIMIT = 2000`) e do card de monitorização no `/admin`.

Última actualização: 2026-08-07.

---

## 1. Situação actual (factos verificados)

| Facto | Valor |
|---|---|
| Perfis com `onboarding_completed = true` | 29 |
| Destes, com coordenadas preenchidas | 26 |
| Tamanho total da tabela `profiles` | 144 kB |
| PostGIS instalado | Não (extensões: plpgsql, pg_stat_statements, uuid-ossp, pgcrypto, supabase_vault, pg_cron, pg_net) |
| Tipo das coordenadas | Colunas `numeric` simples (`latitude`/`longitude` e `approx_latitude`/`approx_longitude`) |

Carregamento actual, em `src/components/MapComponent.tsx` → `loadMusicians`:

- Autenticado: `from('profiles')` com coordenadas exactas.
- Não autenticado: `from('public_profiles')` com `approx_*` (arredondadas a 2 casas, ~1,1 km).
- Um único fetch de **todos** os perfis com coordenadas, **sem filtro geográfico e sem paginação**.
- `.limit(MAP_PROFILE_LIMIT)` = 2000, apenas como rede de segurança.
- Clustering feito no browser com **Supercluster**; cada ponto visível é um **marcador DOM** do Mapbox.

## 2. Onde é que isto degrada

O gargalo **não** é o Supercluster (indexa dezenas de milhares de pontos em poucos ms/centenas de ms).
O gargalo é o Mapbox criar um elemento HTML por ponto visível:

- até ~200 marcadores visíveis: fluido;
- ~300–500: pan/zoom começa a engasgar;
- \>1000 visíveis: notoriamente lento, sobretudo em mobile.

Secundariamente, a transferência: 2000 perfis ≈ 0,5–1 MB de JSON por carregamento.

## 3. Critérios explícitos de acção

| Condição | Acção |
|---|---|
| Perfis com coordenadas **> 300** | Implementar **bounding box** (secção 4) |
| Muitos pins visíveis em simultâneo mesmo com bounding box | Migrar de marcadores DOM para **camada GeoJSON/WebGL** |
| Perfis com coordenadas **> 10.000** | Instalar **PostGIS** e fazer clustering server-side |

A contagem actual está visível no `/admin` → separador Estatísticas (card "Escala do mapa"),
que avisa a partir de 250 e alerta a partir de 300.

## 4. Plano do bounding box (a implementar quando o critério for atingido)

### 4.1 Query filtrada por viewport

```ts
const b = map.getBounds();               // LngLatBounds
const sw = b.getSouthWest(), ne = b.getNorthEast();

// Autenticado
supabase.from('profiles')
  .select(...)
  .eq('onboarding_completed', true)
  .gte('latitude',  sw.lat).lte('latitude',  ne.lat)
  .gte('longitude', sw.lng).lte('longitude', ne.lng)
  .limit(MAP_PROFILE_LIMIT);             // passa a ser limite POR viewport

// Não autenticado: mesma coisa sobre public_profiles com approx_latitude/approx_longitude
```

Casos a tratar:

- **Antimeridiano**: se `sw.lng > ne.lng` o viewport atravessa ±180°; partir em duas queries
  (`lng >= sw.lng` OR `lng <= ne.lng`) ou usar `.or('longitude.gte.X,longitude.lte.Y')`.
- **Zoom-out global**: se os bounds cobrem praticamente o mundo, não vale a pena filtrar —
  cai no comportamento actual (fetch único com limite).
- **Padding**: alargar os bounds em ~20% para que um pequeno arrasto não force logo novo fetch.

### 4.2 Debounce no movimento do mapa

- Ouvir apenas `moveend` e `zoomend` (nunca `move`, que dispara a cada frame).
- Debounce de ~300 ms.
- Cancelar o pedido anterior com `AbortController` (`.abortSignal(controller.signal)` no client).
- Ignorar respostas fora de ordem comparando um `requestId` incremental.
- Não refazer fetch se os novos bounds estiverem contidos nos bounds já carregados (com padding).

### 4.3 Cache por viewport

- Chave de cache ("tile-key") = bounds arredondados a uma grelha + nível de zoom agrupado
  (ex.: `z<=4`, `5-8`, `9-12`, `>=13`).
- `Map<string, { ids: string[]; fetchedAt: number }>` em memória (ref, não estado) com TTL de
  ~5 minutos; ao voltar a uma área já vista, servir do cache e revalidar em segundo plano.
- Dicionário global `Map<id, Musician>` acumulado, para deduplicar entre viewports e evitar
  pins a piscar quando se volta atrás.
- Opcional: limitar o acumulado (ex.: 5000 entradas, LRU) para não crescer indefinidamente.

### 4.4 O que muda em `MapComponent.tsx`

- `loadMusicians` passa a aceitar `bounds` e a devolver apenas o delta desse viewport.
- Novos listeners `moveend`/`zoomend` com o debounce acima, limpos no unmount.
- O estado deixa de ser "a lista completa" e passa a ser "o acumulado deduplicado por id";
  a lista lateral de músicos mostra apenas os que estão dentro dos bounds actuais.
- O índice do Supercluster é reconstruído a partir do acumulado (memoizado por contagem+bounds).
- `MAP_PROFILE_LIMIT` muda de semântica: limite por viewport, não limite global.
- Filtros existentes (instrumento, nível, géneros, favoritos, Pro) continuam a aplicar-se
  depois do fetch; se algum passar a server-side, tem de entrar na mesma query.

### 4.5 Lista de verificação para quando se implementar

- [ ] Sem fetch durante o arrasto (verificar no separador Network).
- [ ] Voltar a uma área já vista não gera novo pedido dentro do TTL.
- [ ] Pins Pro (halo dourado) e clusters com anel dourado continuam correctos.
- [ ] Utilizador não autenticado continua a ver apenas coordenadas aproximadas.
- [ ] Zoom-out global não rebenta com o limite nem faz download de tudo repetidamente.
- [ ] Bloqueios (`blocked_users`) continuam a filtrar correctamente.

## 5. Alternativas descartadas por agora

| Opção | Porque não agora |
|---|---|
| Bounding box | Com 26 pontos não traz ganho mensurável; acrescenta debounce, cache e novas classes de bugs |
| Camada GeoJSON/WebGL | Obrigaria a refazer os pins Pro/halo/badges, que hoje são HTML |
| PostGIS | Extensão, coluna `geography`, índice GiST e RPC de clustering — só se justifica na ordem das dezenas de milhar |
| Paginação simples | Não resolve nada num mapa: o utilizador quer os pontos da área, não "a página 2" |

Ordem natural de adopção quando crescer: **bounding box → GeoJSON/WebGL → PostGIS**.

---

## 6. Protótipo PostGIS (já existe na base de dados, inactivo no frontend)

Implementado a 2026-08-07 como preparação. **Não está ligado ao `MapComponent.tsx`** — só se adopta
se os perfis com coordenadas ultrapassarem a ordem das dezenas de milhares.

Base de dados:

- Extensão `postgis` activada (schema `extensions`).
- `public.profiles.approx_geom` — coluna `geometry(Point,4326)` **GENERATED ALWAYS ... STORED**,
  derivada de `approx_longitude`/`approx_latitude` (coordenadas aproximadas, nunca as exactas).
- Índice `profiles_approx_geom_gist` (GiST) para filtragem por área.
- `public.get_map_clusters(_min_lng, _min_lat, _max_lng, _max_lat, _zoom)` — SECURITY DEFINER,
  `EXECUTE` apenas para `authenticated`. Filtra por `onboarding_completed`, por bounding box
  (`&&` sobre `ST_MakeEnvelope`) e exclui utilizadores bloqueados (`has_block_between`).
  Agrega com `ST_SnapToGrid` numa grelha de `360 / 2^zoom / 4` graus e devolve por célula:
  `cluster_key`, `lng`, `lat`, `point_count`, `pro_count` e `profile_id` (só quando a célula tem 1 ponto).

Frontend:

- `src/lib/mapClustersRpc.ts` — `fetchMapClusters(bounds, zoom, signal)` e `clustersToGeoJSON()`.
  Nenhum componente o importa ainda.

Resultado do teste com os dados actuais (mundo inteiro, zoom 4): 6 células, a maior com 6 perfis
na zona de Lisboa, as restantes com 1 ponto e `profile_id` preenchido — comportamento esperado.

Para adoptar no futuro: substituir o Supercluster no browser por `fetchMapClusters` em `moveend`/
`zoomend` (mesmo debounce e cache da secção 4) e desenhar os clusters como camada GeoJSON em vez de
marcadores DOM.
