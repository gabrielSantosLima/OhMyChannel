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

const { YoutubeService } = require("./src/domain/services/YoutubeService");
const { TokenStore } = require("./src/domain/services/TokenStore");
const {
  ClientConfigStore,
} = require("./src/domain/services/ClientConfigStore");
const { TemplateStore } = require("./src/domain/services/TemplateStore");
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

const { AuthController } = require("./src/controllers/AuthController");
const { UploadController } = require("./src/controllers/UploadController");
const {
  TemplateController,
} = require("./src/controllers/TemplateController");

const SCOPES = ["https://www.googleapis.com/auth/youtube.upload"];
const SECRETS_PATH = path.join(__dirname, "client_secrets.json");
const ICON_PATH = path.join(__dirname, "assets", "icon.png");
const ICO_PATH = path.join(__dirname, "assets", "icon.ico");

let mainWindow = null;
let tray = null;
let isQuitting = false;
const activeUploads = new Map();
let authController = null;
let uploadController = null;
let templateController = null;

function buildContainer() {
  const tokenStore = new TokenStore({
    filePath: path.join(app.getPath("userData"), "token.json"),
  });
  const templateStore = new TemplateStore({
    filePath: path.join(app.getPath("userData"), "templates.json"),
  });
  const clientConfigStore = new ClientConfigStore({
    paths: [SECRETS_PATH, path.join(app.getPath("userData"), "client_secrets.json")],
  });
  const browser = new SystemBrowser({
    openExternal: (url) => shell.openExternal(url),
  });
  const youtubeService = new YoutubeService({
    tokenStore,
    clientConfigStore,
    scopes: SCOPES,
  });

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
    width: 760,
    height: 800,
    minWidth: 640,
    minHeight: 560,
    title: "OhMyChannel",
    icon: ICO_PATH,
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

/* ---------- Notifications ---------- */

function notify(title, body) {
  if (Notification.isSupported()) {
    new Notification({ title, body, icon: ICO_PATH }).show();
  }
}

function notifyUploadFailed(message) {
  notify("Upload failed", message);
}

function notifyUploadDone(videoId) {
  if (!Notification.isSupported()) return;
  const url = `https://studio.youtube.com/video/${videoId}/edit`;
  const notification = new Notification({
    title: "Upload complete",
    body: "Click to open YouTube Studio and finish the video details.",
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
    ? `Uploading ${count} video${count > 1 ? "s" : ""}: ${percent}%`
    : "No upload in progress";

  tray.setToolTip(count ? `OhMyChannel - ${statusLabel}` : "OhMyChannel");

  const items = [
    { label: "Open OhMyChannel", click: showWindow },
    { type: "separator" },
    { label: statusLabel, enabled: false },
  ];
  if (count) {
    items.push({ label: `Cancel all (${count})`, click: cancelAllUploads });
  }
  items.push({ type: "separator" }, { label: "Quit", click: quitApp });

  tray.setContextMenu(Menu.buildFromTemplate(items));
}

function cancelAllUploads() {
  const ids = [...activeUploads.keys()];
  uploadController.cancelAll();
  activeUploads.clear();
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

/* ---------- IPC ---------- */

function registerIpc() {
  ipcMain.handle("auth:status", () => authController.status());
  ipcMain.handle("auth:login", () => authController.login());
  ipcMain.handle("auth:logout", () => authController.logout());

  ipcMain.handle("templates:list", () => templateController.list());
  ipcMain.handle("templates:save", (_event, templates) =>
    templateController.save(templates)
  );

  ipcMain.handle("dialog:pickVideo", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Choose the videos",
      properties: ["openFile", "multiSelections"],
      filters: [
        { name: "Videos", extensions: ["mp4", "mkv", "mov", "avi", "webm"] },
      ],
    });
    if (result.canceled) return [];
    return result.filePaths;
  });

  ipcMain.handle("upload:start", async (event, payload) => {
    const { id } = payload;
    activeUploads.set(id, { uploaded: 0, total: 0, percent: 0 });
    updateTray();

    try {
      const data = await uploadController.start(payload, (uploaded, total) => {
        const percent = total ? Math.floor((uploaded / total) * 100) : 0;
        const previous = activeUploads.get(id);
        activeUploads.set(id, { uploaded, total, percent });
        if (!previous || previous.percent !== percent) {
          updateTray();
          if (!event.sender.isDestroyed()) {
            event.sender.send("upload:progress", {
              id,
              uploaded,
              total,
              percent,
            });
          }
        }
      });
      if (!isQuitting) notifyUploadDone(data.id);
      return data;
    } catch (err) {
      if (!isQuitting && err.message !== "Upload canceled by user.") {
        notifyUploadFailed(err.message);
      }
      throw err;
    } finally {
      activeUploads.delete(id);
      updateTray();
    }
  });

  ipcMain.handle("upload:cancel", (_event, id) => {
    uploadController.cancel(id);
    activeUploads.delete(id);
    updateTray();
  });
}

/* ---------- Lifecycle ---------- */

app.whenReady().then(() => {
  app.setAppUserModelId("OhMyChannel");
  buildContainer();
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
