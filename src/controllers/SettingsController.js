class SettingsController {
  constructor({ getSettingsUseCase, saveSettingsUseCase }) {
    this.getSettingsUseCase = getSettingsUseCase;
    this.saveSettingsUseCase = saveSettingsUseCase;
  }

  get() {
    return this.getSettingsUseCase.execute();
  }

  save(changes) {
    return this.saveSettingsUseCase.execute(changes);
  }
}

module.exports = { SettingsController };
