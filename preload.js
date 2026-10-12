const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  authStatus: () => ipcRenderer.invoke("auth:status"),
  login: () => ipcRenderer.invoke("auth:login"),
  logout: () => ipcRenderer.invoke("auth:logout"),
  pickVideo: () => ipcRenderer.invoke("dialog:pickVideo"),
  upload: (payload) => ipcRenderer.invoke("upload:start", payload),
  cancelUpload: (id) => ipcRenderer.invoke("upload:cancel", id),
  listTemplates: () => ipcRenderer.invoke("templates:list"),
  saveTemplates: (list) => ipcRenderer.invoke("templates:save", list),
  getSettings: () => ipcRenderer.invoke("settings:get"),
  saveSettings: (changes) => ipcRenderer.invoke("settings:save", changes),
  onProgress: (cb) =>
    ipcRenderer.on("upload:progress", (_event, data) => cb(data)),
  onCancelled: (cb) =>
    ipcRenderer.on("upload:cancelled", (_event, data) => cb(data)),
});
