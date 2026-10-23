class AiController {
  constructor({
    getAiConfigUseCase,
    saveAiConfigUseCase,
    listAiModelsUseCase,
    generateDescriptionUseCase,
    getChannelInfoUseCase,
  }) {
    this.getAiConfigUseCase = getAiConfigUseCase;
    this.saveAiConfigUseCase = saveAiConfigUseCase;
    this.listAiModelsUseCase = listAiModelsUseCase;
    this.generateDescriptionUseCase = generateDescriptionUseCase;
    this.getChannelInfoUseCase = getChannelInfoUseCase;
  }

  getConfig() {
    return this.getAiConfigUseCase.execute();
  }

  saveConfig(changes) {
    return this.saveAiConfigUseCase.execute(changes);
  }

  listModels() {
    return this.listAiModelsUseCase.execute();
  }

  generate(payload) {
    return this.generateDescriptionUseCase.execute(payload);
  }

  channelInfo() {
    return this.getChannelInfoUseCase.execute();
  }
}

module.exports = { AiController };
