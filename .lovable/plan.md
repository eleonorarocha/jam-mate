# Mapbox: token no servidor, sem localStorage

## Diagnóstico (confirmado)

1. **Não existia nenhum token Mapbox no projeto** — nem nos secrets do backend (só LOVABLE_API_KEY, RESEND_API_KEY, Stripe sandbox e os do Cloud), nem no `.env`, nem como conector. Já forneceste o token público novo.
2. **Um token `pk.*` é feito para viver no frontend.** O Mapbox GL JS precisa dele no browser; não há forma de o esconder. A proteção correta são as **URL restrictions** (que já configuraste) + scopes públicos. Uma Edge Function a devolver o token não acrescenta segurança nenhuma; tokens temporários exigiriam um `sk.*` no servidor — complexidade desproporcionada aqui.

**Abordagem escolhida:** token público único, restrito por domínio, injetado como variável de ambiente. Sem UI, sem localStorage.

## Implementação

- **Variável de ambiente**: `VITE_MAPBOX_PUBLIC_TOKEN` com o token fornecido (declarada em `src/vite-env.d.ts` para tipagem).
- **`src/lib/mapbox.ts`** (novo): exporta `MAPBOX_TOKEN` e `hasMapboxToken`.
- **`MapComponent.tsx`**: usa `MAPBOX_TOKEN` diretamente; a prop `token` deixa de ser necessária.
- **`Index.tsx` e `Map.tsx`**: remover `MapboxTokenForm`, o estado `tokenSaved` e a leitura do localStorage. Se `hasMapboxToken` for falso, mostrar apenas uma mensagem discreta de "mapa indisponível" no lugar do mapa (o resto da página continua a funcionar).
- **`SearchBar.tsx`**: geocoding passa a usar `MAPBOX_TOKEN`.
- **`Settings.tsx`**: remover a secção do token Mapbox (estado, campo, guardar, limpar).
- **Apagar** `src/components/landing/MapboxTokenForm.tsx`.
- **Limpeza única** no arranque (`src/main.tsx`): `localStorage.removeItem('mapbox_token')`.
- **i18n PT/EN/ES/FR**: não existem chaves do formulário de token (era texto fixo em PT), por isso só se adiciona `map.unavailable`.

## Verificação

- Carregar `/` e `/map` sem qualquer token em localStorage e confirmar que o mapa aparece sem pedir nada ao utilizador (validação por browser automatizado com screenshot).
- Confirmar que `mapbox_token` já não aparece em nenhum ponto do código.
- Reportar o hash do commit no fim.

## Notas

- O token fica visível no bundle — normal e aceitável para `pk.*`; a segurança vem das URL restrictions.
- Sem alterações à base de dados nem a Edge Functions.
