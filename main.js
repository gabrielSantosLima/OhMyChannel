const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");
const { Transform } = require("stream");
const { google } = require("googleapis");

const SCOPES = ["https://www.googleapis.com/auth/youtube.upload"];
const SECRETS_PATH = path.join(__dirname, "client_secrets.json");
const CATEGORY_ID = "20";
const PRIVACY_STATUS = "private";

let mainWindow = null;
let tokenPath = null;

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

  const counter = new Transform({
    transform(chunk, _enc, cb) {
      uploaded += chunk.length;
      onProgress(uploaded, total);
      cb(null, chunk);
    },
  });

  const source = fs.createReadStream(filePath);
  source.pipe(counter);

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
    return upload(payload, (uploaded, total) => {
      const percent = total ? Math.floor((uploaded / total) * 100) : 0;
      event.sender.send("upload:progress", { uploaded, total, percent });
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 680,
    height: 640,
    resizable: false,
    title: "OhMyChannel",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
}

app.whenReady().then(() => {
  tokenPath = path.join(app.getPath("userData"), "token.json");
  registerIpc();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
