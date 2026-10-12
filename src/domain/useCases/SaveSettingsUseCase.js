const { AppSettings } = require("../entities/AppSettings");

class SaveSettingsUseCase {
  constructor({ settingsStore }) {
    this.settingsStore = settingsStore;
  }

  async execute(changes) {
    const current = this.settingsStore.load();
    const merged = AppSettings.from({ ...current, ...changes });
    this.settingsStore.save(merged);
    return merged;
  }
}

module.exports = { SaveSettingsUseCase };
