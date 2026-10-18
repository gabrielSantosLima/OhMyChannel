const THEMES = ["dark", "light"];
const RESOLUTIONS = ["1920x1080", "2560x1440", "3840x2160"];
const LANGUAGES = ["en", "pt-BR"];
const DEFAULTS = {
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
  language: "en",
};
const MIN_PARALLEL = 1;
const MAX_PARALLEL = 10;

class AppSettings {
  constructor({
    theme,
    background,
    maxParallel,
    sidebarCollapsed,
    autoSubmitAfterRender,
    renderResolution,
    maxParallelRenders,
    autoCheckUpdates,
    autoDownloadUpdates,
    allowPrerelease,
    language,
  }) {
    this.theme = theme;
    this.background = background;
    this.maxParallel = maxParallel;
    this.sidebarCollapsed = sidebarCollapsed;
    this.autoSubmitAfterRender = autoSubmitAfterRender;
    this.renderResolution = renderResolution;
    this.maxParallelRenders = maxParallelRenders;
    this.autoCheckUpdates = autoCheckUpdates;
    this.autoDownloadUpdates = autoDownloadUpdates;
    this.allowPrerelease = allowPrerelease;
    this.language = language;
  }

  static from(input = {}) {
    const theme = THEMES.includes(input.theme) ? input.theme : DEFAULTS.theme;
    const background =
      input.background === undefined ? DEFAULTS.background : !!input.background;

    const clampParallel = (value, fallback) => {
      let parallel = Number(value);
      if (!Number.isFinite(parallel)) parallel = fallback;
      return Math.min(MAX_PARALLEL, Math.max(MIN_PARALLEL, Math.round(parallel)));
    };

    const bool = (value, fallback) =>
      value === undefined ? fallback : !!value;

    const autoSubmitAfterRender = bool(
      input.autoSubmitAfterRender,
      DEFAULTS.autoSubmitAfterRender
    );

    const renderResolution = RESOLUTIONS.includes(input.renderResolution)
      ? input.renderResolution
      : DEFAULTS.renderResolution;

    return new AppSettings({
      theme,
      background,
      maxParallel: clampParallel(input.maxParallel, DEFAULTS.maxParallel),
      sidebarCollapsed: !!input.sidebarCollapsed,
      autoSubmitAfterRender,
      renderResolution,
      maxParallelRenders: clampParallel(
        input.maxParallelRenders,
        DEFAULTS.maxParallelRenders
      ),
      autoCheckUpdates: bool(input.autoCheckUpdates, DEFAULTS.autoCheckUpdates),
      autoDownloadUpdates: bool(
        input.autoDownloadUpdates,
        DEFAULTS.autoDownloadUpdates
      ),
      allowPrerelease: bool(input.allowPrerelease, DEFAULTS.allowPrerelease),
      language: LANGUAGES.includes(input.language)
        ? input.language
        : DEFAULTS.language,
    });
  }

  static defaults() {
    return new AppSettings({ ...DEFAULTS });
  }
}

AppSettings.THEMES = THEMES;
AppSettings.RESOLUTIONS = RESOLUTIONS;
AppSettings.LANGUAGES = LANGUAGES;
AppSettings.DEFAULTS = DEFAULTS;

module.exports = { AppSettings };
