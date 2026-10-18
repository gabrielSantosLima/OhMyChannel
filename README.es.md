<div align="center">

<img src="assets/icon.png" alt="OhMyChannel" width="160" />

# OhMyChannel

La app de escritorio para preparar y programar tus subidas a YouTube.

[![Release](https://img.shields.io/github/v/release/gabrielSantosLima/OhMyChannel?label=release)](https://github.com/gabrielSantosLima/OhMyChannel/releases)
[![Build](https://github.com/gabrielSantosLima/OhMyChannel/actions/workflows/build.yml/badge.svg)](https://github.com/gabrielSantosLima/OhMyChannel/actions/workflows/build.yml)
[![Licencia: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[English](README.md) | [Português (Brasil)](README.pt-BR.md) | [Español](README.es.md)

<br />

<img src="docs/demo.gif" alt="Demostración de OhMyChannel" width="820" />

</div>

OhMyChannel te permite preparar tus subidas a YouTube desde tu computadora —
completa los detalles, añade una intro, elige una miniatura y una lista de
reproducción, y programa cuándo se publica. Las subidas corren en segundo plano
mientras sigues trabajando.

## Características

- Pon varios videos en cola y súbelos **todos a la vez** con **progreso en vivo**.
- Reutiliza **plantillas de título y descripción** para completar todo en segundos.
- Añade videos a **listas de reproducción** y **programa la fecha de publicación**.
- Define **miniaturas personalizadas** — elige una imagen o compón una a partir de
  una plantilla.
- Añade **intros** y haz que se rendericen en tus videos antes de subirlos.
- Sigue subiendo **en segundo plano**, con progreso en la bandeja y notificaciones.
- Recibe **actualizaciones automáticas** cuando haya una nueva versión.

## Primeros pasos

```bash
npm install
npm start
```

OhMyChannel usa **tus** credenciales OAuth de Google Cloud. Abre la pantalla
**Setup** en la app para una guía paso a paso y haz clic en "Import credentials"
para añadir tu `client_secrets.json`. No se incluye ninguna credencial en la app.

## Plataformas

- **Windows**: instalador NSIS y build portable.
- **Linux**: AppImage y `.deb`.

La auto-actualización funciona en el instalador NSIS (Windows) y en el AppImage
(Linux). Las builds portable y `.deb` no se auto-actualizan; su icono de
actualización abre la página de la release para descargar la nueva versión
manualmente.

## Releases

Las releases se crean con la GitHub Action **manual** `Release`
(`.github/workflows/release.yml`, `workflow_dispatch`). Hace el bump de la versión
en `package.json`, genera las notas desde los Conventional Commits desde el
último tag (con referencias de commit), commitea `chore(release): v<version>`,
crea el tag `v<version>` y publica la GitHub Release.

Para generar las notas localmente:

```bash
node scripts/release-notes.js
```

### Generar instaladores

La GitHub Action **Build** (`.github/workflows/build.yml`) genera los instaladores
en una matriz (Windows + Linux) y los adjunta a la release. Se ejecuta
automáticamente después de una release y también puede lanzarse manualmente con
un tag (p. ej. `v0.0.1`). Los formatos están en la sección Plataformas.

Localmente usa `npm run dist:win` o `npm run dist:linux` en el SO correspondiente.
Las credenciales nunca se empaquetan: `client_secrets.json` y `token.json` se
excluyen del paquete.

## Licencia

Este proyecto está bajo la licencia MIT. Consulta el archivo [LICENSE](LICENSE)
para más detalles.
