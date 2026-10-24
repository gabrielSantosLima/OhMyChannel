import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api } from "../lib/api.js";

const DEFAULTS = {
  theme: "dark",
  background: true,
  startMaximized: true,
  maxParallel: 4,
  sidebarCollapsed: false,
  autoSubmitAfterRender: true,
  renderResolution: "2560x1440",
  maxParallelRenders: 2,
  autoCheckUpdates: true,
  autoDownloadUpdates: true,
  allowPrerelease: false,
  language: "en",
};

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let loaded = DEFAULTS;
      try {
        loaded = { ...DEFAULTS, ...(await api.getSettings()) };
      } catch {
        /* keep defaults */
      }
      if (cancelled) return;
      setSettings(loaded);
      window.i18n.setLocale(loaded.language || "en");
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", settings.theme);
  }, [settings.theme]);

  const saveSettings = useCallback(async (changes) => {
    const next = await api.saveSettings(changes);
    setSettings((current) => ({ ...current, ...next }));
    return next;
  }, []);

  const toggleSidebar = useCallback(() => {
    setSettings((current) => {
      const next = { ...current, sidebarCollapsed: !current.sidebarCollapsed };
      api.saveSettings({ sidebarCollapsed: next.sidebarCollapsed }).catch(
        () => {}
      );
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ settings, ready, saveSettings, toggleSidebar }),
    [settings, ready, saveSettings, toggleSidebar]
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings must be used inside SettingsProvider");
  return context;
}
