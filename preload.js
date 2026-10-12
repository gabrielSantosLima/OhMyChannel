const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  authStatus: () => ipcRenderer.invoke("auth:status"),
  login: () => ipcRenderer.invoke("auth:login"),
  logout: () => ipcRenderer.invoke("auth:logout"),
  pickVideo: () => ipcRenderer.invoke("dialog:pickVideo"),
  upload: (payload) => ipcRenderer.invoke("upload:start", payload),
  onProgress: (cb) =>
    ipcRenderer.on("upload:progress", (_event, data) => cb(data)),
  onCancelled: (cb) => ipcRenderer.on("upload:cancelled", () => cb()),
});
