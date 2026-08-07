# Três frentes: pagamentos, bug do mapa, géneros musicais

Três blocos independentes, com commits separados e confirmação individual no fim de cada um.

---

## Frente 1 — Pagamentos, Etapa 2 (backend Stripe, sandbox)

Três edge functions novas, todas em modo teste.

1. `supabase/functions/_shared/stripe.ts` — cliente Stripe via gateway Lovable (`createStripeClient`) e `verifyWebhook` (HMAC-SHA256 com o segredo sandbox).
2. `supabase/functions/create-checkout/index.ts` — valida o JWT do utilizador, resolve o preço por `lookup_key` (`pro_monthly` / `pro_yearly`), cria a sessão de Checkout com `metadata.userId` e `subscription_data.metadata.userId`, devolve o URL.
3. `supabase/functions/customer-portal/index.ts` — devolve URL do portal do cliente a partir do `stripe_customer_id` guardado em `subscriptions`.
4. `supabase/functions/payments-webhook/index.ts` — endpoint já registado no Stripe (`?env=sandbox`). Verifica assinatura, é idempotente por `event.id` e trata:
   - `checkout.session.completed` (só quando `payment_status !== "unpaid"`)
   - `customer.subscription.created` / `updated` / `deleted`

   Escreve em `subscriptions` (`tier`, `status`, `current_period_end`, `price_id`, `stripe_customer_id`, `cancel_at_period_end`, `environment`) com upsert por `provider_subscription_id`; o trigger `sync_pro_until` propaga para `profiles.pro_until`.

Idempotência: tabela pequena `processed_stripe_events (event_id text primary key, created_at)` para descartar reentregas do Stripe. Requer uma migração (só service_role escreve).

Frontend do checkout fica para a Etapa 3, como combinado.

---

## Frente 2 — Bug: duas caixas de perfil

**Causa raiz encontrada** (confirmada em `src/components/MapComponent.tsx`):

O mesmo marcador de músico tem **duas** vias de abertura de perfil ligadas ao mesmo clique:

1. `marker.setPopup(popup)` — popup nativo do Mapbox com o HTML de `buildMapPopupHTML` (linhas ~483 e ~535).
2. `el.addEventListener('click', ...)` — dispara `onMusicianSelect(musician)` (ou, quando essa prop não existe, `setSelectedMusician`), o que faz renderizar o componente React `MusicianPopup` em `Map.tsx` / no próprio `MapComponent`.

Não é listener duplicado nem conflito com cluster: são dois componentes distintos a responder ao mesmo clique. Por isso aparecem sempre duas caixas.

**Correção:** manter apenas o popup nativo do Mapbox no clique do marcador (é o que está ancorado ao pin e já tem os botões perfil/mensagem/agendar). O clique no marcador deixa de chamar `onMusicianSelect` / `setSelectedMusician`. O card React `MusicianPopup` continua a existir e a ser usado pelo clique na **lista lateral** de músicos (`MusiciansList` → `handleMusicianClick`), onde não há popup nativo.

---

## Frente 3 — Géneros musicais no perfil

**Decisão: `text[]`, não `enum[]`.** Um enum em Postgres exige migração sempre que se acrescenta um género, não se remove valores, e o array de enum complica os filtros e os tipos gerados. A lista fechada fica no frontend (constante partilhada + chaves i18n), com validação por trigger a garantir que só entram valores da lista. Flexibilidade sem perder consistência.

**Lista inicial (16):** rock, pop, jazz, blues, funk, soul, classica, folk, eletronica, hiphop, reggae, metal, punk, latina, country, world.

1. **Migração:** `profiles.genres text[] not null default '{}'` + índice GIN + trigger de validação contra a lista permitida.
2. **Constante partilhada:** `src/lib/genres.ts` com as chaves; rótulos via `t('map.genres.<key>')`.
3. **Onboarding:** novo passo obrigatório de seleção múltipla (chips/toggles), não avança com zero géneros; validação também no `handleFinish`.
4. **ProfilePanel:** mesmo seletor múltiplo, editável a qualquer momento.
5. **Filtros:** filtro de género em `MapFilters` / `MapFiltersBar` ao lado de instrumento e nível; filtragem por interseção (perfil mostrado se tiver pelo menos um dos géneros escolhidos). Também aparece no card/popup do músico.
6. **i18n:** chaves `map.genres.*` e labels de filtro nas 4 línguas; corro `scripts/audit-map-i18n.mjs` para confirmar que não falha.
7. **Perfis fictícios:** preencho os 20 perfis de teste com 1–3 géneros plausíveis por perfil, para o filtro ter dados visíveis. Perfis reais existentes ficam vazios (o campo obrigatório aplica-se só a novos onboardings).

---

## Notas técnicas

- Stripe continua em sandbox; nada é publicado em produção.
- Todas as migrações incluem GRANTs e RLS conforme o padrão do projeto.
- Cada frente é entregue com o seu commit e um resumo separado.
