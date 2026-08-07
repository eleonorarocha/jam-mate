# Plano: Verificar e consolidar a ligação GitHub do JamMate

## Contexto
O utilizador confirmou que o projeto JamMate está agora ligado ao GitHub. No entanto, o ambiente de execução local mostra o remote `origin` a apontar ainda para o storage privado do Lovable (`git.private.lovable-gcp.code.storage/...`), com o commit mais recente `75d150b — Configurou link GitHub`. O sync real com o GitHub é executado pelo serviço server-side do Lovable, não por este sandbox.

## Objetivo
Confirmar que o repositório `eleonorarocha/JAMMATE` no GitHub está sincronizado com o código atual; se não estiver, forçar/trigger o primeiro push; e atualizar a documentação do projeto com o URL do repositório e o estado do CI.

## Passos

1. **Verificar estado do repositório GitHub**
   - Fazer fetch das informações do repositório `eleonorarocha/JAMMATE` através da API pública do GitHub (ou, se necessário, perguntar ao utilizador para confirmar o estado visual).
   - Confirmar se o branch `main` existe e tem commits.
   - Comparar o commit mais recente no GitHub com o commit local `75d150b`.

2. **Diagnosticar ausência de commits no GitHub (se aplicável)**
   - Se o repo estiver vazio, identificar a causa provável: ligação registada no Lovable mas sync inicial ainda não executado, ou erro de permissões da Lovable GitHub App.
   - Sugerir ao utilizador os passos na UI do Lovable para desligar e religar a integração, ou fazer uma pequena alteração para forçar o push.

3. **Forçar/trigger o primeiro push (se o repo estiver vazio)**
   - Opção A: Fazer uma alteração mínima e segura num ficheiro de documentação (ex: `README.md` ou `PROJECT_CONTEXT.md`) para que o Lovable detecte mudanças e dispare o sync server-side para o GitHub.
   - Opção B: Orientar o utilizador a usar a UI do Lovable (Plus (+) → GitHub → Manage/Disconnect/Connect) se a ligação precisar de ser refrescada.
   - Nota: não alterar código da aplicação; apenas documentação.

4. **Confirmar o resultado da sincronização**
   - Verificar novamente o repositório GitHub.
   - Reportar: hash e mensagem do commit mais recente, número de ficheiros no repo, e se o workflow `.github/workflows/phone-privacy-test.yml` está presente.

5. **Atualizar documentação interna**
   - Atualizar `README.md` na raiz para incluir o link do repositório GitHub e uma nota sobre sincronização bidirecional com o Lovable.
   - Atualizar `PROJECT_CONTEXT.md` com uma secção "Repositório e sincronização" indicando: URL, visibilidade (público/privado), estado do CI, e data da ligação.

## Limitações e riscos
- O sync real é server-side; este sandbox não pode fazer push direto para `github.com` sem o remote configurado localmente.
- Não é possível confirmar 100% o estado do repositório remoto sem acesso à conta GitHub ou sem a API pública responder (repo privado pode bloquear a API pública).
- O utilizador pode precisar de intervir na UI do Lovable se a ligação não estiver ativa.

## Critérios de sucesso
- Repositório `eleonorarocha/JAMMATE` contém o código atual e histórico de commits.
- Commit mais recente no GitHub corresponde ao código local (ou explicação clara se não corresponder).
- Workflow `Phone Privacy Tests` está presente no branch `main`.
- `README.md` e `PROJECT_CONTEXT.md` refletem o repositório GitHub e o estado do sync.
