const { contextBridge, ipcRenderer, webUtils } = require("electron");

contextBridge.exposeInMainWorld("api", {
  getAppInfo: () => ipcRenderer.invoke("app:info"),
  getConfigInfo: () => ipcRenderer.invoke("config:info"),
  importCredentials: () => ipcRenderer.invoke("config:importSecrets"),
  openExternal: (url) => ipcRenderer.invoke("app:openExternal", url),
  getUpdateState: () => ipcRenderer.invoke("update:getState"),
  checkForUpdates: () => ipcRenderer.invoke("update:check"),
  installUpdate: () => ipcRenderer.invoke("update:install"),
  openRelease: () => ipcRenderer.invoke("update:openRelease"),
  onUpdateStatus: (cb) =>
    ipcRenderer.on("update:status", (_event, data) => cb(data)),
  authStatus: () => ipcRenderer.invoke("auth:status"),
  login: () => ipcRenderer.invoke("auth:login"),
  logout: () => ipcRenderer.invoke("auth:logout"),
  pickVideo: () => ipcRenderer.invoke("dialog:pickVideo"),
  pickThumbnail: () => ipcRenderer.invoke("dialog:pickThumbnail"),
  pickIntro: () => ipcRenderer.invoke("dialog:pickIntro"),
  getPathForFile: (file) => webUtils.getPathForFile(file),
  upload: (payload) => ipcRenderer.invoke("upload:start", payload),
  cancelUpload: (id) => ipcRenderer.invoke("upload:cancel", id),
  listTemplates: () => ipcRenderer.invoke("templates:list"),
  saveTemplates: (list) => ipcRenderer.invoke("templates:save", list),
  getAiConfig: () => ipcRenderer.invoke("ai:getConfig"),
  saveAiConfig: (changes) => ipcRenderer.invoke("ai:saveConfig", changes),
  listAiModels: () => ipcRenderer.invoke("ai:listModels"),
  generateDescription: (payload) =>
    ipcRenderer.invoke("ai:generateDescription", payload),
  testAi: () => ipcRenderer.invoke("ai:test"),
  getChannelInfo: () => ipcRenderer.invoke("ai:channelInfo"),
  listPlaylists: () => ipcRenderer.invoke("playlists:list"),
  generateThumbnail: (payload) =>
    ipcRenderer.invoke("thumbnails:generate", payload),
  listThumbnailTemplates: () => ipcRenderer.invoke("thumbnails:list"),
  saveThumbnailTemplates: (list) =>
    ipcRenderer.invoke("thumbnails:save", list),
  listThumbnailFonts: () => ipcRenderer.invoke("thumbnails:fonts"),
  listIntros: () => ipcRenderer.invoke("intros:list"),
  saveIntros: (list) => ipcRenderer.invoke("intros:save", list),
  renderVideo: (payload) => ipcRenderer.invoke("render:start", payload),
  cancelRender: (id) => ipcRenderer.invoke("render:cancel", id),
  onRenderProgress: (cb) =>
    ipcRenderer.on("render:progress", (_event, data) => cb(data)),
  onRenderState: (cb) =>
    ipcRenderer.on("render:state", (_event, data) => cb(data)),
  exportThumbnail: (payload) =>
    ipcRenderer.invoke("thumbnails:export", payload),
  getSettings: () => ipcRenderer.invoke("settings:get"),
  saveSettings: (changes) => ipcRenderer.invoke("settings:save", changes),
  onProgress: (cb) =>
    ipcRenderer.on("upload:progress", (_event, data) => cb(data)),
  onCancelled: (cb) =>
    ipcRenderer.on("upload:cancelled", (_event, data) => cb(data)),
});
