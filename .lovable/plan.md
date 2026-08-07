# Diagnóstico: escalabilidade do mapa (sem alterações)

## 1. Quantos perfis existem hoje

Consulta direta à base de dados:

- `profiles` total: **29**
- com `onboarding_completed = true`: **29**
- com coordenadas preenchidas (aparecem mesmo no mapa): **26**
- tamanho total da tabela: 144 kB

## 2. Como funciona o carregamento hoje

`MapComponent.loadMusicians()` pede **todos os perfis de uma vez**, sem paginação, sem limite e sem bounding box. Só filtra "tem coordenadas".

Autenticado (`src/components/MapComponent.tsx:218`):

```ts
supabase.from('profiles')
  .select('id, username, instrument, city, country, latitude, longitude, average_rating, total_ratings, avatar_url, skill_level, gender, genres, pro_until')
  .not('latitude', 'is', null)
  .not('longitude', 'is', null);
```

Visitante (linha 228):

```ts
supabase.from('public_profiles')
  .select('id, username, instrument, city, country, approx_latitude, approx_longitude, average_rating, total_ratings, avatar_url, skill_level, gender, pro_until')
  .not('approx_latitude', 'is', null)
  .not('approx_longitude', 'is', null);
```

Depois de carregado, **tudo acontece no browser**: os filtros (pesquisa, cidade, instrumento, nível, género, favoritos, distância, disponibilidade) são aplicados em memória (linha 573), o índice Supercluster é reconstruído de raiz sempre que qualquer filtro muda (linha 608), e `renderClusters()` corre em cada `moveend`/`zoomend`.

Nota: o PostgREST tem um teto implícito por defeito (tipicamente 1000 linhas), por isso acima desse número o mapa passaria silenciosamente a mostrar só uma parte dos perfis — sem erro visível.

## 3. Onde começa a degradar

O gargalo **não** é o Supercluster — é o resto:

- **Supercluster puro**: indexa dezenas de milhares de pontos em poucos ms; 100k pontos ainda é confortável.
- **Marcadores DOM do Mapbox** (`new mapboxgl.Marker` com elemento HTML por ponto, linha 560): é aqui que dói. Cada ponto visível é um nó DOM com estilos e listeners, recriado a cada movimento do mapa. Começa a notar-se a partir de **~300–500 marcadores visíveis em simultâneo**; acima de ~1000 fica claramente lento em portáteis modestos.
- **Payload da query**: ~26 perfis hoje é irrelevante. A ~2 000 perfis são alguns MB por carregamento — aceitável mas desperdiçado. A ~10 000, o teto de 1000 linhas do PostgREST já tornou o mapa incorreto muito antes disso.
- **Reconstrução do índice a cada mudança de filtro**: linear, mas com o `fitBounds` e o re-render de marcadores acoplados, sente-se a partir de alguns milhares.

Resumo prático: **até ~1 000 perfis** o desenho atual aguenta-se; entre **1 000 e 10 000** precisa de bounding box e de marcadores mais baratos; **acima de 10 000** precisa de agregação no servidor.

## 4. PostGIS

**Não está instalado.** Extensões ativas: `pg_cron`, `pg_net`, `pg_stat_statements`, `pgcrypto`, `plpgsql`, `supabase_vault`, `uuid-ossp`. As coordenadas são colunas `numeric` (`latitude`/`longitude` e `approx_latitude`/`approx_longitude`), sem tipo geométrico nem índice espacial.

## 5. Opções técnicas, da mais simples à mais trabalhosa

**a. Bounding box da área visível — esforço baixo (algumas horas)**
Adicionar `.gte/.lte` em lat/lng aos dois selects, recarregar em `moveend` com debounce, e um índice B-tree composto `(latitude, longitude)`. Implica desligar o `fitBounds` automático (senão o mapa persegue-se a si próprio) e tratar a lista lateral, que hoje mostra tudo o que foi carregado. Não exige PostGIS. Resolve o payload, mas não resolve "o utilizador afasta o zoom e vê o mundo inteiro".

**b. Paginação/limite server-side — esforço muito baixo, valor limitado**
Um `.limit(N)` explícito evita o corte silencioso dos 1000, mas num mapa mostrar "os primeiros N" é arbitrário: escolhe perfis sem critério geográfico. Serve como rede de segurança, não como solução.

**c. Clustering no servidor com PostGIS — esforço alto (vários dias)**
Instalar PostGIS, adicionar coluna `geography(Point)` mantida por trigger, índice GiST, e uma função `get_map_clusters(bbox, zoom)` com `ST_ClusterDBSCAN` ou agregação por grelha (`ST_SnapToGrid`), exposta via RPC. No frontend: remover o Supercluster, passar a pedir clusters ao servidor em cada `moveend`, e separar dois modos de resposta (clusters agregados em zoom baixo, perfis individuais em zoom alto). Todos os filtros teriam de passar a ser parâmetros da função SQL — hoje são só JavaScript, e essa é a maior parte do trabalho. Só compensa nas dezenas de milhares.

**d. Outras opções específicas Supabase/Postgres**
- **Vetores em vez de marcadores DOM**: usar uma fonte GeoJSON do Mapbox com `cluster: true` e camadas de símbolos. É a mudança com melhor rácio esforço/ganho depois da (a) — o Mapbox faz o clustering em WebGL e o custo de DOM desaparece. Implica repensar os pins Pro/favorito/match como expressões de estilo em vez de HTML.
- **Vista materializada** com só as colunas do mapa, refrescada periodicamente — reduz o peso da query sem alterar o frontend.
- **Tiles vetoriais servidas por edge function** (`ST_AsMVT`), o passo seguinte ao (c) para escala grande.
- **Grelha barata sem PostGIS**: já existem `approx_latitude`/`approx_longitude` arredondados a 2 casas; um `GROUP BY` sobre eles dá contagens agregadas por célula sem instalar nada.

## 6. Recomendação para agora

Com **26 perfis no mapa**, nada disto é necessário hoje. O ganho de qualquer otimização é zero e o custo em complexidade é real.

- **Agora**: apenas uma rede de segurança — um `.limit()` explícito nos dois selects, para que o dia em que os perfis passem de 1000 não produza um mapa silenciosamente incompleto. Minutos de trabalho.
- **A partir de ~500 perfis reais**: opção (a) bounding box + índice composto, e a migração dos marcadores DOM para camadas GeoJSON do Mapbox (opção d). É este par que resolve o problema real.
- **A partir de ~10 000 perfis**: PostGIS e clustering no servidor (opção c). Antes disso é otimização prematura.

Não foi alterado nenhum ficheiro — isto é só o diagnóstico pedido.
