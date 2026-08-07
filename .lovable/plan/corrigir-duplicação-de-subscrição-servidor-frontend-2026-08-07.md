# Corrigir duplicação de subscrição (servidor + frontend)

Hoje é possível pagar duas vezes: `create-checkout` cria sempre uma nova sessão de Checkout, sem verificar se o utilizador já tem subscrição ativa, e o `UpgradeProDialog` mostra sempre os planos, mesmo a quem já é Pro.

## Camada 1 — Servidor (bloqueio real)

Em `create-checkout`, depois de validar o utilizador e antes de criar a sessão:

1. Consultar `subscriptions` para esse `user_id` e ambiente, procurando uma linha com `tier = 'pro'`, `status = 'active'` e `current_period_end` no futuro (ou nulo).
2. Se existir, não criar checkout. Gerar em vez disso uma sessão do portal do cliente Stripe com o `stripe_customer_id` dessa linha e responder `409` com `{ error, portalUrl }`.
3. Se não existir subscrição ativa, o fluxo segue exatamente como hoje.

A lógica de criação da sessão do portal passa para um helper partilhado em `supabase/functions/_shared/`, usado tanto por `create-checkout` como por `customer-portal`, para não haver duas implementações.

## Camada 2 — Frontend

- `UpgradeProDialog`: quando `usePro` indicar que o utilizador já é Pro, o diálogo deixa de mostrar os planos e passa a mostrar um estado "Já és Pro" com o botão **Gerir subscrição**, que abre o portal do cliente numa nova janela (mesma chamada usada nas Definições).
- `StripeEmbeddedCheckout`: se `create-checkout` responder com `portalUrl` (corrida entre dois pagamentos quase simultâneos), o componente não tenta montar o checkout — devolve essa informação ao diálogo, que muda para o estado "Já és Pro" com o link do portal em vez de mostrar um erro genérico.

A ação "abrir portal" fica num pequeno hook partilhado para ser reutilizada pelo diálogo e pelas Definições sem duplicar código.

## Teste após a correção

Com o utilizador de teste já usado no E2E:

1. Confirmar subscrição ativa na base de dados.
2. Chamar `create-checkout` novamente com o mesmo utilizador — esperado: `409` com `portalUrl`, sem `clientSecret`.
3. Repetir com o plano anual — mesmo resultado.
4. Confirmar por consulta à base de dados que o número de linhas em `subscriptions` para esse utilizador não aumentou.
5. Verificar no diálogo que um utilizador Pro vê apenas "Gerir subscrição" e um utilizador Free continua a ver os dois planos e a conseguir pagar.

Tudo continua em sandbox. No fim, indico o hash do commit e o resultado de cada passo.

## Detalhes técnicos

- Ficheiros: `supabase/functions/create-checkout/index.ts`, `supabase/functions/customer-portal/index.ts`, novo `supabase/functions/_shared/portal.ts`, `src/components/UpgradeProDialog.tsx`, `src/components/StripeEmbeddedCheckout.tsx`, `src/components/SubscriptionSettings.tsx`, novo hook para abrir o portal.
- A verificação no servidor usa a service role, por isso não depende de RLS nem do estado do cliente.
- Sem alterações ao esquema da base de dados.
