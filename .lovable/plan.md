# Mapbox: token no servidor, sem localStorage

## Diagnóstico (verificado agora)

1. **Não existe nenhum token Mapbox no projeto.** Os secrets do backend são apenas: LOVABLE_API_KEY, PAYMENTS_SANDBOX_WEBHOOK_SECRET, RESEND_API_KEY, STRIPE_SANDBOX_API_KEY e os do próprio Cloud. O `.env` só tem as três variáveis do backend. Não há conector Mapbox ligado (só GitHub e Stripe sandbox na workspace). **Vais ter de criar um token na tua conta Mapbox.**

2. **Hoje o token é 100% do utilizador final.** `MapboxTokenForm` pede o token, grava em `localStorage['mapbox_token']`, e é lido em `Index.tsx`, `Map.tsx`, `SearchBar.tsx` (geocoding) e `Settings.tsx`. Ou seja, cada visitante tem de ter conta Mapbox — inviável em produção.

3. **Um token público `pk.*` é feito para ser exposto no frontend.** É o modelo oficial da Mapbox: o GL JS precisa do token no browser, não há forma de o esconder. A proteção correta são as **URL restrictions** (allowlist de domínios) no token, mais scopes mínimos (`styles:read`, `fonts:read`, `datasets:read` se preciso). Uma Edge Function que devolvesse o token não acrescenta segurança nenhuma (fica igualmente na rede/DevTools); tokens temporários exigiriam um token secreto `sk.*` no servidor a criar tokens de curta duração — complexidade alta, benefício marginal para este caso.

**Abordagem recomendada:** um único token público `pk.*` restrito por domínio, injetado em build time como variável de ambiente, sem UI e sem localStorage.

## O que preciso de ti

Criar em account.mapbox.com um token público novo com:
- Scopes: apenas os públicos por defeito (`styles:read`, `fonts:read`, `styles:tiles`).
- URL restrictions: o domínio publicado do JamMate + `*.lovable.app` (para o preview).

Depois adiciono-o como secret/variável `VITE_MAPBOX_PUBLIC_TOKEN`.

## Implementação (depois de aprovares e teres o token)

- `src/lib/mapbox.ts` novo: lê `import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN`, exporta `MAPBOX_TOKEN` e um `hasMapboxToken`.
- `MapComponent.tsx`: `mapboxgl.accessToken = MAPBOX_TOKEN` diretamente; deixa de receber/procurar token do utilizador.
- `Index.tsx` e `Map.tsx`: remover o gate `MapboxTokenForm` e o estado `tokenSaved`; se o token não estiver configurado, mostrar uma mensagem discreta de "mapa indisponível" em vez de pedir token.
- `SearchBar.tsx`: geocoding passa a usar `MAPBOX_TOKEN`.
- `Settings.tsx`: remover a secção de token Mapbox (campo, guardar, limpar).
- Apagar `src/components/landing/MapboxTokenForm.tsx`.
- Limpeza única: no arranque da app, `localStorage.removeItem('mapbox_token')` para não deixar tokens antigos de utilizadores.
- Traduções PT/EN/ES/FR: remover chaves do formulário de token, adicionar a mensagem de mapa indisponível.

## Notas técnicas

- O token fica visível no bundle — é esperado e aceitável para `pk.*`; a segurança vem das URL restrictions, que impedem uso fora dos teus domínios.
- Nenhuma alteração à base de dados nem a Edge Functions.
- Se um dia quiseres tokens temporários, isso implica um `sk.*` no servidor e uma Edge Function com a Tokens API — fica fora deste âmbito.
