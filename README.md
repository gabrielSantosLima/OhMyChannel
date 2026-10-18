# OhMyChannel

OhMyChannel is an Electron desktop app that pre-uploads videos to YouTube. You
only provide the title and description — the upload runs in the background with
live progress in the system tray, and when it finishes a notification lets you
jump straight to YouTube Studio to complete the remaining details.

It supports reusable text templates through the `/template` command, playlist
selection, scheduling the publish date, custom thumbnails, and generating
thumbnails from visual templates.

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
- Sidebar navigation with a Settings screen (dark/light theme, run-in-background
  toggle, number of parallel uploads) and an About screen showing the version.

## Getting started

```bash
npm install
npm start
```

Create an OAuth desktop client in the Google Cloud Console, enable the
**YouTube Data API v3**, and save the downloaded credentials as
`client_secrets.json` in the project root.

The app requests the following OAuth scopes:

- `https://www.googleapis.com/auth/youtube.upload`
- `https://www.googleapis.com/auth/youtube.force-ssl`

If you previously signed in with older scopes, sign out and sign in again to
grant the new ones (required for playlists).

## Templates

In the title or description field, type `/template` and pick a template.
Each parameter becomes an inline chip where you can type freely, including
spaces. Expanded values are sent to YouTube on upload.

## Thumbnails

Create reusable thumbnail templates in the **Thumbnails** screen:

- Upload a background image (e.g. exported from Figma).
- Add text elements with `{parameters}` and image elements.
- Mark each parameter as **dynamic** (asked per video) or **static** (fixed for
  every thumbnail).
- Drag elements to position them, right-click for actions, and export the result
  as PNG to preview it externally.

Fonts are loaded from `assets/fonts`. A default font (Lato) and BBH Hegarty ship
with the app; drop additional `.ttf`/`.otf` files there to use them.

## Architecture

Layered architecture with dependencies pointing inward
(controllers → use cases → services/entities). Domain code never depends on
Electron. `main.js` is the composition root (Electron lifecycle, tray,
notifications and IPC), and `preload.js` exposes a secure IPC bridge to the
renderer.

## Releasing

Releases are cut through the **manual** `Release` GitHub Action
(`.github/workflows/release.yml`, `workflow_dispatch`). It bumps the version in
`package.json`, generates release notes from the Conventional Commits since the
last tag (with commit references), commits `chore(release): v<version>`, pushes
a `v<version>` tag, and creates a GitHub Release. No build artifacts are
uploaded yet.

To generate release notes locally:

```bash
node scripts/release-notes.js
```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file
for details.
