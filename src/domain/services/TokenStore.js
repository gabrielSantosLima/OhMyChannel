const fs = require("fs");

class TokenStore {
  constructor({ filePath }) {
    this.filePath = filePath;
  }

  load() {
    if (!fs.existsSync(this.filePath)) return null;
    try {
      return JSON.parse(fs.readFileSync(this.filePath, "utf8"));
    } catch {
      return null;
    }
  }

  save(tokens) {
    fs.writeFileSync(this.filePath, JSON.stringify(tokens, null, 2));
  }

  merge(tokens) {
    this.save({ ...(this.load() || {}), ...tokens });
  }

  clear() {
    if (fs.existsSync(this.filePath)) fs.unlinkSync(this.filePath);
  }
}

module.exports = { TokenStore };
