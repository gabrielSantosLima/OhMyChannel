const { AiConfig } = require("../entities/AiConfig");
const {
  AiDescriptionTemplate,
} = require("../entities/AiDescriptionTemplate");

class SaveAiConfigUseCase {
  constructor({ aiConfigStore }) {
    this.aiConfigStore = aiConfigStore;
  }

  execute(changes = {}) {
    const config = AiConfig.from(changes);
    AiDescriptionTemplate.create({ pattern: config.template });
    this.aiConfigStore.save({
      config,
      apiKey: changes.apiKey,
      clearApiKey: !!changes.clearApiKey,
    });
    return this.aiConfigStore.toPublic();
  }
}

module.exports = { SaveAiConfigUseCase };
