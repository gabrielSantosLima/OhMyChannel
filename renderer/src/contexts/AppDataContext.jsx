import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api } from "../lib/api.js";
import { useSettings } from "./SettingsContext.jsx";

const DEFAULT_AI_CONFIG = {
  provider: "deepinfra",
  model: "",
  channelUrl: "",
  channelName: "",
  template: "",
  hasApiKey: false,
  encryptionAvailable: true,
  defaultTemplate: "",
  variables: [],
};

const DEFAULT_UPDATE_STATE = {
  state: "idle",
  version: null,
  percent: 0,
  error: null,
  canInstall: false,
};

const AppDataContext = createContext(null);

export function AppDataProvider({ children }) {
  const { ready: settingsReady } = useSettings();
  const [ready, setReady] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("loading.starting");
  const [appInfo, setAppInfo] = useState({ name: "OhMyChannel", version: "" });
  const [templates, setTemplates] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [aiConfig, setAiConfig] = useState(DEFAULT_AI_CONFIG);
  const [aiModels, setAiModels] = useState([]);
  const [aiChannel, setAiChannel] = useState(null);
  const [thumbnailTemplates, setThumbnailTemplates] = useState([]);
  const [thumbnailFonts, setThumbnailFonts] = useState([]);
  const [intros, setIntros] = useState([]);
  const [hasCredentials, setHasCredentials] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [updateState, setUpdateState] = useState(DEFAULT_UPDATE_STATE);

  useEffect(() => {
    if (!settingsReady) return;
    let cancelled = false;
    (async () => {
      setLoadingStatus("loading.starting");
      const info = await api.getAppInfo().catch(() => null);
      if (cancelled) return;
      if (info) setAppInfo(info);

      setLoadingStatus("loading.preparing");
      const [loadedTemplates, config, fonts, thumbTemplates, loadedIntros] =
        await Promise.all([
          api.listTemplates().catch(() => []),
          api.getAiConfig().catch(() => DEFAULT_AI_CONFIG),
          api.listThumbnailFonts().catch(() => []),
          api.listThumbnailTemplates().catch(() => []),
          api.listIntros().catch(() => []),
        ]);
      if (cancelled) return;
      setTemplates(loadedTemplates || []);
      setAiConfig({ ...DEFAULT_AI_CONFIG, ...(config || {}) });
      setThumbnailFonts(fonts || []);
      setThumbnailTemplates(thumbTemplates || []);
      setIntros(loadedIntros || []);

      setLoadingStatus("loading.account");
      const [configInfo, isAuthenticated, currentUpdate, channelInfo] =
        await Promise.all([
          api.getConfigInfo().catch(() => ({ hasCredentials: false })),
          api.authStatus().catch(() => false),
          api.getUpdateState().catch(() => DEFAULT_UPDATE_STATE),
          api.getChannelInfo().catch(() => null),
        ]);
      if (cancelled) return;
      setHasCredentials(Boolean(configInfo && configInfo.hasCredentials));
      setAuthenticated(Boolean(isAuthenticated));
      setUpdateState({ ...DEFAULT_UPDATE_STATE, ...(currentUpdate || {}) });
      setAiChannel(channelInfo);

      const loadedPlaylists = await api.listPlaylists().catch(() => []);
      if (cancelled) return;
      setPlaylists(loadedPlaylists || []);
      setLoadingStatus("loading.ready");
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [settingsReady]);

  useEffect(() => {
    api.onUpdateStatus((data) => {
      setUpdateState({ ...DEFAULT_UPDATE_STATE, ...(data || {}) });
    });
  }, []);

  const saveTemplates = useCallback(async (next) => {
    const saved = await api.saveTemplates(next);
    setTemplates(saved || []);
    return saved || [];
  }, []);

  const saveAiConfig = useCallback(async (changes) => {
    const saved = await api.saveAiConfig(changes);
    setAiConfig({ ...DEFAULT_AI_CONFIG, ...(saved || {}) });
    return saved;
  }, []);

  const saveIntros = useCallback(async (next) => {
    const saved = await api.saveIntros(next);
    setIntros(saved || []);
    return saved || [];
  }, []);

  const saveThumbnailTemplates = useCallback(async (next) => {
    const saved = await api.saveThumbnailTemplates(next);
    setThumbnailTemplates(saved || []);
    return saved || [];
  }, []);

  const refreshAuth = useCallback(async () => {
    try {
      const value = await api.authStatus();
      setAuthenticated(Boolean(value));
      return Boolean(value);
    } catch {
      setAuthenticated(false);
      return false;
    }
  }, []);

  const loadPlaylists = useCallback(async () => {
    const loaded = await api.listPlaylists().catch(() => []);
    setPlaylists(loaded || []);
    return loaded || [];
  }, []);

  const login = useCallback(async () => {
    await api.login();
    await refreshAuth();
    await loadPlaylists();
  }, [refreshAuth, loadPlaylists]);

  const logout = useCallback(async () => {
    await api.logout();
    await refreshAuth();
    setPlaylists([]);
  }, [refreshAuth]);

  const importCredentials = useCallback(async () => {
    const result = await api.importCredentials();
    if (!result || !result.ok) return result || { ok: false };
    setHasCredentials(true);
    await refreshAuth();
    return result;
  }, [refreshAuth]);

  const refreshChannelInfo = useCallback(async () => {
    const info = await api.getChannelInfo();
    setAiChannel(info);
    return info;
  }, []);

  const value = useMemo(
    () => ({
      ready,
      loadingStatus,
      appInfo,
      templates,
      setTemplates,
      saveTemplates,
      playlists,
      setPlaylists,
      loadPlaylists,
      aiConfig,
      setAiConfig,
      saveAiConfig,
      aiModels,
      setAiModels,
      aiChannel,
      setAiChannel,
      refreshChannelInfo,
      thumbnailTemplates,
      setThumbnailTemplates,
      saveThumbnailTemplates,
      thumbnailFonts,
      intros,
      setIntros,
      saveIntros,
      hasCredentials,
      setHasCredentials,
      authenticated,
      refreshAuth,
      login,
      logout,
      importCredentials,
      updateState,
    }),
    [
      ready,
      loadingStatus,
      appInfo,
      templates,
      saveTemplates,
      playlists,
      loadPlaylists,
      aiConfig,
      saveAiConfig,
      aiModels,
      aiChannel,
      refreshChannelInfo,
      thumbnailTemplates,
      saveThumbnailTemplates,
      thumbnailFonts,
      intros,
      saveIntros,
      hasCredentials,
      authenticated,
      refreshAuth,
      login,
      logout,
      importCredentials,
      updateState,
    ]
  );

  return (
    <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
  );
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) throw new Error("useAppData must be used inside AppDataProvider");
  return context;
}
