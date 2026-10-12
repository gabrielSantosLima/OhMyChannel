const THEMES = ["dark", "light"];
const DEFAULTS = {
  theme: "dark",
  background: true,
  maxParallel: 4,
  sidebarCollapsed: false,
};
const MIN_PARALLEL = 1;
const MAX_PARALLEL = 10;

class AppSettings {
  constructor({ theme, background, maxParallel, sidebarCollapsed }) {
    this.theme = theme;
    this.background = background;
    this.maxParallel = maxParallel;
    this.sidebarCollapsed = sidebarCollapsed;
  }

  static from(input = {}) {
    const theme = THEMES.includes(input.theme) ? input.theme : DEFAULTS.theme;
    const background =
      input.background === undefined ? DEFAULTS.background : !!input.background;

    let maxParallel = Number(input.maxParallel);
    if (!Number.isFinite(maxParallel)) maxParallel = DEFAULTS.maxParallel;
    maxParallel = Math.min(
      MAX_PARALLEL,
      Math.max(MIN_PARALLEL, Math.round(maxParallel))
    );

    const sidebarCollapsed = !!input.sidebarCollapsed;

    return new AppSettings({
      theme,
      background,
      maxParallel,
      sidebarCollapsed,
    });
  }

  static defaults() {
    return new AppSettings({ ...DEFAULTS });
  }
}

AppSettings.THEMES = THEMES;
AppSettings.DEFAULTS = DEFAULTS;

module.exports = { AppSettings };
