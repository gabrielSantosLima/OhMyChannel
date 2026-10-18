const DEFAULT_WIDTH = 1920;
const DEFAULT_HEIGHT = 1080;
const DEFAULT_FONT = "BBH Hegarty";
const ALIGNMENTS = ["left", "center", "right"];

let elementSeed = 0;

function newElementId() {
  elementSeed += 1;
  return `el-${Date.now().toString(36)}-${elementSeed}`;
}

class ThumbnailTemplate {
  constructor({
    id,
    name,
    width = DEFAULT_WIDTH,
    height = DEFAULT_HEIGHT,
    backgroundPath = null,
    parameters = [],
    elements = [],
  }) {
    this.id = id;
    this.name = name;
    this.width = width;
    this.height = height;
    this.backgroundPath = backgroundPath;
    this.parameters = parameters;
    this.elements = elements;
  }

  static create({
    id,
    name,
    width,
    height,
    backgroundPath,
    parameters,
    elements,
    layers,
  }) {
    const cleanName = String(name || "").trim();
    if (!cleanName) throw new Error("Thumbnail template name is required.");

    const rawElements = elements || layers || [];

    return new ThumbnailTemplate({
      id: id || Date.now().toString(36),
      name: cleanName,
      width: Number(width) || DEFAULT_WIDTH,
      height: Number(height) || DEFAULT_HEIGHT,
      backgroundPath: backgroundPath || null,
      parameters: (parameters || [])
        .map((param) => ThumbnailTemplate.normalizeParameter(param))
        .filter((param) => param.key),
      elements: rawElements.map((element) =>
        ThumbnailTemplate.normalizeElement(element)
      ),
    });
  }

  static normalizeElement(element = {}) {
    const type = element.type === "image" ? "image" : "text";
    const base = {
      id: element.id || newElementId(),
      type,
      x: Number(element.x) || 0,
      y: Number(element.y) || 0,
      width: Number(element.width) || 0,
    };

    if (type === "image") {
      return {
        ...base,
        src: element.src ? String(element.src) : null,
        height: Number(element.height) || 0,
        opacity:
          element.opacity != null ? Number(element.opacity) : 1,
      };
    }

    return {
      ...base,
      text: String(element.text ?? ""),
      fontFamily: String(element.fontFamily || DEFAULT_FONT),
      fontWeight: Number(element.fontWeight) || 400,
      fontSize: Number(element.fontSize) || 96,
      color: String(element.color || "#ffffff"),
      align: ALIGNMENTS.includes(element.align) ? element.align : "left",
      lineHeight:
        element.lineHeight != null ? Number(element.lineHeight) : 1.1,
      letterSpacing:
        element.letterSpacing != null ? Number(element.letterSpacing) : 0,
      strokeColor: element.strokeColor ? String(element.strokeColor) : null,
      strokeWidth: Number(element.strokeWidth) || 0,
      shadowColor: element.shadowColor ? String(element.shadowColor) : null,
      shadowBlur: Number(element.shadowBlur) || 0,
      shadowX: Number(element.shadowX) || 0,
      shadowY: Number(element.shadowY) || 0,
    };
  }

  static normalizeParameter(param = {}) {
    return {
      key: String(param.key || "")
        .trim()
        .replace(/[^a-zA-Z0-9_]/g, ""),
      mode: param.mode === "static" ? "static" : "dynamic",
      value: String(param.value ?? ""),
    };
  }
}

ThumbnailTemplate.DEFAULT_WIDTH = DEFAULT_WIDTH;
ThumbnailTemplate.DEFAULT_HEIGHT = DEFAULT_HEIGHT;
ThumbnailTemplate.DEFAULT_FONT = DEFAULT_FONT;

module.exports = { ThumbnailTemplate };
