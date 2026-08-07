# JamMate

JamMate é uma aplicação web que funciona como um **"Airbnb para músicos"**: um mapa interativo onde músicos descobrem outros músicos perto de si e agendam jam sessions presenciais.

Este projeto é desenvolvido no [Lovable](https://lovable.dev) e sincronizado em tempo real com o GitHub.

## Repositório

- **GitHub**: https://github.com/eleonorarocha/JAMMATE
- **Visibilidade**: privado
- **Sincronização**: bidirecional — alterações no Lovable são enviadas para o GitHub, e alterações feitas no GitHub são sincronizadas de volta para o Lovable.
- **CI**: `.github/workflows/phone-privacy-test.yml` — testes SQL de privacidade do número de telefone.

## Desenvolver no Lovable

Abre o projeto no [editor Lovable](https://lovable.dev/projects/825cf83b-d7be-4ec7-a41b-2380bfc09a97) e descreve as alterações que queres ver. O Lovable escreve o código e sincroniza-o automaticamente com este repositório.

## Desenvolver localmente

Precisas do Node.js e npm — [instalar com nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone https://github.com/eleonorarocha/JAMMATE.git
cd JAMMATE
npm i
npm run dev
```
