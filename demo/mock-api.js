/*
 * Injected into the real renderer before renderer.js runs.
 * Full in-memory mock of window.api so the demo needs no Electron, no OAuth
 * and no real files. Interactive timings are simulated so the recording shows
 * progress states.
 */
(() => {
  const templates = [];
  const thumbnailTemplates = [];
  const intros = [];
  const playlists = [
    { id: "pl-gameplay", title: "Gameplay", itemCount: 12 },
    { id: "pl-reviews", title: "Reviews", itemCount: 4 },
  ];
  const settings = {
    theme: "dark",
    background: true,
    maxParallel: 4,
    sidebarCollapsed: false,
    autoSubmitAfterRender: true,
    renderResolution: "2560x1440",
    maxParallelRenders: 2,
    autoCheckUpdates: true,
    autoDownloadUpdates: true,
    allowPrerelease: false,
  };

  const handlers = {
    progress: null,
    cancelled: null,
    renderProgress: null,
    renderState: null,
    update: null,
  };

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  window.api = {
    getAppInfo: async () => ({ name: "OhMyChannel", version: "0.0.1" }),
    getConfigInfo: async () => ({ hasCredentials: true }),
    importCredentials: async () => ({ ok: true }),
    openExternal: async () => {},
    getUpdateState: async () => ({
      state: "idle",
      version: null,
      percent: 0,
      error: null,
      manual: false,
    }),
    checkForUpdates: async () => ({ state: "idle" }),
    installUpdate: async () => {},
    openRelease: async () => {},
    onUpdateStatus: (cb) => {
      handlers.update = cb;
    },

    authStatus: async () => true,
    login: async () => true,
    logout: async () => {},

    pickVideo: async () => ["C:/demo/ep-12-gameplay.mp4"],
    pickThumbnail: async () => "C:/demo/thumb.png",
    pickIntro: async () => "C:/demo/intro.mp4",

    upload: async (payload) => {
      const id = payload.id;
      for (let percent = 0; percent <= 100; percent += 10) {
        if (handlers.progress) handlers.progress({ id, percent });
        await delay(180);
      }
      return { id: "abc123xyz", warnings: [] };
    },
    cancelUpload: async () => {},

    renderVideo: async (payload) => {
      const id = payload.id;
      if (handlers.renderState) handlers.renderState({ id, status: "queued" });
      await delay(600);
      if (handlers.renderState)
        handlers.renderState({ id, status: "rendering" });
      for (let percent = 0; percent <= 100; percent += 20) {
        if (handlers.renderProgress)
          handlers.renderProgress({ id, percent });
        await delay(220);
      }
      return { path: "C:/demo/rendered-ep12.mp4" };
    },
    cancelRender: async () => {},

    listTemplates: async () => templates,
    saveTemplates: async (list) => {
      templates.length = 0;
      templates.push(...list);
      return templates;
    },

    listPlaylists: async () => playlists,

    listThumbnailTemplates: async () => thumbnailTemplates,
    saveThumbnailTemplates: async (list) => {
      thumbnailTemplates.length = 0;
      thumbnailTemplates.push(...list);
      return thumbnailTemplates;
    },
    listThumbnailFonts: async () => [
      { name: "BBH Hegarty", weights: [400] },
      { name: "Lato", weights: [400, 700] },
    ],
    generateThumbnail: async () => "data:image/png;base64,iVBORw0KGgo=",
    exportThumbnail: async () => null,

    listIntros: async () => intros,
    saveIntros: async (list) => {
      intros.length = 0;
      intros.push(...list);
      return intros;
    },

    getSettings: async () => settings,
    saveSettings: async (changes) => {
      Object.assign(settings, changes);
      return settings;
    },

    onProgress: (cb) => {
      handlers.progress = cb;
    },
    onCancelled: (cb) => {
      handlers.cancelled = cb;
    },
    onRenderProgress: (cb) => {
      handlers.renderProgress = cb;
    },
    onRenderState: (cb) => {
      handlers.renderState = cb;
    },

    getPathForFile: () => "C:/demo/video.mp4",
  };

  window.__demo = {
    emitProgress: (id, percent) =>
      handlers.progress && handlers.progress({ id, percent }),
    emitCancelled: (id) =>
      handlers.cancelled && handlers.cancelled({ id }),
    emitRenderState: (id, status) =>
      handlers.renderState && handlers.renderState({ id, status }),
    emitRenderProgress: (id, percent) =>
      handlers.renderProgress && handlers.renderProgress({ id, percent }),
    emitUpdate: (data) => handlers.update && handlers.update(data),
  };
})();
