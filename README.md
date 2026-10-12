# OhMyChannel

OhMyChannel is an Electron desktop app that pre-uploads videos to YouTube.
You only provide the title and description — the upload runs in the background
with live progress in the system tray, and when it finishes a notification lets
you jump straight to YouTube Studio to complete the remaining details. It also
supports reusable text templates through the `/template` command in the title
and description fields.

## Features

- Sign in with Google (OAuth) and upload videos to YouTube.
- Fill in only the title and description; finish the rest in YouTube Studio.
- Keep uploading in the background with progress shown in the system tray.
- Reusable title/description templates with the `/template <name> <params...>`
  command and autocomplete.
- Dark and light themes.

## Getting started

```bash
npm install
npm start
```

Create an OAuth desktop client in the Google Cloud Console, enable the
YouTube Data API v3, and save the downloaded credentials as
`client_secrets.json` in the project root.

# License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file
for details.
