class GetAiConfigUseCase {
  constructor({ aiConfigStore }) {
    this.aiConfigStore = aiConfigStore;
  }

  execute() {
    return this.aiConfigStore.toPublic();
  }
}

module.exports = { GetAiConfigUseCase };
