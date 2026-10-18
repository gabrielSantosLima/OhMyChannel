const fs = require("fs");

class ClientConfigStore {
  constructor({ paths }) {
    const envPath = process.env.OHMYCHANNEL_SECRETS;
    this.paths = envPath ? [envPath, ...paths] : [...paths];
  }

  load() {
    for (const filePath of this.paths) {
      if (fs.existsSync(filePath)) {
        const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
        const config = raw.installed || raw.web || raw;
        if (config.client_id && config.client_secret) {
          return {
            clientId: config.client_id,
            clientSecret: config.client_secret,
          };
        }
      }
    }
    throw new Error(
      "client_secrets.json not found. Import your credentials in the Setup screen."
    );
  }

  hasCredentials() {
    try {
      this.load();
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = { ClientConfigStore };
