<div align="center">

<img src="assets/icon.png" alt="OhMyChannel" width="160" />

# OhMyChannel

O app desktop que faz pré-upload de vídeos para o YouTube.

[![Release](https://img.shields.io/github/v/release/gabrielSantosLima/OhMyChannel?label=release)](https://github.com/gabrielSantosLima/OhMyChannel/releases)
[![Build](https://github.com/gabrielSantosLima/OhMyChannel/actions/workflows/build.yml/badge.svg)](https://github.com/gabrielSantosLima/OhMyChannel/actions/workflows/build.yml)
[![Licença: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[English](README.md) | [Português (Brasil)](README.pt-BR.md) | [Español](README.es.md)

<br />

<img src="docs/demo.gif" alt="Demonstração do OhMyChannel" width="820" />

</div>

OhMyChannel é um app desktop em Electron que faz pré-upload de vídeos para o
YouTube. Você informa apenas o título e a descrição — o upload roda em segundo
plano com progresso ao vivo na bandeja do sistema e, ao terminar, uma notificação
leva direto ao YouTube Studio para finalizar os detalhes restantes.

## Recursos

- Login com o Google (OAuth) e upload de vídeos para o YouTube.
- Fila de vários vídeos — arraste arquivos para a janela ou use "Add videos" — e
  envie em paralelo, com progresso e cancelamento por vídeo.
- Preencha apenas o título e a descrição; finalize o resto no YouTube Studio.
- Continue enviando em segundo plano com o progresso geral na bandeja; clique na
  notificação de conclusão para abrir o YouTube Studio.
- Templates reutilizáveis de título/descrição pelo comando `/template` com
  autocomplete. Ao inserir um template, cada parâmetro vira um chip editável
  inline, permitindo valores com espaços.
- Adicione o vídeo enviado a uma das suas playlists (a lista vem da sua conta).
- Agende a data de publicação (o vídeo fica privado até o horário escolhido).
- Defina uma thumbnail personalizada escolhendo uma imagem, arrastando para o
  card, ou gerando a partir de um template de thumbnail.
- Editor visual de thumbnail: imagem de fundo, elementos de texto e imagem,
  arrastar para posicionar, menu de contexto (botão direito) para
  adicionar/duplicar/reordenar/excluir, parâmetros dinâmicos ou estáticos e
  exportação em PNG.
- Intros: faça upload de vídeos de intro, configure transições de vídeo e áudio
  separadamente (none/fade/crossfade), ajuste o volume da intro e visualize o
  resultado com um placeholder no lugar do vídeo principal.
- Renderize a intro junto com o vídeo antes do upload, na resolução configurável
  (padrão 2K) e no frame rate do vídeo principal. O render tem fila própria, com
  número configurável de renders em paralelo e status "Queued". Opcionalmente
  envie automaticamente após renderizar, ou confirme manualmente.
- Tela de Setup que guia a criação das suas próprias credenciais OAuth do Google
  Cloud e a importação delas; nenhuma credencial é empacotada com o app.
- Auto-update: o app verifica novas releases, baixa em segundo plano e mostra um
  ícone "Update" no topo para reiniciar e instalar.
- Navegação lateral com uma tela de Settings (tema, execução em segundo plano,
  uploads/renders em paralelo, resolução de render e preferências de update) e
  uma tela About com a versão.

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
