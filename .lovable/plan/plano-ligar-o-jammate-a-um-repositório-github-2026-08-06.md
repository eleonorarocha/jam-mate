# Plano: Ligar o JamMate a um repositório GitHub

## Objetivo
Estabelecer a sincronização bidirecional entre o projeto JamMate no Lovable e um repositório GitHub, para backup, colaboração e aproveitamento do workflow `phone-privacy-test.yml` já existente no projeto.

## Estado atual (confirmado)
- O repositório git local está ligado ao storage privado do Lovable, não ao GitHub.
- Não existe remote `github.com` ativo.
- O último commit local é `9ee1f12 — Criou PROJECT_CONTEXT.md`.
- A working tree está limpa (sem alterações por commitar).
- Já existe um ficheiro `.github/workflows/phone-privacy-test.yml` preparado para correr em GitHub Actions.

## Passos

1. **Preparar conta/workspace**
   - Confirmar que a conta Lovable ainda não tem outro GitHub ligado (o Lovable só permite 1 conta GitHub por conta Lovable).
   - Decidir se o repositório será público ou privado.

2. **Iniciar a ligação no editor Lovable**
   - No editor do projeto, abrir o menu Plus (+) no input do chat → **GitHub** → **Connect project**.
   - Autorizar a Lovable GitHub App no GitHub.
   - Selecionar a conta/organização onde o repositório será criado.
   - Criar o repositório. O Lovable vai fazer push do código atual para o novo repo.

3. **Validar a ligação**
   - Verificar que o remote `origin` passa a apontar para `github.com/<owner>/<repo>`.
   - Confirmar que o histórico de commits aparece no GitHub (espera-se começar pelo commit atual `9ee1f12`).
   - Garantir que o ficheiro `.github/workflows/phone-privacy-test.yml` está presente na branch `main` do GitHub.

4. **Ativar/verificar o workflow de CI**
   - O workflow `Phone Privacy Tests` já está configurado para correr em `push` e `pull_request` para `main`.
   - Após a ligação, um push para `main` deve disparar o workflow. Verificar se a execução inicial é bem-sucedida ou se precisa de ajustes (ex: permissões do token, schema de testes).

5. **Documentar o repositório no projeto (opcional mas recomendado)**
   - Atualizar o `README.md` da raiz para incluir o link para o repositório GitHub.
   - Atualizar `PROJECT_CONTEXT.md` com a informação de que o projeto está agora sincronizado com GitHub.

## Limitações conhecidas
- O Lovable não suporta importar repositórios GitHub existentes; cria sempre um novo repo a partir do projeto atual.
- Se o projeto tiver "Public remixing" ativo, o código fonte já é partilhável; certificar-se de que não existem segredos no código antes de tornar o repo público.
- A sincronização é bidirecional: alterações no Lovable empurram para o GitHub, e alterações no GitHub sincronizam de volta para o Lovable.

## Critérios de sucesso
- `git remote -v` mostra `origin` apontando para um URL do GitHub.
- O repositório no GitHub contém o código atual e o histórico de commits.
- O GitHub Actions workflow `Phone Privacy Tests` é executado com sucesso num push para `main`.
- `README.md` reflete o novo link do repositório (se aplicado o passo 5).
