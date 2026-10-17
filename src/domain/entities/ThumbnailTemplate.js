const DEFAULT_WIDTH = 1920;
const DEFAULT_HEIGHT = 1080;
const ALIGNMENTS = ["left", "center", "right"];

class ThumbnailTemplate {
  constructor({
    id,
    name,
    width = DEFAULT_WIDTH,
    height = DEFAULT_HEIGHT,
    backgroundPath = null,
    layers = [],
  }) {
    this.id = id;
    this.name = name;
    this.width = width;
    this.height = height;
    this.backgroundPath = backgroundPath;
    this.layers = layers;
  }

  static create({ id, name, width, height, backgroundPath, layers }) {
    const cleanName = String(name || "").trim();
    if (!cleanName) throw new Error("Thumbnail template name is required.");

    return new ThumbnailTemplate({
      id: id || Date.now().toString(36),
      name: cleanName,
      width: Number(width) || DEFAULT_WIDTH,
      height: Number(height) || DEFAULT_HEIGHT,
      backgroundPath: backgroundPath || null,
      layers: (layers || []).map((layer) =>
        ThumbnailTemplate.normalizeLayer(layer)
      ),
    });
  }

  static normalizeLayer(layer = {}) {
    return {
      text: String(layer.text ?? ""),
      fontFamily: String(layer.fontFamily || "Lato"),
      fontSize: Number(layer.fontSize) || 96,
      fontWeight: Number(layer.fontWeight) || 400,
      color: String(layer.color || "#ffffff"),
      x: Number(layer.x) || 0,
      y: Number(layer.y) || 0,
      width: Number(layer.width) || 0,
      align: ALIGNMENTS.includes(layer.align) ? layer.align : "center",
      strokeColor: layer.strokeColor ? String(layer.strokeColor) : null,
      strokeWidth: Number(layer.strokeWidth) || 0,
      shadowColor: layer.shadowColor ? String(layer.shadowColor) : null,
      shadowBlur: Number(layer.shadowBlur) || 0,
      shadowX: Number(layer.shadowX) || 0,
      shadowY: Number(layer.shadowY) || 0,
    };
  }
}

ThumbnailTemplate.DEFAULT_WIDTH = DEFAULT_WIDTH;
ThumbnailTemplate.DEFAULT_HEIGHT = DEFAULT_HEIGHT;

module.exports = { ThumbnailTemplate };
