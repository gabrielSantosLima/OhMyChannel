<div align="center">

<img src="assets/icon.png" alt="OhMyChannel" width="160" />

# OhMyChannel

O app desktop para preparar e agendar seus uploads do YouTube.

[![Release](https://img.shields.io/github/v/release/gabrielSantosLima/OhMyChannel?label=release)](https://github.com/gabrielSantosLima/OhMyChannel/releases)
[![Build](https://github.com/gabrielSantosLima/OhMyChannel/actions/workflows/build.yml/badge.svg)](https://github.com/gabrielSantosLima/OhMyChannel/actions/workflows/build.yml)
[![Licença: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[English](README.md) | [Português (Brasil)](README.pt-BR.md) | [Español](README.es.md)

<br />

<img src="docs/demo.gif" alt="Demonstração do OhMyChannel" width="820" />

</div>

O OhMyChannel permite preparar seus uploads do YouTube direto do computador —
preencha os detalhes, adicione uma intro, escolha uma thumbnail e uma playlist, e
agende quando vai ao ar. Os envios rodam em segundo plano enquanto você continua
trabalhando.

## Recursos

- Enfileire vários vídeos e envie **todos de uma vez** com **progresso ao vivo**.
- Reutilize **templates de título e descrição** para preencher tudo em segundos.
- Adicione vídeos a **playlists** e **agende a data de publicação**.
- Defina **thumbnails personalizadas** — escolha uma imagem ou componha a partir
  de um template.
- Adicione **intros** e faça com que sejam renderizadas no vídeo antes do envio.
- Continue enviando **em segundo plano**, com progresso na bandeja e notificações.
- Receba **atualizações automáticas** quando houver uma nova versão.

## Começando

```bash
npm install
npm start
```

O OhMyChannel usa as **suas** credenciais OAuth do Google Cloud. Abra a tela
**Setup** no app para um passo a passo e clique em "Import credentials" para
adicionar o seu `client_secrets.json`. Nenhuma credencial é empacotada com o app.

## Plataformas

- **Windows**: instalador NSIS e build portable.
- **Linux**: AppImage e `.deb`.

O auto-update funciona no instalador NSIS (Windows) e no AppImage (Linux). As
builds portable e `.deb` não fazem auto-update; o ícone de update abre a página
da release para você baixar a nova versão manualmente.

## Release

As releases são feitas pela GitHub Action **manual** `Release`
(`.github/workflows/release.yml`, `workflow_dispatch`). Ela faz o bump da versão
no `package.json`, gera as notas a partir dos Conventional Commits desde a última
tag (com referências de commit), commita `chore(release): v<version>`, cria a tag
`v<version>` e publica a GitHub Release.

Para gerar as notas localmente:

```bash
node scripts/release-notes.js
```

### Gerando instaladores

A GitHub Action **Build** (`.github/workflows/build.yml`) gera os instaladores em
uma matriz (Windows + Linux) e os anexa à release. Ela roda automaticamente após
uma release e também pode ser disparada manualmente com uma tag (ex.: `v0.0.1`).
Os formatos estão na seção Plataformas.

Localmente use `npm run dist:win` ou `npm run dist:linux` no SO correspondente.
Credenciais nunca são empacotadas: `client_secrets.json` e `token.json` são
excluídos do pacote.

## Licença

Este projeto está licenciado sob a licença MIT. Veja o arquivo [LICENSE](LICENSE)
para detalhes.
