# JamMate

JamMate é uma aplicação web que funciona como um **"Airbnb para músicos"**: um mapa interativo onde músicos descobrem outros músicos perto de si e agendam jam sessions presenciais.

Este projeto é desenvolvido no [Lovable](https://lovable.dev) e sincronizado em tempo real com o GitHub.

## Repositório

- **GitHub**: https://github.com/eleonorarocha/jam-mate
- **Visibilidade**: público
- **Sincronização**: Lovable → GitHub confirmado (alterações no editor do Lovable são enviadas para o GitHub). O sentido inverso não está confirmado.
- **CI**: `.github/workflows/phone-privacy-test.yml` — testes SQL de privacidade do número de telefone.

## Gestor de pacotes

O gestor de pacotes **oficial** deste projeto é o **Bun**. O único lockfile versionado é `bun.lock`; os scripts `predev`/`prebuild` executam `bun scripts/generate-sitemap.ts` e o ambiente do Lovable usa Bun para instalar dependências.

Não commitar `package-lock.json`, `yarn.lock` nem `bun.lockb` (removidos em 2026-08-07).

## Desenvolver no Lovable

Abre o projeto no [editor Lovable](https://lovable.dev/projects/825cf83b-d7be-4ec7-a41b-2380bfc09a97) e descreve as alterações que queres ver. O Lovable escreve o código e sincroniza-o automaticamente com este repositório.

## Desenvolver localmente

Precisas do [Bun](https://bun.sh) instalado.

```sh
git clone https://github.com/eleonorarocha/jam-mate.git
cd jam-mate
bun install
bun run dev
```
