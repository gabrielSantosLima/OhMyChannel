const fs = require("fs");
const { AppSettings } = require("../entities/AppSettings");

class SettingsStore {
  constructor({ filePath }) {
    this.filePath = filePath;
  }

  load() {
    if (!fs.existsSync(this.filePath)) return AppSettings.defaults();
    try {
      return AppSettings.from(JSON.parse(fs.readFileSync(this.filePath, "utf8")));
    } catch {
      return AppSettings.defaults();
    }
  }

  save(settings) {
    fs.writeFileSync(this.filePath, JSON.stringify(settings, null, 2));
  }
}

module.exports = { SettingsStore };
