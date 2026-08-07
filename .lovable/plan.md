# Etapa 4 — Selo Pro e destaque visual no mapa

Tornar o estatuto Pro visível em toda a app: um selo consistente nos perfis e cartões, prioridade na lista de músicos e pins destacados no mapa.

## O que vai ser feito

### 1. Componente `ProBadge` (novo)
Selo reutilizável com ícone de estrela/faísca e a palavra "Pro", em três tamanhos (`sm`, `md`, `lg`) e duas variantes (com texto / só ícone, para espaços apertados como o pin do mapa). Cores vindas dos tokens do design system (dourado/primário), sem cores fixas. Tooltip: "Membro JamMate Pro".

### 2. Selo nos perfis e cartões
- **PublicProfile**: selo ao lado do nome, no cabeçalho do perfil.
- **ProfilePanel** (o meu perfil): selo ao lado do nome quando a subscrição está ativa, usando o hook `usePro` já existente.
- **MusicianCard**: selo pequeno junto ao nome no cartão da lista.
- **MusicianPopup**: selo junto ao nome (coerência com o cartão).

Em todos os casos, "é Pro" = `pro_until` no futuro. O campo já existe em `profiles` e é preenchido automaticamente pelo trigger a partir das subscrições.

### 3. Ordenação na `MusiciansList`
Nova ordem: **Pro primeiro**, depois compatibilidade (match de instrumento/nível), depois avaliação média. A lógica atual de compatibilidade e rating mantém-se intacta, apenas ganha um critério à frente.

### 4. Destaque no mapa
- Carregar `pro_until` junto com os restantes campos dos perfis (nos dois caminhos: utilizador autenticado e visitante).
- **Pin Pro**: contorno dourado, sombra mais forte, ligeiramente maior e com o selo em ícone no canto — visualmente acima dos pins normais (z-index superior), sem quebrar o destaque verde de "match compatível" nem o coração de favorito.
- **Cluster**: quando um agrupamento contém pelo menos um perfil Pro, o círculo ganha o anel dourado e um pequeno indicador, para dar pistas de que há perfis destacados naquela zona.

### Nota técnica de backend
A vista `public_profiles` (usada para visitantes não autenticados) ainda não expõe `pro_until`. É preciso uma migração para acrescentar essa coluna à vista, para que o destaque Pro também apareça no mapa público. O campo é apenas uma data de fim de subscrição — não é informação sensível.

## Detalhes técnicos

- Ficheiro novo: `src/components/ProBadge.tsx` (com helper `isProUntil(date)` partilhado).
- `MapComponent.tsx`: acrescentar `pro_until` aos dois `select`, ao `interface Musician`, e ramificar em `buildMusicianMarker` / `buildClusterMarker`; o supercluster passa a agregar uma propriedade `hasPro` por cluster.
- `MusiciansList.tsx`: comparador de ordenação com `proRank` como primeiro critério.
- Migração: `CREATE OR REPLACE VIEW public.public_profiles` incluindo `pro_until` (mantendo as restantes colunas e o `security_invoker` atual).
- Sem alterações ao fluxo de pagamentos; continua tudo em sandbox.

Commit único no fim, com hash reportado.
