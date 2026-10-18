# OhMyChannel demo

Recording harness that produces the demo GIF/WebP/MP4 for the README.

It drives the **real** renderer (`../renderer/index.html`) in a headless
browser with a mocked `window.api` (`mock-api.js`). No application code is
modified and no credentials or real files are used.

## Requirements

- Node.js (already required by the app).
- Playwright's Chromium (installed below).
- `ffmpeg-static` is resolved from the repository's `node_modules`.

## Usage

```bash
cd demo
npm install
npm run record
```

Output in `demo/out/`:

- `demo.webm` (raw recording)
- `demo.gif`, `demo.webp`, `demo.mp4`

To re-encode an existing recording:

```bash
node encode.js out/demo.webm
```

## What the demo shows

1. **Create an intro** with video/audio crossfade transitions and volume.
2. **Create a title template** (`{game} #{episode}`).
3. **Upload a video**: insert the template (inline parameter chips), pick the
   intro, and run the render → upload flow.

## Notes

- `mock-api.js` fakes every `window.api` method used by the renderer and
  simulates upload/render progress so the recording shows the intermediate
  states.
- Everything here is self-contained: the app's `package.json` and source files
  are untouched. This work lives on the `demo` branch.
- Large generated artifacts (`out/`) are git-ignored.
