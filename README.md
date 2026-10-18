<div align="center">

<img src="assets/icon.png" alt="OhMyChannel" width="160" />

# OhMyChannel

The desktop app that pre-uploads videos to YouTube.

[![Release](https://img.shields.io/github/v/release/gabrielSantosLima/OhMyChannel?label=release)](https://github.com/gabrielSantosLima/OhMyChannel/releases)
[![Build](https://github.com/gabrielSantosLima/OhMyChannel/actions/workflows/build.yml/badge.svg)](https://github.com/gabrielSantosLima/OhMyChannel/actions/workflows/build.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[English](README.md) | [Português (Brasil)](README.pt-BR.md) | [Español](README.es.md)

</div>

OhMyChannel is an Electron desktop app that pre-uploads videos to YouTube. You
only provide the title and description — the upload runs in the background with
live progress in the system tray, and when it finishes a notification lets you
jump straight to YouTube Studio to complete the remaining details.

## Features

- Sign in with Google (OAuth) and upload videos to YouTube.
- Queue multiple videos — drop files onto the window or use "Add videos" — and
  upload them simultaneously with per-video progress and cancellation.
- Fill in only the title and description; finish the rest in YouTube Studio.
- Keep uploading in the background with overall progress shown in the system
  tray; click the completion notification to open YouTube Studio.
- Reusable title/description templates via the `/template` command with
  autocomplete. When a template is inserted, each parameter becomes an inline
  editable chip, so values can contain spaces.
- Add an uploaded video to one of your playlists (the list is loaded from your
  YouTube account).
- Schedule the publish date (the video stays private until the chosen time).
- Set a custom thumbnail by picking an image, dragging one onto the card, or
  generating it from a thumbnail template.
- Visual thumbnail editor: background image, text and image elements, drag to
  position, right-click context menu to add/duplicate/reorder/delete elements,
  dynamic or static parameters, and PNG export.
- Intros: upload intro videos, configure separate video and audio transitions
  (none/fade/crossfade), adjust the intro volume, and preview the result with a
  placeholder for the main video.
- Render the intro together with the video before uploading, at a configurable
  resolution (defaults to 2K) and the main video's frame rate. Rendering runs in
  its own queue with a configurable number of parallel renders and "Queued"
  status. Optionally submit automatically after rendering, or confirm manually.
- Setup screen that guides you through creating your own Google Cloud OAuth
  credentials and importing them; no credentials are bundled with the app.
- Auto-update: the app checks for new releases, downloads them in the background
  and shows an "Update" icon in the top bar to restart and install.
- Sidebar navigation with a Settings screen (theme, run-in-background toggle,
  parallel uploads/renders, render resolution, and update preferences) and an
  About screen showing the version.

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
