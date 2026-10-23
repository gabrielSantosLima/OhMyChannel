const fs = require("fs");
const { AiConfig } = require("../entities/AiConfig");

class AiConfigStore {
  constructor({ filePath, cipher }) {
    this.filePath = filePath;
    this.cipher = cipher;
    this.sessionApiKey = null;
  }

  readRaw() {
    if (!fs.existsSync(this.filePath)) return {};
    try {
      const data = JSON.parse(fs.readFileSync(this.filePath, "utf8"));
      return data && typeof data === "object" ? data : {};
    } catch {
      return {};
    }
  }

  loadConfig() {
    return AiConfig.from(this.readRaw());
  }

  hasApiKey() {
    if (this.sessionApiKey) return true;
    const raw = this.readRaw();
    if (!raw.apiKey || !raw.apiKey.value) return false;
    if (!this.encryptionAvailable()) return false;
    return !!this.getApiKey();
  }

  encryptionAvailable() {
    return !!this.cipher && this.cipher.isAvailable();
  }

  getApiKey() {
    if (this.sessionApiKey) return this.sessionApiKey;
    const raw = this.readRaw();
    if (!raw.apiKey || !raw.apiKey.value) return null;
    if (!this.encryptionAvailable()) return null;
    try {
      return this.cipher.decrypt(raw.apiKey.value);
    } catch {
      return null;
    }
  }

  save({ config, apiKey, clearApiKey = false }) {
    const raw = this.readRaw();
    let storedKey = clearApiKey ? null : raw.apiKey || null;

    if (clearApiKey) {
      this.sessionApiKey = null;
    }

    if (apiKey !== undefined && apiKey !== null && String(apiKey).trim()) {
      const value = String(apiKey).trim();
      if (this.encryptionAvailable()) {
        storedKey = {
          encrypted: true,
          value: this.cipher.encrypt(value),
        };
        this.sessionApiKey = null;
      } else {
        storedKey = null;
        this.sessionApiKey = value;
      }
    }

    const payload = {
      provider: config.provider,
      model: config.model,
      channelUrl: config.channelUrl,
      channelName: config.channelName,
      template: config.template,
      apiKey: storedKey,
    };

    fs.writeFileSync(this.filePath, JSON.stringify(payload, null, 2));
    return this.loadConfig();
  }

  toPublic() {
    return this.loadConfig().toPublic({
      hasApiKey: this.hasApiKey(),
      encryptionAvailable: this.encryptionAvailable(),
    });
  }
}

module.exports = { AiConfigStore };
