# Documento de contexto do JamMate para outro agente de IA

Criar um único ficheiro Markdown, `PROJECT_CONTEXT.md`, na raiz do repositório, escrito em português, pronto a colocar no GitHub e a entregar a outro agente (Claude).

## O que o documento vai conter

1. **Visão geral** — o que é o JamMate ("Airbnb para músicos"), problema que resolve, utilizadores-alvo, proposta de valor, maturidade atual (MVP funcional em desenvolvimento contínuo).
2. **Arquitetura** — SPA React 18 + Vite 5 + TypeScript + Tailwind + shadcn/ui; backend Lovable Cloud (Supabase: Postgres com RLS, Auth, Storage, Realtime, Edge Functions em Deno); Mapbox GL + Supercluster para o mapa; Resend para email; i18next (PT/EN/ES/FR); react-router-dom; TanStack Query. Diagrama ASCII do fluxo cliente → cliente Supabase → Postgres/RLS e cliente → Edge Functions → Resend.
3. **Organização de ficheiros** — `src/pages` (17 páginas), `src/components` (~40 componentes + `ui/` shadcn + `landing/`), `src/hooks` (14 hooks), `src/lib` (ics, csv-export, profileLanguage), `src/i18n`, `src/integrations/supabase` (auto-gerado), `supabase/functions` (5 funções), `scripts/`, `e2e/`.
4. **Inventário de funcionalidades** — mapa com clustering e popups, pesquisa/filtros, perfis público e privado, onboarding, autenticação, bookings (pedido → aceite/recusa/cancelamento com motivo, histórico de eventos, export .ics, fusos horários), mensagens em tempo real, notificações, avaliações multi-critério, favoritos, bloqueios, galeria, snippets de música, painel de administração, feedback. Cada item marcado como funcional / parcial / placeholder — o gating Pro e as subscrições são scaffolding sem pagamentos ligados.
5. **Base de dados** — as 13 tabelas públicas, colunas-chave, enums, chaves estrangeiras, políticas RLS, funções security-definer (`has_role`, `is_pro`, `can_view_sensitive_profile`, `get_musician_busy_slots`, ...) e triggers (limites de snippets, coordenadas aproximadas, média de ratings, validação de bookings). Inclui as regras de negócio que estas funções impõem.
6. **Design e UX** — identidade JamMate, tokens semânticos em `index.css`, tema claro/escuro, padrões de interface (mapa + sidebar estilo Airbnb, diálogos multi-passo, tooltips com fuso horário, lightbox acessível), decisões de privacidade visíveis na UI.
7. **Histórico de desenvolvimento** — evolução resumida: mapa e clustering, fluxo de bookings, timezones, snippets/Pro, SEO (llms.txt, sitemap, JSON-LD, metadados por rota), acessibilidade e testes, correções de segurança.
8. **Current State** — concluído, em falta, bugs conhecidos, limitações (token Mapbox em localStorage, pagamentos por ligar, perfis de teste na base de dados) e dependências externas.
9. **Próximos passos** — prioridades técnicas, riscos e roadmap sugerido.
10. **INSTRUÇÕES PARA O PRÓXIMO AGENTE** — como ler o documento, o que são factos verificados no código/esquema, o que deve ser validado antes de mudar, e cuidados com RLS, privacidade de PII, ficheiros auto-gerados e migrações.

## Notas técnicas

- Tudo o que for afirmado é lido do código e do esquema real; qualquer lacuna fica marcada como "não identificado".
- Sem IDs, URLs ou chaves de projeto no documento.
- Nenhum código da aplicação é alterado — apenas se cria o `PROJECT_CONTEXT.md`.
