# Plano: Corrigir secção 9 do PROJECT_CONTEXT.md

## Contexto
A secção "9. Repositório e sincronização" do `PROJECT_CONTEXT.md` contém informação desatualizada sobre a ligação GitHub do projeto JamMate. O utilizador forneceu correções factuais e pede que apenas essa secção seja alterada.

## Correções a aplicar

1. **URL do repositório**
   - De: `https://github.com/eleonorarocha/JAMMATE`
   - Para: `https://github.com/eleonorarocha/jam-mate`

2. **Visibilidade**
   - De: "Privado (não confirmado via API pública; estado declarado pelo utilizador)"
   - Para: "Público"

3. **Sincronização com Lovable**
   - De: "Bidirecional. Alterações no Lovable enviam para o GitHub; pushes para `main` no GitHub sincronizam de volta para o Lovable."
   - Para: apenas confirmar o sentido Lovable → GitHub. O sentido inverso (GitHub → Lovable) deve ser marcado como **não identificado**, uma vez que não existe confirmação absoluta de que alterações feitas diretamente no GitHub são importadas de volta para o editor do Lovable.

4. **Menções cruzadas ao nome antigo JAMMATE**
   - Verificar o documento completo por outras ocorrências de `JAMMATE` ou `eleonorarocha/JAMMATE`.
   - Atualizar qualquer ocorrência para `jam-mate`/`eleonorarocha/jam-mate`.
   - Nota: a verificação preliminar indica que só existe uma ocorrência (na própria secção 9). Não existe tabela de "Dependências externas" neste documento.

## O que NÃO será alterado

- Nenhuma outra secção do `PROJECT_CONTEXT.md`.
- Nenhum código da aplicação.
- Nenhuma configuração de backend ou frontend.

## Passos

1. Ler a secção 9 atual do `PROJECT_CONTEXT.md` (já confirmada).
2. Reescrever apenas a secção 9 com os valores corrigidos.
3. Verificar novamente o documento por ocorrências de `JAMMATE`.
4. Guardar o ficheiro.
5. Commit das alterações (o Lovable sincronizará automaticamente para o GitHub).
6. Reportar o hash e a mensagem do commit.
7. Devolver ao utilizador apenas o texto atualizado da secção 9.

## Texto proposto para a secção 9

```markdown
## 9. Repositório e sincronização

| Item | Valor / Estado |
|---|---|---|
| URL do repositório | https://github.com/eleonorarocha/jam-mate |
| Visibilidade | Público |
| Sincronização com Lovable | Lovable → GitHub confirmado: alterações feitas no editor do Lovable são enviadas para o GitHub. GitHub → Lovable (alterações feitas diretamente no GitHub refletidas no editor do Lovable): **não identificado**. |
| Data da ligação | 2026-08-07 |
| CI / GitHub Actions | `.github/workflows/phone-privacy-test.yml` — testes SQL de privacidade do número de telefone. |
| Estado do sync neste ambiente | O remote `origin` local aponta para o storage privado do Lovable. O push para o GitHub é executado pelo serviço server-side do Lovable, não por este sandbox. |

### Histórico Git (factos concretos)

- Primeiro commit: `c172396` — 2025-11-17T20:27:49Z — mensagem: "Initial commit from template vite_react_shadcn_ts...".
- Total de commits no repositório até 2026-08-06: 664 commits.
- Tempo desde o primeiro commit até 2026-08-06: aproximadamente 8,7 meses.

### Notas para o próximo agente

- Não editar directamente o repositório GitHub esperando que o Lovable absorva alterações sem conflitos: o sync confirmado é apenas Lovable → GitHub. O sentido inverso está **não identificado**.
- Para confirmar o estado do sync, verificar o repositório GitHub diretamente ou pedir ao utilizador para confirmar a UI do Lovable (Plus (+) → GitHub).
- A integração GitHub só pode ser ligada/desligada pela UI do Lovable; não existe comando git neste ambiente que a crie ou remova.
```

## Critérios de sucesso

- `PROJECT_CONTEXT.md` secção 9 reflete o URL correto (`eleonorarocha/jam-mate`), visibilidade pública e o fluxo de sync confirmado.
- Nenhuma outra secção do documento é alterada.
- Não existem referências desatualizadas a `JAMMATE` no documento.
- O utilizador recebe o hash do commit e o texto atualizado da secção 9.
