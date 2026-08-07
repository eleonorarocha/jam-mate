# Correção da secção de Notificações no PROJECT_CONTEXT.md

## Verificação feita

A correção pedida **não está aplicada**. Estado atual verificado no ficheiro e no histórico:

1. Linha 242-243 (secção "3. Funcionalidades já implementadas") continua a dizer:
   "**Notificações** — *funcional*: ... e toggle de push (`usePushNotifications` + service worker)."
2. Linha 448 (secção "Current State" → Concluído) continua a dizer:
   "Mensagens, notificações (in-app, som, push) e emails transacionais."
3. Não existe nenhum commit com esta alteração. Os últimos commits são
   `137f899 Publicou README e contexto`, `33b3e6d Changes`, `4dd228d Changes` —
   todos anteriores ao pedido e sem tocar neste texto.
4. Como não há commit, nada foi sincronizado para o GitHub relativo a esta correção.

Facto confirmado que sustenta a correção: `public/` contém apenas
`favicon.ico`, `jammate-og.jpg.asset.json`, `llms.txt`, `placeholder.svg`,
`robots.txt`, `sitemap.xml` — **não existe service worker**. O hook
`usePushNotifications` usa a API `Notification` do browser com listener Realtime,
ou seja só funciona com a aplicação aberta.

## O que fazer

Editar apenas `PROJECT_CONTEXT.md` (sem tocar em código):

- Substituir a linha de Notificações da secção 3 por uma versão marcada como
  *parcial*, explicando que o "push" não é push real (sem Web Push nem
  subscrição de servidor), que não existe service worker em `public/`, e que os
  avisos só aparecem com a app aberta.
- Substituir a linha da secção "Current State" → "Concluído" por
  "notificações (in-app, som; 'push' é apenas em contexto ativo, não em background)".

Depois da edição, confirmar o hash e a mensagem do commit gerado e reportar o
estado do sync (o push para o GitHub é feito server-side pelo Lovable; este
ambiente só vê o remote interno).
