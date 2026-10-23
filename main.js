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
  safeStorage,
} = require("electron");
const path = require("path");
const fs = require("fs");

const { YoutubeService } = require("./src/domain/services/YoutubeService");
const { TokenStore } = require("./src/domain/services/TokenStore");
const {
  ClientConfigStore,
} = require("./src/domain/services/ClientConfigStore");
const { TemplateStore } = require("./src/domain/services/TemplateStore");
const { SettingsStore } = require("./src/domain/services/SettingsStore");
const { AiConfigStore } = require("./src/domain/services/AiConfigStore");
const {
  DeepInfraService,
} = require("./src/domain/services/DeepInfraService");
const { SystemBrowser } = require("./src/domain/services/SystemBrowser");
const {
  AuthCallbackServer,
} = require("./src/domain/services/AuthCallbackServer");

const {
  AuthenticateUseCase,
} = require("./src/domain/useCases/AuthenticateUseCase");
const {
  CheckAuthStatusUseCase,
} = require("./src/domain/useCases/CheckAuthStatusUseCase");
const { LogoutUseCase } = require("./src/domain/useCases/LogoutUseCase");
const {
  UploadVideoUseCase,
} = require("./src/domain/useCases/UploadVideoUseCase");
const {
  ListTemplatesUseCase,
} = require("./src/domain/useCases/ListTemplatesUseCase");
const {
  SaveTemplatesUseCase,
} = require("./src/domain/useCases/SaveTemplatesUseCase");
const {
  GetAiConfigUseCase,
} = require("./src/domain/useCases/GetAiConfigUseCase");
const {
  SaveAiConfigUseCase,
} = require("./src/domain/useCases/SaveAiConfigUseCase");
const {
  ListAiModelsUseCase,
} = require("./src/domain/useCases/ListAiModelsUseCase");
const {
  GenerateDescriptionUseCase,
} = require("./src/domain/useCases/GenerateDescriptionUseCase");
const {
  GetChannelInfoUseCase,
} = require("./src/domain/useCases/GetChannelInfoUseCase");
const {
  GetSettingsUseCase,
} = require("./src/domain/useCases/GetSettingsUseCase");
const {
  SaveSettingsUseCase,
} = require("./src/domain/useCases/SaveSettingsUseCase");
const {
  ListPlaylistsUseCase,
} = require("./src/domain/useCases/ListPlaylistsUseCase");
const {
  GenerateThumbnailUseCase,
} = require("./src/domain/useCases/GenerateThumbnailUseCase");
const {
  ExportThumbnailUseCase,
} = require("./src/domain/useCases/ExportThumbnailUseCase");
const {
  ListThumbnailTemplatesUseCase,
} = require("./src/domain/useCases/ListThumbnailTemplatesUseCase");
const {
  SaveThumbnailTemplatesUseCase,
} = require("./src/domain/useCases/SaveThumbnailTemplatesUseCase");
const {
  ListThumbnailFontsUseCase,
} = require("./src/domain/useCases/ListThumbnailFontsUseCase");
const {
  ListIntrosUseCase,
} = require("./src/domain/useCases/ListIntrosUseCase");
const {
  SaveIntrosUseCase,
} = require("./src/domain/useCases/SaveIntrosUseCase");
const {
  RenderVideoUseCase,
} = require("./src/domain/useCases/RenderVideoUseCase");
const {
  ThumbnailRenderer,
} = require("./src/domain/services/ThumbnailRenderer");
const {
  ThumbnailTemplateStore,
} = require("./src/domain/services/ThumbnailTemplateStore");
const { IntroStore } = require("./src/domain/services/IntroStore");
const { VideoRenderer } = require("./src/domain/services/VideoRenderer");
const ffmpegPath = require("ffmpeg-static");
const ffprobePath = require("ffprobe-static").path;
const { autoUpdater } = require("electron-updater");
const { translate } = require("./src/messages");

function tr(key, params) {
  const language =
    currentSettings && currentSettings.language ? currentSettings.language : "en";
  return translate(language, key, params);
}

const { AuthController } = require("./src/controllers/AuthController");
const { UploadController } = require("./src/controllers/UploadController");
const {
  TemplateController,
} = require("./src/controllers/TemplateController");
const { AiController } = require("./src/controllers/AiController");
const {
  SettingsController,
} = require("./src/controllers/SettingsController");
const { PlaylistController } = require("./src/controllers/PlaylistController");
const {
  ThumbnailController,
} = require("./src/controllers/ThumbnailController");
const { IntroController } = require("./src/controllers/IntroController");
const { RenderController } = require("./src/controllers/RenderController");

const SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.force-ssl",
];
const FONTS_DIR = path.join(__dirname, "assets", "fonts");
const SECRETS_PATH = path.join(__dirname, "client_secrets.json");
const ICON_PATH = path.join(__dirname, "assets", "icon.png");
const ICO_PATH = path.join(__dirname, "assets", "icon.ico");

let mainWindow = null;
let tray = null;
let isQuitting = false;
let currentSettings = null;
let authController = null;
let uploadController = null;
let templateController = null;
let aiController = null;
let settingsController = null;
let playlistController = null;
let thumbnailController = null;
let introController = null;
let renderController = null;
let clientConfigStore = null;
let clientSecretsUserPath = null;

const activeUploads = new Map();
const uploadQueue = [];
const runningUploads = new Set();

function buildContainer() {
  const tokenStore = new TokenStore({
    filePath: path.join(app.getPath("userData"), "token.json"),
  });
  const templateStore = new TemplateStore({
    filePath: path.join(app.getPath("userData"), "templates.json"),
  });
  const settingsStore = new SettingsStore({
    filePath: path.join(app.getPath("userData"), "settings.json"),
  });
  clientSecretsUserPath = path.join(app.getPath("userData"), "client_secrets.json");
  clientConfigStore = new ClientConfigStore({
    paths: [SECRETS_PATH, clientSecretsUserPath],
  });
  const browser = new SystemBrowser({
    openExternal: (url) => shell.openExternal(url),
  });
  const youtubeService = new YoutubeService({
    tokenStore,
    clientConfigStore,
    scopes: SCOPES,
  });

  currentSettings = settingsStore.load();

  authController = new AuthController({
    checkAuthStatusUseCase: new CheckAuthStatusUseCase({ youtubeService }),
    authenticateUseCase: new AuthenticateUseCase({
      youtubeService,
      browser,
      createCallbackServer: () => new AuthCallbackServer(),
    }),
    logoutUseCase: new LogoutUseCase({ tokenStore }),
  });

  uploadController = new UploadController({
    uploadVideoUseCase: new UploadVideoUseCase({ youtubeService }),
  });

  templateController = new TemplateController({
    listTemplatesUseCase: new ListTemplatesUseCase({ templateStore }),
    saveTemplatesUseCase: new SaveTemplatesUseCase({ templateStore }),
  });

  const aiCipher = {
    isAvailable: () => safeStorage.isEncryptionAvailable(),
    encrypt: (value) => safeStorage.encryptString(value).toString("base64"),
    decrypt: (value) =>
      safeStorage.decryptString(Buffer.from(value, "base64")),
  };
  const aiConfigStore = new AiConfigStore({
    filePath: path.join(app.getPath("userData"), "ai-config.json"),
    cipher: aiCipher,
  });
  const deepInfraService = new DeepInfraService({
    getApiKey: () => aiConfigStore.getApiKey(),
  });

  aiController = new AiController({
    getAiConfigUseCase: new GetAiConfigUseCase({ aiConfigStore }),
    saveAiConfigUseCase: new SaveAiConfigUseCase({ aiConfigStore }),
    listAiModelsUseCase: new ListAiModelsUseCase({ deepInfraService }),
    generateDescriptionUseCase: new GenerateDescriptionUseCase({
      aiConfigStore,
      deepInfraService,
    }),
    getChannelInfoUseCase: new GetChannelInfoUseCase({ youtubeService }),
  });

  settingsController = new SettingsController({
    getSettingsUseCase: new GetSettingsUseCase({ settingsStore }),
    saveSettingsUseCase: new SaveSettingsUseCase({ settingsStore }),
  });

  playlistController = new PlaylistController({
    listPlaylistsUseCase: new ListPlaylistsUseCase({ youtubeService }),
  });

  const thumbnailRenderer = new ThumbnailRenderer({ fontsDir: FONTS_DIR });
  const thumbnailTemplateStore = new ThumbnailTemplateStore({
    filePath: path.join(app.getPath("userData"), "thumbnail-templates.json"),
  });
  thumbnailController = new ThumbnailController({
    generateThumbnailUseCase: new GenerateThumbnailUseCase({
      thumbnailRenderer,
      outputDir: path.join(app.getPath("userData"), "thumbnails"),
    }),
    exportThumbnailUseCase: new ExportThumbnailUseCase({
      thumbnailRenderer,
    }),
    listThumbnailTemplatesUseCase: new ListThumbnailTemplatesUseCase({
      thumbnailTemplateStore,
    }),
    saveThumbnailTemplatesUseCase: new SaveThumbnailTemplatesUseCase({
      thumbnailTemplateStore,
    }),
    listThumbnailFontsUseCase: new ListThumbnailFontsUseCase({
      thumbnailRenderer,
    }),
  });

  const introStore = new IntroStore({
    filePath: path.join(app.getPath("userData"), "intro-videos.json"),
  });
  introController = new IntroController({
    listIntrosUseCase: new ListIntrosUseCase({ introStore }),
    saveIntrosUseCase: new SaveIntrosUseCase({ introStore }),
  });

  const videoRenderer = new VideoRenderer({ ffmpegPath, ffprobePath });
  renderController = new RenderController({
    renderVideoUseCase: new RenderVideoUseCase({
      videoRenderer,
      settingsStore,
      outputDir: path.join(app.getPath("userData"), "renders"),
    }),
  });
}

/* ---------- Window ---------- */

function showWindow() {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 800,
    minWidth: 760,
    minHeight: 560,
    show: false,
    title: "OhMyChannel",
    icon: ICO_PATH,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.setMenuBarVisibility(false);

  if (!currentSettings || currentSettings.startMaximized) {
    mainWindow.maximize();
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.on("close", (event) => {
    if (!isQuitting && currentSettings && currentSettings.background) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
}

/* ---------- Notifications ---------- */

function notify(title, body) {
  if (Notification.isSupported()) {
    new Notification({ title, body, icon: ICO_PATH }).show();
  }
}

function notifyUploadFailed(message) {
  notify(tr("notify.uploadFailed.title"), message);
}

function notifyUploadDone(videoId) {
  if (!Notification.isSupported()) return;
  const url = `https://studio.youtube.com/video/${videoId}/edit`;
  const notification = new Notification({
    title: tr("notify.uploadComplete.title"),
    body: tr("notify.uploadComplete.body"),
    icon: ICO_PATH,
  });
  notification.on("click", () => {
    shell.openExternal(url);
    showWindow();
  });
  notification.show();
}

/* ---------- Tray ---------- */

function overallProgress() {
  let uploaded = 0;
  let total = 0;
  for (const entry of activeUploads.values()) {
    uploaded += entry.uploaded;
    total += entry.total;
  }
  return total ? Math.min(99, Math.floor((uploaded / total) * 100)) : 0;
}

function updateTray() {
  if (!tray) return;
  const count = activeUploads.size;
  const percent = overallProgress();
  const statusLabel = count
    ? tr("tray.uploading", { count, percent })
    : tr("tray.noUpload");

  tray.setToolTip(count ? `OhMyChannel - ${statusLabel}` : "OhMyChannel");

  const items = [
    { label: tr("tray.open"), click: showWindow },
    { type: "separator" },
    { label: statusLabel, enabled: false },
  ];
  if (count) {
    items.push({ label: tr("tray.cancelAll", { count }), click: cancelAllUploads });
  }
  items.push({ type: "separator" }, { label: tr("tray.quit"), click: quitApp });

  tray.setContextMenu(Menu.buildFromTemplate(items));
}

function cancelAllUploads() {
  const queued = uploadQueue.splice(0);
  const queuedIds = queued.map((job) => job.id);
  for (const job of queued) {
    job.reject(new Error("Upload canceled by user."));
  }

  const runningIds = [...runningUploads];
  uploadController.cancelAll();

  const ids = [...new Set([...queuedIds, ...runningIds])];
  for (const id of ids) activeUploads.delete(id);
  updateTray();

  if (mainWindow && !mainWindow.isDestroyed()) {
    for (const id of ids) {
      mainWindow.webContents.send("upload:cancelled", { id });
    }
  }
}

function quitApp() {
  isQuitting = true;
  uploadController.cancelAll();
  if (renderController) renderController.cancelAll();
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

/* ---------- Upload queue ---------- */

function processUploadQueue() {
  const limit = currentSettings ? currentSettings.maxParallel : 1;
  while (runningUploads.size < limit && uploadQueue.length > 0) {
    runUpload(uploadQueue.shift());
  }
}

function enqueueUpload(event, payload) {
  let total = 0;
  try {
    total = fs.statSync(payload.filePath).size;
  } catch {
    total = 0;
  }
  activeUploads.set(payload.id, { uploaded: 0, total, percent: 0 });
  updateTray();

  return new Promise((resolve, reject) => {
    uploadQueue.push({ ...payload, event, resolve, reject });
    processUploadQueue();
  });
}

async function runUpload(job) {
  const { id, event, resolve, reject } = job;
  runningUploads.add(id);
  updateTray();

  try {
    const data = await uploadController.start(job, (uploaded, total) => {
      const percent = total ? Math.floor((uploaded / total) * 100) : 0;
      const previous = activeUploads.get(id);
      activeUploads.set(id, { uploaded, total, percent });
      if (!previous || previous.percent !== percent) {
        updateTray();
        if (!event.sender.isDestroyed()) {
          event.sender.send("upload:progress", { id, uploaded, total, percent });
        }
      }
    });
    if (!isQuitting) notifyUploadDone(data.id);
    resolve(data);
  } catch (err) {
    if (!isQuitting && err.message !== "Upload canceled by user.") {
      notifyUploadFailed(err.message);
    }
    reject(err);
  } finally {
    runningUploads.delete(id);
    activeUploads.delete(id);
    updateTray();
    processUploadQueue();
  }
}

function cancelUpload(id) {
  const index = uploadQueue.findIndex((job) => job.id === id);
  if (index !== -1) {
    const [job] = uploadQueue.splice(index, 1);
    activeUploads.delete(id);
    updateTray();
    job.reject(new Error("Upload canceled by user."));
    return;
  }
  uploadController.cancel(id);
}

/* ---------- Render queue ---------- */

const renderQueue = [];
const runningRenders = new Set();

function sendRenderState(job, status, extra = {}) {
  const { event, id } = job;
  if (event && event.sender && !event.sender.isDestroyed()) {
    event.sender.send("render:state", { id, status, ...extra });
  }
}

function processRenderQueue() {
  const limit = currentSettings ? currentSettings.maxParallelRenders : 2;
  while (runningRenders.size < limit && renderQueue.length > 0) {
    runRender(renderQueue.shift());
  }
}

function enqueueRender(event, payload) {
  return new Promise((resolve, reject) => {
    const job = { ...payload, event, resolve, reject };
    renderQueue.push(job);
    sendRenderState(job, "queued", { position: renderQueue.length });
    processRenderQueue();
  });
}

async function runRender(job) {
  const { id, event, resolve, reject } = job;
  runningRenders.add(id);
  sendRenderState(job, "rendering");
  try {
    const data = await renderController.start(job, (rendered, total) => {
      const percent = total ? Math.floor((rendered / total) * 100) : 0;
      if (event && event.sender && !event.sender.isDestroyed()) {
        event.sender.send("render:progress", { id, rendered, total, percent });
      }
    });
    if (
      !isQuitting &&
      currentSettings &&
      !currentSettings.autoSubmitAfterRender
    ) {
      notify(tr("notify.renderComplete.title"), tr("notify.renderComplete.body"));
    }
    resolve(data);
  } catch (err) {
    reject(err);
  } finally {
    runningRenders.delete(id);
    processRenderQueue();
  }
}

function cancelRender(id) {
  const index = renderQueue.findIndex((job) => job.id === id);
  if (index !== -1) {
    const [job] = renderQueue.splice(index, 1);
    job.reject(new Error("Render canceled by user."));
    return;
  }
  renderController.cancel(id);
}

/* ---------- Auto update ---------- */

const RELEASES_URL = "https://github.com/gabrielSantosLima/OhMyChannel/releases";
const LATEST_RELEASE_API =
  "https://api.github.com/repos/gabrielSantosLima/OhMyChannel/releases/latest";
const UPDATE_INTERVAL_MS = 6 * 60 * 60 * 1000;

let updateState = {
  state: "idle",
  version: null,
  percent: 0,
  error: null,
  canInstall: false,
  manual: false,
};
let updateTimer = null;

function updaterSupported() {
  if (!app.isPackaged) return false;
  if (process.platform === "win32") return !process.env.PORTABLE_EXECUTABLE_DIR;
  if (process.platform === "linux") return !!process.env.APPIMAGE;
  return false;
}

function parseVersion(value) {
  return String(value || "")
    .replace(/^v/, "")
    .split("-")[0]
    .split(".")
    .map((part) => parseInt(part, 10) || 0);
}

function isNewerVersion(candidate, current) {
  const a = parseVersion(candidate);
  const b = parseVersion(current);
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const x = a[i] || 0;
    const y = b[i] || 0;
    if (x !== y) return x > y;
  }
  return false;
}

function sendUpdateState() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("update:status", updateState);
  }
}

function setUpdateState(patch) {
  updateState = { ...updateState, ...patch };
  sendUpdateState();
}

function applyUpdaterSettings() {
  if (!updaterSupported()) return;
  autoUpdater.autoDownload = currentSettings
    ? currentSettings.autoDownloadUpdates
    : true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease =
    (currentSettings ? currentSettings.allowPrerelease : false) ||
    app.getVersion().includes("-");
}

async function checkGithubLatest() {
  try {
    setUpdateState({ state: "checking", error: null });
    const response = await fetch(LATEST_RELEASE_API, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "OhMyChannel",
      },
    });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const data = await response.json();
    const latest = String(data.tag_name || "").replace(/^v/, "");
    if (latest && isNewerVersion(latest, app.getVersion())) {
      setUpdateState({
        state: "available",
        version: latest,
        manual: true,
        error: null,
      });
    } else {
      setUpdateState({ state: "idle", version: null, manual: true });
    }
  } catch (err) {
    setUpdateState({ state: "error", error: err.message, manual: true });
  }
}

async function runUpdateCheck() {
  if (updaterSupported()) {
    try {
      await autoUpdater.checkForUpdates();
    } catch (err) {
      setUpdateState({ state: "error", error: err.message });
    }
  } else if (app.isPackaged) {
    await checkGithubLatest();
  }
}

function setupUpdater() {
  const supported = updaterSupported();
  updateState = { ...updateState, manual: !supported };
  if (!app.isPackaged) return;

  if (supported) {
    applyUpdaterSettings();
    autoUpdater.on("checking-for-update", () =>
      setUpdateState({ state: "checking", error: null })
    );
    autoUpdater.on("update-available", (info) =>
      setUpdateState({ state: "available", version: info.version, error: null })
    );
    autoUpdater.on("update-not-available", () =>
      setUpdateState({
        state: "idle",
        version: null,
        percent: 0,
        error: null,
        canInstall: false,
      })
    );
    autoUpdater.on("download-progress", (progress) =>
      setUpdateState({
        state: "downloading",
        percent: Math.round(progress.percent || 0),
      })
    );
    autoUpdater.on("update-downloaded", (info) =>
      setUpdateState({
        state: "downloaded",
        version: info.version,
        percent: 100,
        canInstall: true,
      })
    );
    autoUpdater.on("error", (err) =>
      setUpdateState({ state: "error", error: err.message })
    );
  }

  if (!currentSettings || currentSettings.autoCheckUpdates) {
    runUpdateCheck();
  }
  updateTimer = setInterval(() => {
    if (!currentSettings || currentSettings.autoCheckUpdates) runUpdateCheck();
  }, UPDATE_INTERVAL_MS);
}

/* ---------- IPC ---------- */

function registerIpc() {
  ipcMain.handle("auth:status", () => authController.status());
  ipcMain.handle("auth:login", () => authController.login());
  ipcMain.handle("auth:logout", () => authController.logout());

  ipcMain.handle("templates:list", () => templateController.list());
  ipcMain.handle("templates:save", (_event, templates) =>
    templateController.save(templates)
  );

  ipcMain.handle("ai:getConfig", () => aiController.getConfig());
  ipcMain.handle("ai:saveConfig", (_event, changes) =>
    aiController.saveConfig(changes)
  );
  ipcMain.handle("ai:listModels", () => aiController.listModels());
  ipcMain.handle("ai:generateDescription", (_event, payload) =>
    aiController.generate(payload)
  );
  ipcMain.handle("ai:test", () => aiController.listModels());
  ipcMain.handle("ai:channelInfo", () => aiController.channelInfo());

  ipcMain.handle("app:info", () => ({
    name: "OhMyChannel",
    version: app.getVersion(),
  }));

  ipcMain.handle("config:info", () => ({
    hasCredentials: clientConfigStore ? clientConfigStore.hasCredentials() : false,
  }));

  ipcMain.handle("config:importSecrets", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Select client_secrets.json",
      properties: ["openFile"],
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (result.canceled || !result.filePaths.length) return { ok: false };
    const source = result.filePaths[0];
    try {
      JSON.parse(fs.readFileSync(source, "utf8"));
      fs.copyFileSync(source, clientSecretsUserPath);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle("app:openExternal", (_event, url) => {
    if (typeof url === "string" && /^https?:\/\//i.test(url)) {
      shell.openExternal(url);
    }
  });

  ipcMain.handle("update:getState", () => updateState);
  ipcMain.handle("update:check", async () => {
    await runUpdateCheck();
    return updateState;
  });
  ipcMain.handle("update:install", () => {
    if (app.isPackaged && updaterSupported()) autoUpdater.quitAndInstall();
  });
  ipcMain.handle("update:openRelease", () => {
    shell.openExternal(RELEASES_URL);
  });

  ipcMain.handle("settings:get", () => settingsController.get());
  ipcMain.handle("settings:save", async (_event, changes) => {
    const updated = await settingsController.save(changes);
    currentSettings = updated;
    applyUpdaterSettings();
    processUploadQueue();
    return updated;
  });

  ipcMain.handle("playlists:list", () => playlistController.list());

  ipcMain.handle("thumbnails:generate", (_event, payload) =>
    thumbnailController.generate(payload)
  );
  ipcMain.handle("thumbnails:list", () => thumbnailController.list());
  ipcMain.handle("thumbnails:save", (_event, templates) =>
    thumbnailController.save(templates)
  );
  ipcMain.handle("thumbnails:fonts", () => thumbnailController.fonts());

  ipcMain.handle("intros:list", () => introController.list());
  ipcMain.handle("intros:save", (_event, intros) =>
    introController.save(intros)
  );

  ipcMain.handle("thumbnails:export", async (_event, payload) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: tr("dialog.exportThumbnail"),
      defaultPath: `${(payload && payload.template && payload.template.name) || "thumbnail"}.png`,
      filters: [{ name: "PNG image", extensions: ["png"] }],
    });
    if (result.canceled || !result.filePath) return null;
    await thumbnailController.export({ ...payload, outputPath: result.filePath });
    shell.openPath(result.filePath);
    return result.filePath;
  });

  ipcMain.handle("dialog:pickVideo", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: tr("dialog.chooseVideos"),
      properties: ["openFile", "multiSelections"],
      filters: [
        { name: "Videos", extensions: ["mp4", "mkv", "mov", "avi", "webm"] },
      ],
    });
    if (result.canceled) return [];
    return result.filePaths;
  });

  ipcMain.handle("dialog:pickThumbnail", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: tr("dialog.chooseThumbnail"),
      properties: ["openFile"],
      filters: [
        { name: "Images", extensions: ["jpg", "jpeg", "png", "webp"] },
      ],
    });
    if (result.canceled || !result.filePaths.length) return null;
    return result.filePaths[0];
  });

  ipcMain.handle("dialog:pickIntro", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: tr("dialog.chooseIntro"),
      properties: ["openFile"],
      filters: [
        { name: "Videos", extensions: ["mp4", "mkv", "mov", "avi", "webm"] },
      ],
    });
    if (result.canceled || !result.filePaths.length) return null;
    return result.filePaths[0];
  });

  ipcMain.handle("upload:start", (event, payload) =>
    enqueueUpload(event, payload)
  );

  ipcMain.handle("upload:cancel", (_event, id) => {
    cancelUpload(id);
  });

  ipcMain.handle("render:start", (event, payload) =>
    enqueueRender(event, payload)
  );

  ipcMain.handle("render:cancel", (_event, id) => {
    cancelRender(id);
  });
}

/* ---------- Lifecycle ---------- */

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    showWindow();
  });

  app.whenReady().then(() => {
    app.setAppUserModelId("OhMyChannel");
    buildContainer();
    registerIpc();
    createWindow();
    createTray();
    setupUpdater();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
      else showWindow();
    });
  });
}

app.on("before-quit", () => {
  isQuitting = true;
});

app.on("window-all-closed", () => {
  app.quit();
});
