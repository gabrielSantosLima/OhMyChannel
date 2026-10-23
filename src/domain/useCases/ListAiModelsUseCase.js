class ListAiModelsUseCase {
  constructor({ deepInfraService }) {
    this.deepInfraService = deepInfraService;
  }

  execute() {
    return this.deepInfraService.listModels();
  }
}

module.exports = { ListAiModelsUseCase };
