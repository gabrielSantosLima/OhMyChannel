import { t } from "../lib/api.js";
import { useSettings } from "../contexts/SettingsContext.jsx";

function Setting({ title, desc, children }) {
  return (
    <div className="setting">
      <div className="setting-info">
        <span className="setting-title">{t(title)}</span>
        <span className="setting-desc">{t(desc)}</span>
      </div>
      {children}
    </div>
  );
}

function Switch({ checked, onChange }) {
  return (
    <label className="switch">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="slider" />
    </label>
  );
}

export function SettingsView({ active }) {
  const { settings, saveSettings } = useSettings();

  const change = (changes) => saveSettings(changes).catch(() => {});

  const changeLanguage = async (event) => {
    await saveSettings({ language: event.target.value });
    window.location.reload();
  };

  return (
    <section id="view-settings" className={"view" + (active ? " active" : "")}>
      <h2>{t("settings.title")}</h2>

      <Setting title="settings.theme.title" desc="settings.theme.desc">
        <div className="segmented">
          {["dark", "light"].map((theme) => (
            <button
              key={theme}
              type="button"
              className={
                "seg-btn" + (settings.theme === theme ? " active" : "")
              }
              onClick={() => change({ theme })}
            >
              {t(`settings.theme.${theme}`)}
            </button>
          ))}
        </div>
      </Setting>

      <Setting
        title="settings.background.title"
        desc="settings.background.desc"
      >
        <Switch
          checked={settings.background}
          onChange={(event) => change({ background: event.target.checked })}
        />
      </Setting>

      <Setting
        title="settings.startMaximized.title"
        desc="settings.startMaximized.desc"
      >
        <Switch
          checked={settings.startMaximized}
          onChange={(event) =>
            change({ startMaximized: event.target.checked })
          }
        />
      </Setting>

      <Setting
        title="settings.parallelUploads.title"
        desc="settings.parallelUploads.desc"
      >
        <input
          type="number"
          className="number-input"
          min="1"
          max="10"
          value={settings.maxParallel}
          onChange={(event) =>
            change({ maxParallel: Number(event.target.value) })
          }
        />
      </Setting>

      <Setting
        title="settings.parallelRenders.title"
        desc="settings.parallelRenders.desc"
      >
        <input
          type="number"
          className="number-input"
          min="1"
          max="10"
          value={settings.maxParallelRenders}
          onChange={(event) =>
            change({ maxParallelRenders: Number(event.target.value) })
          }
        />
      </Setting>

      <Setting
        title="settings.resolution.title"
        desc="settings.resolution.desc"
      >
        <select
          className="select-input"
          value={settings.renderResolution}
          onChange={(event) =>
            change({ renderResolution: event.target.value })
          }
        >
          <option value="1920x1080">1080p (1920x1080)</option>
          <option value="2560x1440">2K (2560x1440)</option>
          <option value="3840x2160">4K (3840x2160)</option>
        </select>
      </Setting>

      <Setting
        title="settings.autoSubmit.title"
        desc="settings.autoSubmit.desc"
      >
        <Switch
          checked={settings.autoSubmitAfterRender}
          onChange={(event) =>
            change({ autoSubmitAfterRender: event.target.checked })
          }
        />
      </Setting>

      <Setting
        title="settings.checkUpdates.title"
        desc="settings.checkUpdates.desc"
      >
        <Switch
          checked={settings.autoCheckUpdates}
          onChange={(event) =>
            change({ autoCheckUpdates: event.target.checked })
          }
        />
      </Setting>

      <Setting
        title="settings.downloadUpdates.title"
        desc="settings.downloadUpdates.desc"
      >
        <Switch
          checked={settings.autoDownloadUpdates}
          onChange={(event) =>
            change({ autoDownloadUpdates: event.target.checked })
          }
        />
      </Setting>

      <Setting
        title="settings.allowPrerelease.title"
        desc="settings.allowPrerelease.desc"
      >
        <Switch
          checked={settings.allowPrerelease}
          onChange={(event) =>
            change({ allowPrerelease: event.target.checked })
          }
        />
      </Setting>

      <Setting title="settings.language.title" desc="settings.language.desc">
        <select
          className="select-input"
          value={settings.language || "en"}
          onChange={changeLanguage}
        >
          <option value="en">English</option>
          <option value="pt-BR">Português (Brasil)</option>
        </select>
      </Setting>
    </section>
  );
}
