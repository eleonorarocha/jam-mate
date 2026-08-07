# JamMate — Documento de Contexto do Projeto

> Briefing técnico completo para um agente de IA ou programador que nunca viu este projeto.
> Escrito a partir do estado real do código e do esquema de base de dados. Onde não foi possível
> confirmar algo, está explicitamente marcado como **não identificado**.

Última atualização: 2026-08-07

---

## 1. Visão geral

### O que é o JamMate

O JamMate é uma aplicação web que funciona como um **"Airbnb para músicos"**: um mapa interativo
onde músicos descobrem outros músicos perto de si e agendam **jam sessions presenciais**.

### Problema que resolve

Encontrar pessoas com quem tocar é difícil fora de círculos já estabelecidos. Não existe uma forma
simples de saber quem toca o quê, com que nível, em que zona, e de combinar uma sessão com
confiança mútua. O JamMate resolve isto com descoberta geográfica, perfis com contexto musical,
agendamento estruturado e avaliações após a sessão.

### Visão geral do produto

1. O utilizador abre o mapa e vê músicos agrupados por zona (clusters).
2. Filtra por instrumento, nível, distância, cidade e disponibilidade.
3. Abre um perfil, ouve um excerto de música, vê fotos e avaliações.
4. Envia mensagem ou faz um pedido de reserva com data/hora.
5. O músico aceita, recusa ou reagenda; ambos recebem notificação e email.
6. Depois da sessão, ambos avaliam em quatro critérios.

### Utilizadores previstos

- Músicos amadores e intermédios que procuram companhia para tocar.
- Músicos avançados/profissionais que procuram parceiros para ensaio ou colaboração.
- Novos residentes numa cidade que querem entrar numa cena musical local.

### Proposta de valor

- Descoberta geográfica visual, imediata e sem fricção (não é preciso conta para explorar o mapa).
- Privacidade por omissão: localização aproximada e PII escondida até haver reserva confirmada.
- Fluxo de agendamento completo, com histórico auditável, fusos horários e exportação para calendário.
- Confiança construída por avaliações multi-critério e bloqueio de utilizadores.

### Maturidade atual

**MVP funcional em desenvolvimento ativo.** A maioria dos fluxos principais (descoberta, perfis,
mensagens, reservas, avaliações, notificações) está implementada e ligada a uma base de dados real
com RLS. Não está publicado em produção. A monetização existe apenas como *scaffolding* — não há
processador de pagamentos ligado.

---

## 2. Arquitetura atual

### Estrutura geral

Aplicação **single-page (SPA)** React servida pelo Vite. Não há servidor aplicacional próprio: o
frontend fala diretamente com o backend gerido (Supabase, provisionado através do Lovable Cloud) via
o cliente JavaScript oficial. A segurança dos dados vive na base de dados, em políticas
**Row Level Security (RLS)**, não na camada de UI.

```text
 ┌──────────────────────────── Browser (SPA React) ───────────────────────────┐
 │  react-router-dom  ·  TanStack Query  ·  i18next  ·  Tailwind + shadcn/ui   │
 │                                                                            │
 │   Mapbox GL JS ── Supercluster (clustering client-side dos marcadores)      │
 └──────┬───────────────────────────────────────────────┬─────────[...]
        │ supabase-js (anon key + JWT do utilizador)     │ supabase.functions.invoke
        ▼                                                ▼
 ┌────────────────────────────────┐          ┌──────────────────────────��[...]
 │ Postgres + RLS                 │          │ Edge Functions (Deno)        │
 │  · tabelas public.*            │          │  send-booking-notification   │
 │  · funções SECURITY DEFINER    │          │  send-booking-accepted       │
 │  · triggers de regras negócio  │          │  send-booking-rejected       │
 ├────────────────────────────────┤          │  send-booking-reminders      │
 │ Auth (email/password)          │          │  send-feedback-notification  │
 │ Storage (avatars, jam-media,   │          └──────────────┬───────────────┘
 │          music-snippets)       │                         │ RESEND_API_KEY
 │ Realtime (bookings, messages,  │                         ▼
 │           notifications)       │                      Resend (email)
 └────────────────────────────────┘
```

### Tecnologias

**Frontend**
| Área | Tecnologia |
|---|---|
| Framework | React 18.3 |
| Build | Vite 5.4 + `@vitejs/plugin-react-swc` |
| Linguagem | TypeScript 5.8 |
| Estilo | Tailwind CSS 3.4 + `tailwindcss-animate` + `@tailwindcss/typography` |
| Componentes | shadcn/ui sobre Radix UI (48 primitivos em `src/components/ui`) |
| Routing | react-router-dom 6.30 |
| Dados/cache | TanStack Query 5 (instanciado em `App.tsx`; a maioria dos ecrãs usa `useEffect` + supabase-js diretamente) |
| Formulários | react-hook-form + zod + `@hookform/resolvers` |
| Mapa | mapbox-gl 3.16, `@mapbox/mapbox-gl-geocoder`, supercluster 8 (`react-map-gl` está instalado mas o `MapComponent` usa a API imperativa do mapbox-gl) |
| i18n | i18next 26 + react-i18next + `i18next-browser-languagedetector` (PT, EN, ES, FR) |
| Tema | next-themes (claro/escuro, classe `dark`) |
| Datas | date-fns 3 + `Intl.DateTimeFormat` para fusos |
| Gráficos | recharts (painel de administração) |
| Animação | framer-motion |
| Notificações UI | sonner + toaster shadcn |
| Ícones | lucide-react |

**Backend (Lovable Cloud / Supabase)**
- Postgres com RLS ativo em todas as tabelas `public`.
- Auth por email/password (proteção contra passwords comprometidas ativada).
- Storage: `avatars` (público), `jam-media` (público), `music-snippets` (privado).
- Realtime para reservas, mensagens e notificações.
- Edge Functions em Deno para envio de email transacional via Resend.
- Tarefas agendadas (pg_cron + pg_net) para lembretes de reserva.

**Testes e qualidade**
- Vitest + Testing Library + jsdom (`src/components/PhotoLightbox.test.tsx`, `src/lib/profileLanguage.test.ts`).
- jest-axe para acessibilidade.
- Playwright para E2E (`e2e/lightbox.spec.ts`).
- ESLint 9 + typescript-eslint.
- Plugin Vite `map-i18n-audit`: falha o build de produção se faltarem chaves i18n do mapa nos quatro idiomas.
- Workflow GitHub `phone-privacy-test.yml` que corre `supabase/tests/phone_privacy_test.sql`.

### Organização dos ficheiros

```text
src/
  App.tsx                    Providers (Query, Theme, Tooltip) + tabela de rotas
  main.tsx                   Bootstrap React + import do i18n
  index.css                  Design system: tokens HSL, tema claro/escuro
  pages/                     17 páginas (uma por rota)
  components/
    ui/                      48 primitivos shadcn/ui (não editar sem motivo)
    landing/                 Hero, Features, Community, CTA, MapPreview, MapboxTokenForm
    *.tsx                    ~40 componentes de domínio
  hooks/                     14 hooks (auth, favoritos, bloqueios, notificações, pro, fuso...)
  lib/                       ics.ts (export .ics), csv-export.ts, profileLanguage.ts, utils.ts
  i18n/                      index.ts + locales/{pt,en,es,fr}.json
  integrations/supabase/     client.ts e types.ts — AUTO-GERADOS, nunca editar
  test/setup.ts              Setup do Vitest
supabase/
  functions/                 5 Edge Functions (Deno)
  tests/phone_privacy_test.sql
  config.toml                Auto-gerado
scripts/
  generate-sitemap.ts        Corre em predev/prebuild
  audit-map-i18n.mjs         Auditoria de chaves i18n do mapa
e2e/lightbox.spec.ts
public/                      robots.txt, sitemap.xml, llms.txt, og image
```

Dimensão total de `src/pages` + `src/components`: ~12 400 linhas de TSX.

### Como as partes comunicam

- **UI → Base de dados**: `import { supabase } from "@/integrations/supabase/client"`. Todas as
  leituras/escritas passam por RLS com o JWT do utilizador. Não existe camada de API intermédia.
- **UI → Email**: `supabase.functions.invoke('send-booking-*')` a partir dos fluxos de reserva.
- **Base de dados → UI**: canais Realtime do Supabase, subscritos em `useRealtimeNotifications`,
  `MessagesPanel` e `CalendarPanel`.
- **Agendado → Email**: pg_cron chama, via pg_net, a função `send-booking-reminders`.
- **Estado global**: mínimo e deliberado. `useAuth` reexecuta `getSession`/`onAuthStateChange` por
  consumidor; `useUserTimeZone` usa um cache de módulo com listeners; filtros do mapa e estado da
  sidebar persistem em `localStorage`.

### Decisões técnicas importantes já tomadas

1. **Segurança na base de dados, não na UI.** Toda a tabela `public` tem RLS. Lógica sensível vive
   em funções `SECURITY DEFINER` (`has_role`, `is_pro`, `can_view_sensitive_profile`, ...).
2. **Papéis em tabela separada** (`user_roles` + `has_role()`), nunca no perfil — evita escalada de
   privilégios.
3. **Privacidade da localização por design**: um trigger escreve `approx_latitude`/`approx_longitude`
   arredondados a 2 casas decimais (~1,1 km); o mapa público usa apenas essas colunas.
4. **PII condicional**: telefone, apelido e coordenadas exatas só através de
   `get_profile_sensitive()`, que exige reserva aceite ou concluída entre as partes.
5. **Clustering client-side** com Supercluster em vez de camadas de cluster do Mapbox — dá controlo
   total sobre o visual estilo Airbnb e sobre o `fitBounds` com padding para a lista à esquerda.
6. **Token do Mapbox introduzido pelo utilizador** e guardado em `localStorage`
   (`MapboxTokenForm`) — decisão de desenvolvimento, ver Limitações.
7. **Regras de negócio impostas por triggers**, não pelo cliente (transições de estado de reservas,
   limites de snippets, média de avaliações).
8. **Tokens de design semânticos** em `index.css`; componentes não usam cores literais.
9. **i18n obrigatório** nas quatro línguas para as chaves do mapa, verificado no build.

---

## 3. Funcionalidades já implementadas

### Páginas (rotas em `src/App.tsx`)

| Rota | Ficheiro | Estado |
|---|---|---|
| `/` | `pages/Index.tsx` | Funcional — mapa + sidebar de filtros + barra de pesquisa; redireciona para onboarding se incompleto |
| `/auth` | `pages/Auth.tsx` | Funcional — registo/login email+password |
| `/onboarding` | `pages/Onboarding.tsx` | Funcional — recolha de perfil inicial |
| `/reset-password` | `pages/ResetPassword.tsx` | Funcional |
| `/map` | `pages/Map.tsx` | Funcional — mapa completo com filtros avançados |
| `/profile` | `pages/Profile.tsx` | Funcional — perfil próprio (ProfilePanel) |
| `/profile/:id` | `pages/PublicProfile.tsx` | Funcional — perfil público, fotos com lightbox, snippet, avaliações, estados de loading e 404 |
| `/messages` | `pages/Messages.tsx` | Funcional — chat em tempo real |
| `/calendar` | `pages/CalendarPage.tsx` | Funcional — reservas, tooltips de fuso, cópia de data/hora, export .ics |
| `/ratings` | `pages/Ratings.tsx` | Funcional |
| `/settings` | `pages/Settings.tsx` | Funcional — preferências, notificações, bloqueios |
| `/gallery` | `pages/Gallery.tsx` | Funcional — separadores "Meus ficheiros" / "Galeria pública" com filtros por tipo |
| `/favorites` | `pages/Favorites.tsx` | Funcional |
| `/about` | `pages/About.tsx` | Funcional — informação, estatísticas, formulário de feedback, FAQ com JSON-LD |
| `/admin` | `pages/Admin.tsx` | Funcional — protegido por `useAdmin`/`has_role` |
| `/dev/lightbox-demo` | `pages/LightboxDemo.tsx` | Só em DEV — banco de ensaio para testes de acessibilidade |
| `*` | `pages/NotFound.tsx` | Funcional |

### Funcionalidades por área

**Descoberta e mapa** — *funcional*
- Mapa Mapbox com clustering Supercluster estilo Airbnb (bolhas com contagem).
- Clique num cluster faz zoom com `fitBounds` e padding que compensa a lista à esquerda.
- Popup nativo por marcador com zona aproximada, instrumento, nível e avaliação global, e botões
  para abrir perfil, enviar mensagem e agendar.
- Filtros: instrumento, nível, distância máxima, cidade, data de disponibilidade, só favoritos.
  Filtros e estado da sidebar persistem em `localStorage`.
- Utilizadores não autenticados podem explorar o mapa; ações de contacto exigem sessão.
- O filtro por género foi **removido deliberadamente** da pesquisa (o campo continua no perfil).

**Perfis** — *funcional*
- Perfil próprio: dados, avatar com recorte (`AvatarCropper`), bio, instrumento, nível, localização,
  preferências de parceiro, idioma, fuso horário.
- Perfil público: sobre mim, fotos com lightbox (zoom, pan, teclado, foco gerido), excerto musical,
  avaliações, botões de contacto/reserva/favorito/bloqueio.

**Reservas** — *funcional*
- Diálogo de agendamento em três passos (formulário → revisão → enviado).
- Slots já ocupados bloqueados via `get_musician_busy_slots()`.
- Aceitar, recusar (com motivo), cancelar (com motivo), reagendar.
- Histórico de eventos com timestamps (`BookingHistory`), tooltips com data/hora completa nos dois
  fusos e offsets GMT, e botão de cópia.
- Exportação de cada evento para `.ics` (RFC 5545, `src/lib/ics.ts`).
- Atualizações em tempo real para ambas as partes.

**Mensagens** — *funcional*: chat em tempo real, indicador de escrita, recibos de leitura, contagem
de não lidas.

**Notificações** — *parcial*: centro de notificações com histórico, notificações em tempo real,
som e preferências estão funcionais. O "push" (`usePushNotifications`) **não é push real**: usa
apenas a API `Notification` do browser em conjunto com um listener Realtime, sem Web Push nem
subscrição no servidor. **Não existe service worker em `public/`**, pelo que os avisos só aparecem
com a aplicação aberta, nunca em background.

**Email transacional** — *funcional*: pedido, aceitação, recusa, lembrete agendado e aviso de
feedback, via Resend.

**Avaliações** — *funcional*: 1–5 estrelas em quatro critérios (localização, respeito, pontualidade,
diversão) só após reserva concluída; média recalculada por trigger.

**Favoritos e bloqueios** — *funcional*.

**Galeria** — *funcional*: upload de fotos/vídeos/áudio, separação entre ficheiros próprios e
galeria pública, filtros por tipo.

**Excertos musicais (Music Snippets)** — *funcional com gating*: upload de áudio para o bucket
privado, limites impostos por trigger (Free: 1 snippet / 30 s; Pro: 5 / 60 s).

**Subscrição Pro** — *parcial / scaffolding*: existe a tabela `subscriptions`, a função `is_pro()`,
o hook `usePro` e o diálogo `UpgradeProDialog`, e o gating funciona. **Não existe integração de
pagamentos**: nenhuma linha de `subscriptions` pode ser criada pelo cliente (sem políticas de
INSERT/UPDATE), pelo que o estado Pro só pode ser atribuído manualmente no backend.

**Administração** — *funcional*: estatísticas (`AdminStats`), gestão de utilizadores
(`AdminUsers`), moderação de feedback, exportação CSV.

**SEO** — *funcional*: títulos/descrições/canonical por rota (`RouteTitle`), Open Graph e Twitter
cards, JSON-LD (WebSite, Organization, FAQPage, Person), `sitemap.xml` gerado em build,
`robots.txt`, `llms.txt`.

### Protótipos e placeholders

- `pages/LightboxDemo.tsx` — apenas ambiente de teste, montado só em DEV.
- Componentes de landing (`src/components/landing/`) existem, mas a rota `/` mostra o mapa; o único
  usado no fluxo atual é `MapboxTokenForm`. **Estado das restantes secções de landing: não usadas na
  navegação atual.**
- ~20 perfis de músicos fictícios foram inseridos na base de dados para avaliação visual do mapa.

---

## 4. Base de dados e modelos de informação

Todas as tabelas vivem no esquema `public`, com RLS ativo.

### Tabelas

| Tabela | Papel | Notas-chave |
|---|---|---|
| `profiles` | Perfil do músico (PK = `auth.users.id`) | `username`, `instrument`, `skill_level`, `bio`, `avatar_url`, `city`/`country`, `latitude`/`longitude` (privadas) e `approx_latitude`/`ap[...]
| `bookings` | Pedido/reserva de jam session | `requester_id`, `musician_id`, `status`, `scheduled_date`, `duration_hours`, `message`, `cancellation_reason`, `reminder_sent` |
| `booking_events` | Timeline auditável das reservas | Escrito só por trigger; sem INSERT/UPDATE/DELETE pelo cliente |
| `messages` | Chat 1-para-1 | Opcionalmente ligado a `booking_id`; `read` |
| `notifications` | Centro de notificações | INSERT só por `service_role` |
| `ratings` | Avaliação pós-sessão | 4 sub-notas + nota global; imutável (sem UPDATE/DELETE) |
| `favorites` | Músicos guardados | |
| `blocked_users` | Bloqueios | Usado para esconder do mapa e das mensagens |
| `jam_media` | Galeria de fotos/vídeos/áudio | `is_public` controla a visibilidade |
| `music_snippets` | Excertos de áudio do perfil | `duration_seconds`, `storage_path`; leitura pública |
| `subscriptions` | Estado Free/Pro | Só leitura pelo próprio; escrita apenas no servidor |
| `user_roles` | Papéis (`admin`, `moderator`, `user`) | Base do `has_role()` |
| `feedback` | Feedback dos utilizadores | Visível ao autor e a administradores |

### Enums

`app_role` (admin, moderator, user) · `booking_status` (pending, accepted, rejected, completed,
cancelled) · `gender_type` (male, female) · `skill_level` (beginner, intermediate, advanced,
professional) · `subscription_status` (active, cancelled, expired) · `subscription_tier` (free, pro).

### Relações principais

```text
auth.users ──1:1── profiles ──┬──< bookings (requester_id, musician_id)
                              ├──< messages (sender_id, receiver_id)
                              ├──< ratings  (rater_id, rated_user_id)
                              └──< favorites / blocked_users
bookings ──┬──< booking_events
           ├──< ratings
           ├──< messages
           ├──< notifications
           └──< jam_media
auth.users ──< user_roles / subscriptions / music_snippets / feedback
```

### Funções (SECURITY DEFINER salvo indicação)

| Função | Papel |
|---|---|
| `has_role(uuid, app_role)` | Verificação de papel sem recursão de RLS |
| `is_pro(uuid)` | Subscrição pro ativa e dentro do período |
| `can_view_sensitive_profile(viewer, profile)` | Só o próprio, ou quem tem reserva aceite/concluída |
| `get_profile_sensitive(profile)` | Devolve telefone, apelido, coordenadas exatas e flags de verificação, sujeito à função acima |
| `has_accepted_booking_with(a, b)` | Existe reserva aceite entre dois utilizadores |
| `has_block_between(a, b)` / `is_blocked(a, b)` | Bloqueios |
| `get_musician_busy_slots(musician)` | Slots pending/accepted para bloquear o agendamento |

### Triggers e regras de negócio

- `validate_booking_update` — só o músico aceita, recusa ou conclui; cancelamento apenas a partir de
  `pending`/`accepted`; estados finais (`completed`, `rejected`, `cancelled`) são imutáveis.
- `log_booking_event` — escreve automaticamente a timeline em `booking_events`.
- `enforce_snippet_limits` — Free: 1 snippet até 30 s; Pro: 5 snippets até 60 s.
- `update_approx_coordinates` — arredonda coordenadas a 2 casas decimais em INSERT/UPDATE.
- `update_average_rating` — recalcula `average_rating` e `total_ratings` no perfil avaliado.
- `normalize_profile_language` — valida e normaliza o idioma para `pt|en|es|fr`.
- `update_updated_at_column` — mantém `updated_at`.

- Cron job `send-booking-reminders` está activo na base de dados (jobid 1, agendamento `*/5 * * * *`) e
  invoca a função via `net.http_post` com header `Authorization: Bearer <anon key>`. Este job foi criado
  diretamente na base de dados **fora** dos ficheiros de migração em `supabase/migrations/` — a
  migração `20260309045448` apenas activa as extensões `pg_cron` e `pg_net`, não cria o job em si.
  Consequência: se a base de dados for recriada, clonada ou remixada sem recriar explicitamente este
  job, os lembretes de booking deixam de ser enviados sem erro visível.

### Regras de privacidade impostas por RLS

- Perfis só são legíveis por utilizadores autenticados e apenas com `onboarding_completed = true`;
  colunas sensíveis exigem `can_view_sensitive_profile`.
- Reservas, mensagens e notificações são visíveis apenas às partes envolvidas (e a administradores,
  no caso das reservas).
- `booking_events` é só de leitura para as partes.

---

## 5. Design e experiência de utilização

### Identidade visual

Design system próprio definido em `src/index.css`, comentado como *"JamMate Design System — Purple &
Gold, Musical & Premium"*. Na prática, a paleta atual está centrada num **verde-lima vibrante**
(`--primary: 82 89% 50%`) sobre neutros quase-brancos no tema claro e quase-pretos no escuro, com
gradientes e sombras próprios (`--gradient-primary`, `--gradient-gold`, `--shadow-primary`). O raio
base é `0.75rem`. O comentário do ficheiro está desatualizado face aos valores reais.

Logótipo: ícone `Music` em círculo com gradiente, com o wordmark "JamMate" em texto com gradiente.

### Princípios de UI/UX

- **Tokens semânticos obrigatórios**: componentes usam `bg-background`, `text-foreground`,
  `text-primary`, etc. Cores literais (`text-white`, `bg-[#...]`) são proibidas — quebram o tema escuro.
- **Tema claro/escuro** por classe, com `ThemeToggle` no header.
- **Multilíngue** em toda a interface (PT/EN/ES/FR), com `LanguageSwitcher` e persistência do idioma
  no perfil.
- **Progressive disclosure**: qualquer pessoa explora o mapa; o pedido de sessão exige conta.
- **Acessibilidade**: o lightbox tem gestão de foco, navegação por teclado (Esc, setas, +/−, 0) e
  0 violações axe-core; estados de loading e 404 com texto acessível.

### Padrões de interface

- **Mapa + sidebar estilo Airbnb**: lista de resultados à esquerda, mapa à direita, filtros
  colapsáveis, contagem de resultados visíveis.
- **Diálogos multi-passo** para ações com consequências (reserva: formulário → revisão → confirmação).
- **Confirmações com motivo** para recusas e cancelamentos.
- **Tooltips informativos de tempo**: data/hora completa no fuso escolhido e no fuso local, com
  offsets GMT, mais botão de cópia com feedback de 2 s.
- **Header fixo** com pesquisa/ações, sino de notificações, toggle de tema e menu de utilizador.

### Componentes reutilizáveis

48 primitivos shadcn/ui em `src/components/ui`, mais componentes de domínio reutilizados em várias
páginas: `MusicianCard`, `MusicianPopup`, `MusiciansList`, `BookingDialog`, `BookingHistory`,
`CalendarPanel`, `RatingDialog`, `PhotoLightbox`, `FavoriteButton`, `BlockUserButton`,
`MusicSnippetSection` / `PublicMusicSnippet`, `NotificationsDropdown`, `JsonLd`, `RouteTitle`.

---

## 6. Histórico de desenvolvimento

Resumo cronológico aproximado das grandes fases:

1. **Base**: autenticação, perfis, onboarding, mapa inicial com marcadores simples.
2. **Privacidade**: introdução de coordenadas aproximadas, RLS granular e função de acesso a PII
   condicionada a reserva confirmada.
3. **Descoberta**: filtros, favoritos, bloqueios, preferências de parceiro. O filtro por género foi
   depois removido da pesquisa por ser considerado inadequado.
4. **Comunicação**: mensagens em tempo real, indicadores de escrita, notificações e emails via Resend.
5. **Reservas**: diálogo de agendamento em três passos, bloqueio de slots ocupados, cancelamento com
   motivo, recusa, reagendamento e histórico de eventos.
6. **Fusos horários**: campo `time_zone` no perfil, hook `useUserTimeZone`, exibição dupla
   (fuso escolhido + local), tooltips com offsets GMT, botão de cópia e exportação `.ics`.
7. **Mapa estilo Airbnb**: substituição dos marcadores empilhados por clustering com Supercluster;
   correção do "drift" dos clusters usando `fitBounds` com padding para a lista lateral; popups
   nativos com ações diretas.
8. **Perfis públicos e media**: página `/profile/:id`, galeria reorganizada por tipo e origem,
   lightbox com zoom.
9. **Monetização (scaffolding)**: excertos musicais como primeira funcionalidade paga potencial,
   tabela `subscriptions`, `is_pro()`, limites por trigger e diálogo de upgrade.
10. **SEO**: `llms.txt`, sitemap gerado no build, `robots.txt`, JSON-LD, metadados e canonical por rota,
    imagem Open Graph própria.
11. **Qualidade e segurança**: testes axe-core e Playwright do lightbox, auditoria i18n a falhar o
    build, teste SQL de privacidade do telefone em CI, ativação da proteção contra passwords
    comprometidas, revisão das políticas de `user_roles`.

### Problemas encontrados e resolução

| Problema | Resolução |
|---|---|
| Marcadores empilhados e ilegíveis no mapa | Clustering com Supercluster |
| Clusters "fugiam" para a esquerda ao clicar | `fitBounds` com padding correspondente à lista lateral |
| Perda de acesso aos filtros ao ver resultados | Reorganização do layout mapa/sidebar |
| Timestamps ambíguos entre fusos | Preferência de fuso no perfil + exibição dupla + offsets GMT |
| Duplicação de ficheiros entre "Meus ficheiros" e "Galeria pública" | Exclusão dos próprios ficheiros do separador público + filtros por tipo |
| Filtro por género na pesquisa | Removido da descoberta, mantido apenas como dado de perfil |
| Duplicação de código no calendário | Extração de um componente local `BookingCard` |

---

## 7. Current State

### Concluído

- Autenticação, onboarding e gestão de perfil.
- Descoberta no mapa com clustering, filtros, pesquisa e popups acionáveis.
- Perfis públicos com media, excertos e avaliações.
- Ciclo completo de reservas com histórico, fusos horários e export `.ics`.
- Mensagens, notificações (in-app, som; "push" é apenas em contexto ativo, não em background) e emails transacionais.
- Avaliações, favoritos, bloqueios, galeria.
- Painel de administração com estatísticas e moderação.
- Base SEO e primeira camada de testes automatizados.
- RLS em todas as tabelas e regras de negócio impostas na base de dados.

### Por desenvolver

- **Pagamentos**: nenhum processador ligado; o tier Pro não pode ser comprado.
- Gestão do token Mapbox no servidor em vez de introdução manual pelo utilizador.
- Fluxo de conclusão de sessão e prompt de avaliação — **grau de automatização não identificado**.
- Verificações de identidade/telefone/email: as colunas existem em `profiles`, mas **não foi
  identificado nenhum fluxo que as preencha**.
- Cobertura de testes para lá do lightbox e do helper de idioma.
- Migração consistente das leituras de dados para TanStack Query.
- Publicação: o projeto **não está publicado**.

### Bugs conhecidos

Nenhum bug aberto foi identificado no código ou no histórico à data deste documento. Isto não
significa que não existam — significa que não há uma lista rastreada.

### Limitações atuais

- O token do Mapbox é fornecido pelo utilizador e guardado em `localStorage`; sem token não há mapa.
- O clustering é client-side: todos os perfis visíveis são carregados no browser, o que não escala
  para dezenas de milhares de utilizadores.
- Existem ~20 perfis fictícios na base de dados, criados para avaliação visual do mapa; devem ser removidos
  antes de produção.
- O tier Pro só pode ser atribuído por escrita no servidor.
- `subscriptions` não tem políticas de escrita — qualquer integração de pagamentos terá de usar
  `service_role` numa Edge Function.
- A aplicação depende inteiramente de RLS: um erro numa política é imediatamente uma falha de segurança.
- Chaves i18n em falta nas quatro línguas fazem falhar o build de produção (por desenho).
- Na raiz do repositório existem três lockfiles simultâneos: `bun.lock`, `bun.lockb` e `package-lock.json`.
  Isto cria ambiguidade sobre qual gestor de pacotes (bun ou npm) é o oficial do projeto e implica risco
  de instalações inconsistentes entre ambientes/máquinas diferentes. Recomenda-se decidir um gestor único
  e remover os lockfiles redundantes.
- O `README.md` na raiz (73 linhas) permanece o template genérico inicial do Lovable ("Welcome to your Lovable project")
  e não descreve o JamMate, a arquitetura real nem os scripts e fluxos específicos do projecto
  (geração de sitemap, auditoria i18n, testes Playwright/Vitest). Fica desatualizado ao lado do
  `PROJECT_CONTEXT.md` e deve ser actualizado para reflectir a realidade do repositório.

### Dependências externas

| Dependência | Uso | Segredo |
|---|---|---|
| Supabase (via Lovable Cloud) | BD, auth, storage, realtime, funções | gerido pela plataforma |
| Mapbox GL JS | Mapa e geocoding | token do utilizador em `localStorage` |
| Resend | Email transacional | `RESEND_API_KEY` |
| Lovable AI Gateway | `LOVABLE_API_KEY` presente como secret do projecto (provisionado automaticamente pela plataforma Lovable) mas **não é referenciado em nenhum ficheiro de código do repositório** (nem no frontend nem nas Edge Functions). | `LOVABLE_API_KEY` |

---

## 8. Próximos passos recomendados

### Prioridades técnicas

1. **Mover o token do Mapbox para o servidor** (Edge Function que devolve um token restrito, ou
   variável de build) — remove o obstáculo de onboarding e a exposição no cliente.
2. **Ligar pagamentos** (Stripe ou Paddle) com uma Edge Function que use `service_role` para escrever
   em `subscriptions`, mais webhook de renovação/cancelamento.
3. **Limpar os dados de teste** antes de qualquer publicação.
4. **Fechar o ciclo de avaliação**: marcar sessões como concluídas e pedir avaliação automaticamente.
5. **Alargar os testes**: fluxo de reserva, políticas RLS, transições de estado.

### Melhorias necessárias

- Filtragem geográfica server-side (por exemplo com PostGIS ou bounding box) quando o número de
  perfis crescer.
- Uniformizar o acesso a dados com TanStack Query (cache, revalidação, estados de erro).
- Fluxo real de verificação de email/telefone/identidade, para dar sentido aos badges de confiança.
- Auditoria de acessibilidade das restantes páginas, ao nível do que já existe no lightbox.

### Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| Erro numa política RLS | Fuga de PII | Testes SQL por política, além do teste de telefone já em CI |
| Encontros presenciais entre desconhecidos | Segurança das pessoas | Verificações, denúncias e moderação |
| Custos do Mapbox | Financeiro | Token restrito, caching, limites de utilização |
| Carga do mapa com muitos utilizadores | Desempenho | Clustering server-side |
| Entregabilidade de email | Fluxos de reserva falham silenciosamente | Domínio próprio no Resend e monitorização |
| Cron job `send-booking-reminders` não versionado (criado directamente na base de dados) | Lembretes deixam de ser enviados silenciosamente se a base de dados for recriada/clonada/remixada; risco operacional e perda de confiança nos lembretes | Versionar a criação do job em `supabase/migrations/` ou documentação/automação explícita da provisão do job; evitar uso de `anon key` em chamadas agendadas e considerar execução via role de serviço/Edge Function |

### Roadmap sugerido

- **Fase 1 — pronto para produção**: token Mapbox no servidor, limpeza de dados de teste, domínio de
  email, revisão de RLS, publicação.
- **Fase 2 — monetização**: checkout de pagamentos, webhooks, portal do cliente, gating Pro alargado
  (por exemplo destaque no mapa, mais media).
- **Fase 3 — confiança e escala**: verificações, denúncias, moderação, descoberta server-side.
- **Fase 4 — crescimento**: eventos/jams em grupo, aplicação móvel ou PWA, recomendações.

---

## 9. Repositório e sincronização

| Item | Valor / Estado |
|---|---|
| URL do repositório | https://github.com/eleonorarocha/jam-mate |
| Visibilidade | Público |
| Sincronização com Lovable | Lovable → GitHub confirmado: alterações feitas no editor do Lovable são enviadas para o GitHub. GitHub → Lovable (alterações feitas diretamente no GitHub refletidas no editor do Lovable): **não identificado**. |
| Data da ligação | 2026-08-07 |
| CI / GitHub Actions | `.github/workflows/phone-privacy-test.yml` — testes SQL de privacidade do número de telefone. |
| Estado do sync neste ambiente | O remote `origin` local aponta para o storage privado do Lovable. O push para o GitHub é executado pelo serviço server-side do Lovable, não por este sandbox. [...]

### Histórico Git (factos concretos)

- Primeiro commit: `c172396` — 2025-11-17T20:27:49Z — mensagem: "Initial commit from template vite_react_shadcn_ts...".
- Total de commits no repositório até 2026-08-06: 664 commits.
- Tempo desde o primeiro commit até 2026-08-06: aproximadamente 8,7 meses.

### Notas para o próximo agente

- Não editar directamente o repositório GitHub esperando que o Lovable absorva alterações sem conflitos: o sync confirmado é apenas Lovable → GitHub. O sentido inverso está **não identificado**.
- Para confirmar o estado do sync, verificar o repositório GitHub diretamente ou pedir ao utilizador para confirmar a UI do Lovable (Plus (+) → GitHub).
- A integração GitHub só pode ser ligada/desligada pela UI do Lovable; não existe comando git neste ambiente que a crie ou remova.

---

## INSTRUÇÕES PARA O PRÓXIMO AGENTE

### Como interpretar este documento

É um **briefing inicial**, não uma especificação. Descreve o projeto tal como estava na data indicada
no topo. Usa-o para te orientares depressa, mas trata o código e o esquema da base de dados como a
única fonte de verdade.

### Factos confirmados (lidos diretamente do projecto)

- Stack, versões e dependências — de `package.json`, `vite.config.ts`, `tailwind.config.ts`.
- Lista de rotas, páginas, componentes e hooks — da árvore de ficheiros e de `src/App.tsx`.
- Esquema da base de dados: tabelas, colunas, enums, chaves estrangeiras, políticas RLS, funções e
  triggers — do esquema real.
- Tokens de design e paleta — de `src/index.css`.
- Configuração de storage, segredos e Edge Functions — da configuração do backend.

### A validar antes de alterar

- **Histórico de desenvolvimento (secção 6)**: reconstruído a partir do histórico de conversa, não do
  git. Trata-o como narrativa, não como registo exacto.
- **Estado "funcional" de cada funcionalidade**: significa "implementada e ligada a dados reais", não
  "testada de ponta a ponta em produção". Verifica no browser antes de assumir.
- **Ausência de bugs**: não há lista rastreada. Não concluas que não existam problemas.
- **Tudo o que está marcado "não identificado"**: investiga antes de agir.

### Cuidados antes de modificar arquitectura ou código

1. **Nunca editar** `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts`,
   `.env` nem `supabase/config.toml` — são auto-gerados.
2. **Nunca guardar papéis em `profiles`.** Papéis vivem em `user_roles` e verificam-se com
   `has_role()`. Guardá-los no perfil abre escalada de privilégios.
3. **Toda a tabela nova em `public` precisa de RLS activo, políticas e `GRANT` explícitos** para
   `authenticated` e `service_role`. Sem `GRANT` a tabela é inacessível em runtime.
4. **Nunca expor coordenadas exatas nem PII no cliente.** O mapa usa `approx_latitude`/
   `approx_longitude`; dados sensíveis só através de `get_profile_sensitive()`.
5. **As regras de negócio das reservas estão em triggers.** Alterar transições de estado no frontend
   sem alterar `validate_booking_update` resulta em erros de base de dados.
6. **Os limites de snippets são impostos por trigger.** A UI apenas os reflete; mudar só a UI não muda
   o comportamento.
7. **Não hardcodes cores.** Usa os tokens semânticos de `index.css`, ou o tema escuro quebra.
8. **Adiciona chaves i18n nas quatro línguas** (PT/EN/ES/FR). Chaves do mapa em falta fazem falhar o
   build de produção.
9. **Alterações de esquema fazem-se por migração**, nunca por edição manual, e devem ser
   acompanhadas das políticas correspondentes.
10. **Antes de mexer no `MapComponent`**, lê-o por inteiro: a interação entre Supercluster, popups
    nativos e `fitBounds` com padding é sensível e já foi origem de vários bugs de comportamento.

11. **Nota operacional sobre o cron de lembretes**: o job `send-booking-reminders` existe apenas como
    objecto na base de dados (não está versionado por migração). Se a infraestrutura for recriada,
    documentar/automatizar a recriação do job em `supabase/migrations/` é essencial para evitar a
    perda silenciosa de lembretes.

