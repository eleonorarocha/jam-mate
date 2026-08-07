# Pagamentos reais no tier Pro com Stripe

Objetivo: ligar o tier Pro a subscrições reais (mensal + anual) via Stripe, em ambiente de teste. Nada é publicado nesta fase.

## Resposta à tua pergunta

Não precisas de criar conta Stripe manualmente. O Lovable tem integração Stripe nativa, igual à que existia para Paddle: ao ativar, é criada uma conta em modo teste automaticamente, com as chaves e o segredo de assinatura do webhook guardados sem intervenção tua. Só precisarás de reclamar a conta mais tarde, se e quando quiseres aceitar pagamentos reais.

Nota sobre o motivo da mudança: o Paddle foi recusado na verificação de elegibilidade porque o JamMate é classificado como plataforma de encontros/matchmaking presencial. O Stripe cobre a tua razão original — em modo de gestão completa de conformidade o Stripe atua como merchant of record e trata de IVA (cálculo, cobrança, declaração e entrega), fraude, disputas e suporte transacional para compradores em cerca de 80 países, por +3,5% por transação além das taxas base. É ajustável ou desligável por transação mais tarde.

## Verificações já feitas no código

- Snippets: limites Free 1/30s e Pro 5/60s corretos, aplicados no cliente (`usePro`) e reforçados por trigger na base de dados (`enforce_snippet_limits` + `is_pro`). Nada a mudar.
- Vantagens Pro: três — snippets, destaque no mapa, selo Pro. Sem qualquer limite de reservas para ninguém.
- Escrita em `subscriptions`: as regras de acesso já bloqueiam criação/alteração pelo cliente; o utilizador só lê a sua própria linha. Mantém-se — só a função de servidor escreve.
- O estado Pro de *outros* utilizadores não é legível pelo cliente hoje, por isso o destaque no mapa precisa de um campo público novo.

## Etapas

### 1. Ativar Stripe (modo teste) + base de dados
Ativar a integração nativa e criar dois preços placeholder, cada um com o código fiscal adequado a software por subscrição:
- JamMate Pro — Mensal: 4,99 €/mês
- JamMate Pro — Anual: 39,99 €/ano

Migração com:
- `profiles.pro_until timestamptz` — campo de leitura pública, usado para o selo e o destaque no mapa (evita expor a tabela de subscrições).
- Índice para ordenar por Pro no mapa.
- Trigger `sync_pro_until` em `subscriptions` que atualiza `profiles.pro_until` sempre que a subscrição muda.

### 2. Backend — webhook
Edge function `stripe-webhook`:
- valida a assinatura Stripe antes de processar (401 se falhar);
- trata `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`;
- identifica o utilizador pelos metadados da sessão (`user_id`);
- faz upsert em `subscriptions` com `tier`, `status`, `current_period_end`, `provider='stripe'`, `provider_subscription_id`, com credenciais de servidor;
- idempotente por `event.id` — o mesmo evento repetido não duplica nada.

Função `create-checkout`: valida o utilizador autenticado, cria a sessão de Checkout para o preço escolhido com `user_id` nos metadados e devolve o URL.

Função `customer-portal`: gera o link do portal do cliente Stripe para o utilizador autenticado.

### 3. Frontend — checkout
- `UpgradeProDialog`: substituir o botão "Em breve" por dois planos (mensal e anual, com a poupança do anual destacada) que chamam `create-checkout` e redirecionam para o Stripe Checkout. Ao regressar, mostrar estado "a ativar" e refrescar o estado Pro.
- `usePro`: refrescar em tempo real quando a subscrição muda, para o UI atualizar sem reload.
- Definições: botão "Gerir subscrição" que abre o portal do cliente Stripe.

### 4. Selos e destaque
- Novo componente `ProBadge` reutilizável.
- Selo Pro em `PublicProfile`, `ProfilePanel` e `MusicianCard`.
- `MusiciansList`: perfis Pro primeiro na ordenação, antes de compatibilidade e rating.
- `MapComponent`: carregar `pro_until` com os perfis e dar prioridade visual aos pins Pro (marcador destacado e prioridade no ícone representativo do cluster).

### 5. Testes em modo teste
Fluxo completo com cartão de teste: checkout mensal → webhook → linha em `subscriptions` → `pro_until` preenchido → selo, destaque e limites Pro ativos → cancelamento pelo portal → regresso a Free. Só depois se discute passar a live.

## Notas técnicas

- Nomes: funções `stripe-webhook`, `create-checkout`, `customer-portal`; coluna `profiles.pro_until`; trigger `sync_pro_until`.
- O webhook não verifica JWT (é chamado pelo Stripe) e valida a assinatura em código; `create-checkout` e `customer-portal` exigem utilizador autenticado.
- Nenhum valor de preço fica hardcoded na lógica — o código refere apenas identificadores de preço; os montantes mudam no painel Stripe.
- Confirmação tua no fim de cada etapa antes de avançar.
