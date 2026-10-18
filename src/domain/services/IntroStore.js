const fs = require("fs");

class IntroStore {
  constructor({ filePath }) {
    this.filePath = filePath;
  }

  load() {
    if (!fs.existsSync(this.filePath)) return [];
    try {
      return JSON.parse(fs.readFileSync(this.filePath, "utf8"));
    } catch {
      return [];
    }
  }

  save(intros) {
    fs.writeFileSync(this.filePath, JSON.stringify(intros, null, 2));
  }
}

module.exports = { IntroStore };
