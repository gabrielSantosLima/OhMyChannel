class GetSettingsUseCase {
  constructor({ settingsStore }) {
    this.settingsStore = settingsStore;
  }

  async execute() {
    return this.settingsStore.load();
  }
}

module.exports = { GetSettingsUseCase };
