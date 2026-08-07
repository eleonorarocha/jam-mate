# Etapa 3 — Frontend do checkout Stripe (sandbox)

Ligar o diálogo Pro ao checkout real, tornar o estado Pro reativo em tempo real e permitir gerir a subscrição a partir das Definições. Tudo em modo teste; nada publicado.

## O que vai ser construído

### 1. Escolha de plano + checkout embutido
O `UpgradeProDialog` passa a mostrar dois cartões de plano:
- **Mensal** — 4,99 €/mês
- **Anual** — 39,99 €/ano, com etiqueta de poupança ("~33% de desconto — equivale a 3,33 €/mês")

Ao escolher um plano, o diálogo chama a função `create-checkout` e mostra o formulário de pagamento do Stripe embutido dentro do próprio diálogo (sem redirecionamento nem separador novo). Um botão "voltar" regressa à escolha de planos.

Após o pagamento, o utilizador vê um estado **"A ativar a tua subscrição…"** enquanto o pagamento é confirmado em segundo plano. Assim que o estado Pro fica ativo, o diálogo mostra a confirmação e as vantagens Pro ficam imediatamente disponíveis — sem recarregar a página.

### 2. Estado Pro em tempo real
O `usePro` passa a ouvir alterações da subscrição do utilizador em tempo real. Quando o pagamento é confirmado no servidor, o selo Pro, os limites de snippets (5 × 60s) e o resto das vantagens atualizam-se sozinhos em todos os ecrãs abertos.

Como salvaguarda (caso o evento em tempo real se atrase), o diálogo faz também algumas verificações espaçadas durante cerca de 30 segundos após o pagamento, e desiste com uma mensagem tranquilizadora ("o pagamento foi recebido, a ativação aparece em instantes") em vez de ficar preso a carregar.

### 3. Gerir subscrição nas Definições
Nova secção "Subscrição" na página de Definições:
- Utilizadores Free: descrição curta do Pro + botão que abre o diálogo de upgrade.
- Utilizadores Pro: estado do plano (mensal/anual), data de renovação ou de fim de acesso se já foi cancelado, e botão **"Gerir subscrição"** que abre o portal do cliente Stripe num separador novo (o portal não funciona dentro do iframe do preview — fica indicado na interface).

### 4. Aviso de modo de teste
Faixa discreta no diálogo de pagamento a indicar que os pagamentos no preview são em modo de teste, com o cartão de teste `4242 4242 4242 4242` mencionado para facilitar a validação.

## Detalhes técnicos

- **Dependências**: `@stripe/stripe-js@9.2.0` e `@stripe/react-stripe-js@6.2.0`.
- **`src/lib/stripe.ts`**: `getStripe()` e `getStripeEnvironment()` derivados do prefixo de `VITE_PAYMENTS_CLIENT_TOKEN` (`pk_test_` → `sandbox`); lança erro explícito se o token faltar (nunca assume `live`).
- **`src/components/StripeEmbeddedCheckout.tsx`**: `EmbeddedCheckoutProvider` + `EmbeddedCheckout`, com `fetchClientSecret` a invocar `create-checkout` (`priceId`, `environment`, `returnUrl`). O elemento é criado uma única vez para não remontar o provider.
- **`src/components/UpgradeProDialog.tsx`**: máquina de estados `plans → checkout → activating → done`; `returnUrl` aponta para a rota atual com `?checkout=success`.
- **`src/pages/CheckoutReturn.tsx`** + rota `/checkout/return` em `App.tsx`: página de retorno que lê `session_id`, aguarda a ativação e reencaminha para o perfil.
- **`src/hooks/usePro.ts`**: query passa a `order('created_at', desc).limit(1).maybeSingle()` com filtro `environment` (evita erro quando existe mais do que uma linha histórica); adiciona canal Realtime `postgres_changes` em `subscriptions` filtrado por `user_id`, com `removeChannel` no unmount; expõe também `tier`, `priceId`, `currentPeriodEnd` e `cancelAtPeriodEnd` para a UI das Definições.
- **Migração**: `ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions` e `REPLICA IDENTITY FULL` (a tabela ainda não está na publicação). A RLS existente já restringe a leitura ao próprio utilizador.
- **Definições**: nova secção que invoca `customer-portal` com `returnUrl` e abre a resposta com `window.open(url, '_blank')`.
- **i18n**: as strings novas seguem o padrão atual do ficheiro (texto PT direto nos componentes de perfil/definições), mantendo o script de auditoria a passar.

## Fora do âmbito desta etapa

Selos Pro e destaque visual no mapa (Etapa 4).
