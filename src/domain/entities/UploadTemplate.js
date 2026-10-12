const PARAM_PATTERN = /[^a-zA-Z0-9_]/g;

class UploadTemplate {
  constructor({ id, name, params = [], pattern }) {
    this.id = id;
    this.name = name;
    this.params = params;
    this.pattern = pattern;
  }

  expand(values = []) {
    let output = this.pattern;
    this.params.forEach((param, index) => {
      output = output.split(`{${param}}`).join(values[index] ?? "");
    });
    return output;
  }

  static create({ id, name, params = [], pattern }) {
    const cleanName = String(name || "").trim().replace(/\s+/g, "");
    const cleanParams = (params || [])
      .map((param) => String(param).trim().replace(PARAM_PATTERN, ""))
      .filter(Boolean);
    const cleanPattern = String(pattern || "").trim();

    if (!cleanName) throw new Error("Template name is required.");
    if (!cleanPattern) throw new Error("Template pattern is required.");
    for (const param of cleanParams) {
      if (!cleanPattern.includes(`{${param}}`)) {
        throw new Error(`Pattern does not use parameter {${param}}.`);
      }
    }

    return new UploadTemplate({
      id: id || Date.now().toString(36),
      name: cleanName,
      params: cleanParams,
      pattern: cleanPattern,
    });
  }
}

module.exports = { UploadTemplate };
