# Pagamentos reais no tier Pro com Paddle

Objetivo: ligar o tier Pro a subscrições reais (mensal + anual) via Paddle, em ambiente de teste (sandbox), sem publicar nada em produção.

## Decisão importante antes de começar

O Lovable tem uma integração Paddle nativa. Ao ativá-la:
- não é preciso criar conta Paddle manualmente — é criada uma conta em modo teste no momento da ativação;
- as chaves e o segredo de assinatura do webhook ficam guardados automaticamente;
- os produtos/preços são criados por ferramenta, e o preço pode depois ser ajustado no painel Paddle sem tocar no código.

Recomendo este caminho em vez de conta manual + chaves coladas à mão. O resto do plano assume-o.

## Verificações já feitas no código atual

- Snippets: limites Free 1/30s e Pro 5/60s continuam corretos, aplicados no cliente (`usePro`) e reforçados por trigger na base de dados (`enforce_snippet_limits` + `is_pro`). Nada a mudar.
- Vantagens Pro: três — snippets (já existente), destaque no mapa, selo Pro. Não há limites de reservas para ninguém.
- Escrita em `subscriptions`: as regras de acesso atuais já bloqueiam qualquer criação/alteração pelo cliente; só o utilizador consegue ler a sua própria linha. Mantém-se assim — só a função de servidor escreve.
- Estado Pro de *outros* utilizadores não é legível pelo cliente hoje, por isso o destaque no mapa precisa de um campo público novo (ver abaixo).

## Etapas

### 1. Ativar Paddle (modo teste)
Ativar a integração e criar dois produtos com preços placeholder:
- JamMate Pro — Mensal: 4,99 €/mês
- JamMate Pro — Anual: 39,99 €/ano

### 2. Base de dados
Uma migração com:
- `profiles.pro_until timestamptz` — campo público de leitura, usado para o selo e o destaque no mapa (evita expor a tabela de subscrições).
- Índice para ordenar por Pro no mapa.
- Trigger em `subscriptions` que sincroniza `profiles.pro_until` sempre que a subscrição muda.

### 3. Backend — webhook
Edge function `paddle-webhook`:
- valida a assinatura do webhook antes de processar (rejeita 401 se falhar);
- trata `subscription.created`, `subscription.updated`, `subscription.canceled`, `transaction.completed`;
- identifica o utilizador pelo `custom_data.user_id` enviado no checkout;
- faz upsert em `subscriptions` com `tier`, `status`, `current_period_end`, `provider='paddle'`, `provider_subscription_id`, usando credenciais de servidor;
- é idempotente (o mesmo evento repetido não duplica nada).

Segunda função `create-checkout` apenas se o checkout overlay precisar de token gerado no servidor; caso contrário o checkout é aberto diretamente no cliente com o preço e `custom_data`.

### 4. Frontend
- `UpgradeProDialog`: substituir o botão "Em breve" por dois planos (mensal/anual, com poupança destacada no anual) que abrem o Paddle Checkout overlay com `custom_data.user_id`. Após sucesso, mostrar estado "a ativar" e refrescar o estado Pro.
- `usePro`: passar a refrescar em tempo real quando a subscrição muda, para o UI atualizar sem reload.
- Novo componente `ProBadge` reutilizável.
- `PublicProfile` e `ProfilePanel`: mostrar o selo Pro.
- `MusicianCard`: selo Pro no cartão.
- `MusiciansList`: perfis Pro primeiro na ordenação (antes de compatibilidade e rating).
- `MapComponent`: incluir `pro_until` no carregamento de perfis e dar prioridade visual aos pins Pro (marcador destacado e prioridade no ícone representativo do cluster).
- Página de definições: link "Gerir subscrição" para o portal do cliente Paddle.

### 5. Testes
Percorrer o fluxo completo em modo teste com cartão de teste: checkout mensal → webhook → linha em `subscriptions` → `pro_until` preenchido → selo e limites Pro ativos → cancelamento → regresso a Free. Só depois disso se fala em passar a live.

## Notas técnicas

- Nomes: função `paddle-webhook`; coluna `profiles.pro_until`; trigger `sync_pro_until`.
- O webhook corre sem verificação de JWT (é chamado pelo Paddle) e valida a assinatura em código.
- Nenhum preço fica hardcoded na lógica de negócio — o código refere apenas os identificadores de preço; os valores mudam no painel Paddle.
- Nada é publicado; tudo permanece em ambiente de teste.
