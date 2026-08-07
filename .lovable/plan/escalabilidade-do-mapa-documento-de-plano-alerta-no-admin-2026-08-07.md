# Escalabilidade do mapa: documento de plano + alerta no /admin

Nada de bounding box nem PostGIS é implementado agora. Só se cria o documento de referência, o critério explícito de decisão e um indicador simples no painel de administração.

## 1. Documento `docs/mapa-escalabilidade.md` (novo, só texto)

Conteúdo:

- **Situação atual (factos verificados)**: 29 perfis com onboarding concluído, 26 com coordenadas; tabela `profiles` com 144 kB; PostGIS não instalado; `loadMusicians` carrega tudo de uma vez com `limit(2000)` como rede de segurança; clustering feito no browser com Supercluster e pins como marcadores DOM.
- **Onde degrada**: gargalo são os marcadores DOM do Mapbox (~300–500 visíveis começa a engasgar), não o Supercluster.
- **Critérios de acção**: bounding box quando perfis com coordenadas > 300; camada GeoJSON/WebGL se o problema for render; PostGIS quando > 10.000.
- **Plano do bounding box** (a implementar no futuro):
  - **Query filtrada por viewport**: usar `map.getBounds()` e acrescentar `.gte/.lte` em latitude e longitude (colunas exatas para autenticado, `approx_*` para público), mantendo o `limit`. Tratar a travessia do antimeridiano e o caso zoom-out global (bounds a cobrir o mundo → cai no comportamento atual).
  - **Debounce**: refetch apenas em `moveend`/`zoomend`, com debounce de ~300 ms e cancelamento do pedido anterior (AbortController), para não disparar durante o arrasto.
  - **Cache por viewport**: cache em memória por "tile-key" (bounds arredondados + nível de zoom) com Map + TTL curto; ao voltar a uma área já vista, servir do cache e revalidar em segundo plano. Manter um dicionário global `id → musician` para deduplicar entre viewports e evitar pins a piscar.
  - **O que muda em `MapComponent.tsx`**: `loadMusicians` passa a receber bounds; novos listeners `moveend`/`zoomend`; estado passa de "lista completa" para "acumulado deduplicado por id"; o índice do Supercluster é reconstruído a partir do acumulado; `MAP_PROFILE_LIMIT` passa a limite por viewport.
  - **Alternativas descartadas por agora** e porquê, mais uma lista de verificação para quando se implementar.

## 2. Alerta automático: card no `/admin`

Opção escolhida: **um card no separador de estatísticas do `/admin`**, e não um cron job ou notificação por email.

Porquê: os dados já são lidos nessa página, o custo é uma única query `count` (`head: true`, sem trazer linhas), não acrescenta infraestrutura nova (sem cron, sem Edge Function, sem tabela de estado) e é visto exactamente por quem tomaria a decisão. Um alerta por email exigiria job agendado, função e gestão de duplicados — over-engineering para um limiar que está a 26/300.

Implementação:

- Novo componente `src/components/admin/MapScaleCard.tsx`: conta perfis com `onboarding_completed = true` e latitude preenchida, e mostra contagem, limiar (300) e barra de progresso.
- Estados visuais: **normal** (< 250), **aviso** (250–299, cor de atenção + texto "aproxima-se do limiar: planear bounding box"), **acção** (>= 300, cor destrutiva + link para `docs/mapa-escalabilidade.md`).
- Inserido no separador "stats" do `Admin.tsx`, ao lado dos cards existentes. Sem alterações de dados nem de esquema.

## 3. `PROJECT_CONTEXT.md`

- Na tabela de **Riscos**, actualizar a linha "Carga do mapa com muitos utilizadores" com o critério explícito: *bounding box quando perfis com coordenadas > 300; PostGIS quando > 10.000; plano em `docs/mapa-escalabilidade.md`*.
- Em **Melhorias necessárias**, substituir a frase vaga sobre filtragem geográfica por uma referência ao documento e ao limiar, mais a menção ao card de monitorização no `/admin`.

## Notas técnicas

- Sem migrações, sem alterações de RLS, sem alterações às queries do mapa nesta iteração.
- A contagem no `/admin` respeita as políticas existentes (admins já podem ler todos os perfis).
- No fim, faço commit e devolvo o hash.
