/*
 * Injected into the real renderer before renderer.js runs.
 * Full in-memory mock of window.api so the demo needs no Electron, no OAuth
 * and no real files. Interactive timings are simulated so the recording shows
 * progress states.
 */
(() => {
  const copy = (item) => JSON.parse(JSON.stringify(item));
  let templates = [
    {
      id: "tpl-gameplay",
      name: "gameplay",
      params: ["game", "episode"],
      pattern: "{game} #{episode}",
    },
  ];
  let thumbnailTemplates = [
    {
      id: "thumb-gameplay",
      name: "Gameplay",
      width: 1920,
      height: 1080,
      backgroundPath: null,
      parameters: [],
      elements: [
        {
          id: "el-1",
          type: "text",
          text: "GAMEPLAY",
          x: 80,
          y: 780,
          width: 1760,
          align: "left",
          fontFamily: "BBH Hegarty",
          fontWeight: 400,
          fontSize: 260,
          color: "#efe6d5",
          lineHeight: 1.1,
          letterSpacing: 0,
          strokeColor: "#000000",
          strokeWidth: 0,
          shadowColor: "#000000",
          shadowBlur: 12,
          shadowX: 0,
          shadowY: 8,
        },
      ],
    },
  ];
  let intros = [
    {
      id: "intro-gameplay",
      name: "Gameplay Intro",
      path: "C:/demo/intro.mp4",
      transition: {
        video: { effect: "crossfade", fadeIn: 0, fadeOut: 0, duration: 1 },
        audio: { effect: "crossfade", fadeIn: 0, fadeOut: 0, duration: 1 },
      },
      volume: 0.8,
    },
  ];
  const playlists = [
    { id: "pl-gameplay", title: "Gameplay", itemCount: 12 },
    { id: "pl-reviews", title: "Reviews", itemCount: 4 },
  ];
  const settings = {
    theme: "dark",
    background: true,
    maxParallel: 4,
    sidebarCollapsed: false,
    autoSubmitAfterRender: false,
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
      await delay(400);
      for (let percent = 0; percent <= 100; percent += 10) {
        if (handlers.progress) handlers.progress({ id, percent });
        await delay(300);
      }
      return { id: "abc123xyz", warnings: [] };
    },
    cancelUpload: async () => {},

    renderVideo: async (payload) => {
      const id = payload.id;
      if (handlers.renderState) handlers.renderState({ id, status: "queued" });
      await delay(700);
      if (handlers.renderState)
        handlers.renderState({ id, status: "rendering" });
      for (let percent = 0; percent <= 100; percent += 20) {
        if (handlers.renderProgress)
          handlers.renderProgress({ id, percent });
        await delay(300);
      }
      return { path: "C:/demo/rendered-ep12.mp4" };
    },
    cancelRender: async () => {},

    listTemplates: async () => templates.map(copy),
    saveTemplates: async (list) => {
      templates = list.map(copy);
      return templates.map(copy);
    },

    listPlaylists: async () => playlists,

    listThumbnailTemplates: async () => thumbnailTemplates.map(copy),
    saveThumbnailTemplates: async (list) => {
      thumbnailTemplates = list.map(copy);
      return thumbnailTemplates.map(copy);
    },
    listThumbnailFonts: async () => [
      { name: "BBH Hegarty", weights: [400] },
      { name: "Lato", weights: [400, 700] },
    ],
    generateThumbnail: async () =>
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC",
    exportThumbnail: async () => null,

    listIntros: async () => intros.map(copy),
    saveIntros: async (list) => {
      intros = list.map(copy);
      return intros.map(copy);
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
