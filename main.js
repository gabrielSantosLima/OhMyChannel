const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  Notification,
  nativeImage,
  ipcMain,
  dialog,
  shell,
} = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");
const { Transform } = require("stream");
const { google } = require("googleapis");

const SCOPES = ["https://www.googleapis.com/auth/youtube.upload"];
const SECRETS_PATH = path.join(__dirname, "client_secrets.json");
const ICON_PATH = path.join(__dirname, "assets", "icon.png");
const CATEGORY_ID = "20";
const PRIVACY_STATUS = "private";

let mainWindow = null;
let tray = null;
let tokenPath = null;
let isQuitting = false;
let activeUpload = null;
let cancelRequested = false;
let uploadState = { active: false, percent: 0 };

function loadClientConfig() {
  const candidates = [
    SECRETS_PATH,
    path.join(app.getPath("userData"), "client_secrets.json"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      const raw = JSON.parse(fs.readFileSync(candidate, "utf8"));
      const conf = raw.installed || raw.web || raw;
      if (conf.client_id && conf.client_secret) {
        return { clientId: conf.client_id, clientSecret: conf.client_secret };
      }
    }
  }
  throw new Error(
    "client_secrets.json nao encontrado. Coloque o arquivo na pasta do app."
  );
}

function saveTokens(tokens) {
  fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));
}

function loadTokens() {
  if (fs.existsSync(tokenPath)) {
    try {
      return JSON.parse(fs.readFileSync(tokenPath, "utf8"));
    } catch {
      return null;
    }
  }
  return null;
}

function createOAuthClient() {
  const { clientId, clientSecret } = loadClientConfig();
  const client = new google.auth.OAuth2(clientId, clientSecret);
  const tokens = loadTokens();
  if (tokens) client.setCredentials(tokens);
  client.on("tokens", (newTokens) => {
    saveTokens({ ...(loadTokens() || {}), ...newTokens });
  });
  return client;
}

async function isAuthenticated() {
  if (!loadTokens()) return false;
  const client = createOAuthClient();
  try {
    await client.getAccessToken();
    return true;
  } catch {
    return false;
  }
}

async function login() {
  const { clientId, clientSecret } = loadClientConfig();
  const server = http.createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const redirectUri = `http://127.0.0.1:${port}`;

  const client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  const authUrl = client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });

  const codePromise = new Promise((resolve, reject) => {
    server.on("request", (req, res) => {
      const url = new URL(req.url, redirectUri);
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(
        "<h2>Autorizacao concluida. Feche esta aba e volte ao app.</h2>"
      );
      if (error) reject(new Error(error));
      else if (code) resolve(code);
    });
  });

  await shell.openExternal(authUrl);
  const code = await codePromise;
  server.close();

  const { tokens } = await client.getToken(code);
  saveTokens(tokens);
  return true;
}

async function upload({ filePath, title, description }, onProgress) {
  const client = createOAuthClient();
  if (!loadTokens()) throw new Error("Nao autenticado.");
  if (!fs.existsSync(filePath)) throw new Error("Arquivo nao encontrado.");

  const youtube = google.youtube({ version: "v3", auth: client });
  const total = fs.statSync(filePath).size;
  let uploaded = 0;
  cancelRequested = false;

  const source = fs.createReadStream(filePath);
  const counter = new Transform({
    transform(chunk, _enc, cb) {
      if (activeUpload && activeUpload.cancelled) {
        cb(new Error("Upload cancelado pelo usuario."));
        return;
      }
      uploaded += chunk.length;
      onProgress(uploaded, total);
      cb(null, chunk);
    },
  });
  source.pipe(counter);

  activeUpload = { source, counter, cancelled: false };

  try {
    const response = await youtube.videos.insert({
      part: ["snippet", "status"],
      requestBody: {
        snippet: {
          title: title.slice(0, 100),
          description: description.slice(0, 5000),
          categoryId: CATEGORY_ID,
        },
        status: {
          privacyStatus: PRIVACY_STATUS,
          selfDeclaredMadeForKids: false,
        },
      },
      media: { body: counter },
    });
    return response.data;
  } finally {
    activeUpload = null;
  }
}

function cancelUpload() {
  if (activeUpload) {
    cancelRequested = true;
    activeUpload.cancelled = true;
    activeUpload.source.destroy();
    activeUpload.counter.destroy();
    activeUpload = null;
  }
}

function showWindow() {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function notify(title, body) {
  if (Notification.isSupported()) {
    new Notification({ title, body, icon: ICON_PATH }).show();
  }
}

function updateTray() {
  if (!tray) return;
  const statusLabel = uploadState.active
    ? `Enviando: ${uploadState.percent}%`
    : "Nenhum upload em andamento";

  tray.setToolTip(
    uploadState.active
      ? `OhMyChannel - Enviando ${uploadState.percent}%`
      : "OhMyChannel"
  );

  const items = [
    { label: "Abrir OhMyChannel", click: showWindow },
    { type: "separator" },
    { label: statusLabel, enabled: false },
  ];
  if (uploadState.active) {
    items.push({ label: "Cancelar upload", click: cancelActiveUpload });
  }
  items.push(
    { type: "separator" },
    { label: "Sair", click: quitApp }
  );

  tray.setContextMenu(Menu.buildFromTemplate(items));
}

function cancelActiveUpload() {
  cancelUpload();
  uploadState = { active: false, percent: 0 };
  updateTray();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("upload:cancelled");
  }
}

function quitApp() {
  isQuitting = true;
  cancelUpload();
  if (tray) {
    tray.destroy();
    tray = null;
  }
  app.quit();
}

function createTray() {
  const image = nativeImage.createFromPath(ICON_PATH);
  tray = new Tray(image.resize({ width: 16, height: 16 }));
  tray.setToolTip("OhMyChannel");
  tray.on("click", showWindow);
  tray.on("double-click", showWindow);
  updateTray();
}

function registerIpc() {
  ipcMain.handle("auth:status", () => isAuthenticated());
  ipcMain.handle("auth:login", () => login());
  ipcMain.handle("auth:logout", () => {
    if (fs.existsSync(tokenPath)) fs.unlinkSync(tokenPath);
    return true;
  });
  ipcMain.handle("dialog:pickVideo", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Escolha o video",
      properties: ["openFile"],
      filters: [
        { name: "Videos", extensions: ["mp4", "mkv", "mov", "avi", "webm"] },
      ],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });
  ipcMain.handle("upload:start", async (event, payload) => {
    if (uploadState.active) throw new Error("Ja existe um upload em andamento.");

    uploadState = { active: true, percent: 0 };
    updateTray();

    try {
      return await upload(payload, (uploaded, total) => {
        const percent = total ? Math.floor((uploaded / total) * 100) : 0;
        if (percent !== uploadState.percent) {
          uploadState.percent = percent;
          updateTray();
        }
        if (!event.sender.isDestroyed()) {
          event.sender.send("upload:progress", { uploaded, total, percent });
        }
      });
    } catch (err) {
      if (!isQuitting && !cancelRequested) {
        notify("Falha no upload", err.message);
      }
      throw err;
    } finally {
      uploadState = { active: false, percent: 0 };
      updateTray();
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 680,
    height: 640,
    resizable: false,
    title: "OhMyChannel",
    icon: ICON_PATH,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.setMenuBarVisibility(false);

  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
}

app.whenReady().then(() => {
  tokenPath = path.join(app.getPath("userData"), "token.json");
  registerIpc();
  createWindow();
  createTray();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else showWindow();
  });
});

app.on("before-quit", () => {
  isQuitting = true;
});

app.on("window-all-closed", () => {
  if (isQuitting) app.quit();
});
