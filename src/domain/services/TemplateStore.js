const fs = require("fs");

class TemplateStore {
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

  save(templates) {
    fs.writeFileSync(this.filePath, JSON.stringify(templates, null, 2));
  }
}

module.exports = { TemplateStore };
