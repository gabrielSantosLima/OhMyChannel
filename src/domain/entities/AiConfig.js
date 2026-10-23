const { AiDescriptionTemplate } = require("./AiDescriptionTemplate");

const PROVIDERS = ["deepinfra"];
const DEFAULT_MODEL = "";

class AiConfig {
  constructor({ provider, model, channelUrl, channelName, template }) {
    this.provider = provider;
    this.model = model;
    this.channelUrl = channelUrl;
    this.channelName = channelName;
    this.template = template;
  }

  static from(input = {}) {
    const provider = PROVIDERS.includes(input.provider)
      ? input.provider
      : PROVIDERS[0];

    const model = String(input.model || DEFAULT_MODEL).trim() || DEFAULT_MODEL;
    const channelUrl = String(input.channelUrl || "").trim();
    const channelName = String(input.channelName || "").trim();
    const template = String(
      input.template || AiDescriptionTemplate.defaultPattern
    ).trim();

    return new AiConfig({ provider, model, channelUrl, channelName, template });
  }

  static defaults() {
    return AiConfig.from({});
  }

  toPublic({ hasApiKey = false, encryptionAvailable = true } = {}) {
    return {
      provider: this.provider,
      model: this.model,
      channelUrl: this.channelUrl,
      channelName: this.channelName,
      template: this.template,
      hasApiKey,
      encryptionAvailable,
      defaultTemplate: AiDescriptionTemplate.defaultPattern,
      variables: AiDescriptionTemplate.variables,
    };
  }
}

AiConfig.PROVIDERS = PROVIDERS;
AiConfig.DEFAULT_MODEL = DEFAULT_MODEL;

module.exports = { AiConfig };
