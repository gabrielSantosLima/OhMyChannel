# AGENTS.md

Guide for contributors and AI agents working on **OhMyChannel**.

## Project overview

OhMyChannel is an Electron desktop application that pre-uploads videos to
YouTube. The user only fills in the title and description; everything else is
finished later in the YouTube Studio dashboard. It supports system-tray
background uploads and reusable text templates via the `/template` command.

## Language rules

- All code, identifiers, comments, commit messages, UI labels and user-facing
  strings MUST be written in English.
- Keep commit messages short and follow Conventional Commits
  (`feat: ...`, `fix: ...`, `refactor: ...`, `chore: ...`).

## Architecture

The application follows a clean, layered architecture. Dependencies always
point inward: **controllers -> use cases -> services/entities**. Domain code
must never depend on Electron or on the presentation layer.

```
src/
  domain/
    entities/    Application entities (plain data + behavior)
    services/    External access: APIs, storage, OS integration
    useCases/    One class per use case, with an `execute` method
  controllers/   Orchestrate use cases and are called by adapters (IPC)
renderer/         Presentation layer (plain HTML/CSS/JS)
main.js           Composition root (Electron lifecycle + dependency wiring)
preload.js        Secure IPC bridge exposed to the renderer
```

### `domain/entities`

Pure entities with no external dependencies.

- Examples: `VideoMetadata`, `UploadTemplate`.
- Rules:
  - Plain data plus domain behavior (e.g. `VideoMetadata.fromInput`,
    `UploadTemplate.expand`).
  - May throw domain errors and validate their own invariants.
  - No imports from `services`, `useCases`, `controllers`, Node built-ins that
    perform I/O, or Electron.

### `domain/services`

Implementations that talk to the outside world.

- Examples: `YoutubeService` (Google API), `TokenStore` and `TemplateStore`
  (persistence), `SystemBrowser` (opens URLs), `AuthCallbackServer` (loopback
  HTTP server), `ClientConfigStore` (reads credentials).
- Rules:
  - One responsibility per service.
  - Receive configuration and collaborators through the constructor.
  - Never import `useCases` or `controllers`.
  - Hide external details (SDK calls, file paths, HTTP) behind small methods.

### `domain/useCases`

The application's business actions. One file, one class, one action.

- Every use case exposes an `execute(...)` method (async when needed).
- All dependencies are injected through the constructor.
- A use case orchestrates entities and services but contains no I/O of its own.
- Examples:
  - `AuthenticateUseCase` - runs the OAuth flow.
  - `CheckAuthStatusUseCase` - reports whether the user is authenticated.
  - `LogoutUseCase` - clears stored credentials.
  - `UploadVideoUseCase` - uploads a video and supports cancellation.
  - `ListTemplatesUseCase` / `SaveTemplatesUseCase` - template persistence.

```js
class ExampleUseCase {
  constructor({ someService }) {
    this.someService = someService;
  }

  async execute(input) {
    // orchestrate entities + services
  }
}

module.exports = { ExampleUseCase };
```

### `controllers`

Adapters between the outside world (IPC) and the use cases.

- A controller receives its use cases through the constructor and exposes thin
  methods that delegate to `useCase.execute(...)`.
- Controllers contain no business logic.
- Examples: `AuthController`, `UploadController`, `TemplateController`.

### Composition root (`main.js`)

`main.js` is the only place where concrete implementations are instantiated and
wired together (the "container"). It also owns the Electron lifecycle, the
system tray, notifications and IPC registration.

- Register IPC handlers that simply delegate to a controller.
- Keep Electron-specific concerns (windows, tray, dialogs, notifications) here.

## How to add a feature

1. Model the data as an entity in `src/domain/entities` if needed.
2. Add or extend a service in `src/domain/services` for any external access.
3. Create a use case in `src/domain/useCases` with `execute` and constructor
   injection.
4. Expose it through a controller in `src/controllers`.
5. Wire it in `main.js` and add the corresponding IPC handler + `preload.js`
   method.
6. Update the renderer UI (all labels in English).

## Adding an IPC channel

1. Add a method to the relevant controller.
2. Register `ipcMain.handle("<channel>", ...)` in `main.js`.
3. Expose it in `preload.js` via `contextBridge`.
4. Consume it in `renderer/renderer.js`.

## Templates and the `/template` command

- Templates are entities (`UploadTemplate`) persisted through `TemplateStore`.
- The command format is `/template <name> <param1> <param2> ...`.
- Expansion of the command into final text happens in the renderer for live
  preview, and the expanded values are sent to the backend on upload.

## Running

```bash
npm install
npm start
```

Requires a `client_secrets.json` (OAuth desktop client) in the project root.

## Testing checklist

- `node --check` every JavaScript file.
- Launch the app and verify login, template CRUD, `/template` autocomplete in
  both title and description, background upload with tray progress, and the
  completion notification opening YouTube Studio.
