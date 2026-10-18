<div align="center">

<img src="assets/icon.png" alt="OhMyChannel" width="160" />

# OhMyChannel

The desktop app to prepare and schedule your YouTube uploads.

[![Release](https://img.shields.io/github/v/release/gabrielSantosLima/OhMyChannel?label=release)](https://github.com/gabrielSantosLima/OhMyChannel/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[English](README.md) | [Português (Brasil)](README.pt-BR.md) | [Español](README.es.md)

<br />

<img src="docs/demo.gif" alt="OhMyChannel demo" width="820" />

</div>

OhMyChannel lets you prepare your YouTube uploads from your desktop — fill in
the details, add an intro, pick a thumbnail and a playlist, and schedule when it
goes live. The uploads run in the background while you keep working.

## Features

- Queue several videos and upload them **all at once** with **live progress**.
- Reuse **title and description templates** to fill everything in seconds.
- Add videos to **playlists** and **schedule the publish date**.
- Set **custom thumbnails** — pick an image or compose one from a template.
- Add **intros** and have them rendered into your videos before uploading.
- Keep uploading **in the background** with tray progress and notifications.
- Get **automatic updates** when a new version is available.

## Getting started

```bash
npm install
npm start
```

OhMyChannel uses your own Google Cloud OAuth credentials. Open the **Setup**
screen in the app for a step-by-step guide, then click "Import credentials" to
add your `client_secrets.json`. No credentials are bundled with the app.

## Platforms

- **Windows**: NSIS installer and portable build.
- **Linux**: AppImage and `.deb`.

Automatic updates are supported on the Windows NSIS installer and the Linux
AppImage. The portable and `.deb` builds cannot auto-update; their update icon
links to the release page so you can download the new version manually.

## Releasing

Releases are cut through the **manual** `Release` GitHub Action
(`.github/workflows/release.yml`, `workflow_dispatch`). It bumps the version in
`package.json`, generates release notes from the Conventional Commits since the
last tag (with commit references), commits `chore(release): v<version>`, pushes
a `v<version>` tag, and creates a GitHub Release.

To generate release notes locally:

```bash
node scripts/release-notes.js
```

### Building installers

The **Build** GitHub Action (`.github/workflows/build.yml`) builds the installers
on a matrix (Windows + Linux) and attaches them to the release. It runs
automatically after a release, and can also be dispatched manually with a tag
(e.g. `v0.0.1`). Target formats are described in the Platforms section.

Locally you can run `npm run dist:win` or `npm run dist:linux` on the matching
operating system. Credentials are never bundled: `client_secrets.json` and
`token.json` are excluded from the package.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file
for details.
