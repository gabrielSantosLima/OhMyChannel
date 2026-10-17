const fs = require("fs");
const path = require("path");
const satoriModule = require("satori");
const { Resvg } = require("@resvg/resvg-js");

const satori = satoriModule.default || satoriModule;
const FONT_EXTENSIONS = /\.(ttf|otf|woff|woff2)$/i;
const MIME_TYPES = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

function prettifyFontName(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
}

function parseFont(file) {
  const base = file.replace(/\.[^.]+$/, "");
  const name = prettifyFontName(base.split(/[-_ ]+/)[0]);
  const lower = base.toLowerCase();
  let weight = 400;
  if (/black|heavy/.test(lower)) weight = 900;
  else if (/extrabold|ultrabold/.test(lower)) weight = 800;
  else if (/semibold|demibold/.test(lower)) weight = 600;
  else if (/bold/.test(lower)) weight = 700;
  else if (/medium/.test(lower)) weight = 500;
  else if (/light/.test(lower)) weight = 300;
  else if (/thin|hairline/.test(lower)) weight = 100;
  const style = /italic|oblique/.test(lower) ? "italic" : "normal";
  return { name, weight, style };
}

class ThumbnailRenderer {
  constructor({ fontsDir }) {
    this.fontsDir = fontsDir;
    this._fonts = null;
  }

  fonts() {
    if (this._fonts) return this._fonts;
    const fonts = [];
    if (this.fontsDir && fs.existsSync(this.fontsDir)) {
      for (const file of fs.readdirSync(this.fontsDir)) {
        if (!FONT_EXTENSIONS.test(file)) continue;
        const { name, weight, style } = parseFont(file);
        fonts.push({
          name,
          data: fs.readFileSync(path.join(this.fontsDir, file)),
          weight,
          style,
        });
      }
    }
    if (!fonts.length) {
      throw new Error(
        `No fonts found in ${this.fontsDir}. Add .ttf/.otf files to use thumbnails.`
      );
    }
    this._fonts = fonts;
    return fonts;
  }

  applyValues(text, values = {}) {
    return String(text).replace(/\{(\w+)\}/g, (_match, key) =>
      values[key] != null ? String(values[key]) : ""
    );
  }

  loadBackground(backgroundPath) {
    if (!backgroundPath || !fs.existsSync(backgroundPath)) return null;
    const ext = path.extname(backgroundPath).toLowerCase();
    const mime = MIME_TYPES[ext] || "image/png";
    const data = fs.readFileSync(backgroundPath).toString("base64");
    return `data:${mime};base64,${data}`;
  }

  resolveLayer(layer, overrides = {}) {
    const resolved = { ...layer };
    if (overrides.color) resolved.color = overrides.color;
    if (overrides.shadowColor) {
      resolved.shadowColor = overrides.shadowColor;
      if (!resolved.shadowBlur && !resolved.shadowX && !resolved.shadowY) {
        resolved.shadowBlur = 12;
        resolved.shadowY = 8;
      }
    }
    if (overrides.strokeColor) resolved.strokeColor = overrides.strokeColor;
    if (overrides.strokeWidth) resolved.strokeWidth = overrides.strokeWidth;
    return resolved;
  }

  buildElement(template, values, overrides) {
    const children = [];
    const background = this.loadBackground(template.backgroundPath);

    if (background) {
      children.push({
        type: "img",
        props: {
          src: background,
          width: template.width,
          height: template.height,
          style: {
            position: "absolute",
            top: 0,
            left: 0,
            width: template.width,
            height: template.height,
            objectFit: "cover",
          },
        },
      });
    }

    for (const rawLayer of template.layers) {
      const layer = this.resolveLayer(rawLayer, overrides);
      const text = this.applyValues(layer.text, values);
      if (!text) continue;
      const style = {
        position: "absolute",
        top: layer.y,
        left: layer.x,
        width: layer.width || template.width,
        display: "flex",
        flexDirection: "column",
        alignItems:
          layer.align === "center"
            ? "center"
            : layer.align === "right"
            ? "flex-end"
            : "flex-start",
        fontFamily: layer.fontFamily,
        fontSize: layer.fontSize,
        fontWeight: layer.fontWeight,
        color: layer.color,
        lineHeight: 1.1,
        whiteSpace: "pre-wrap",
        textAlign: layer.align,
      };
      if (layer.strokeWidth && layer.strokeColor) {
        style.WebkitTextStrokeWidth = layer.strokeWidth;
        style.WebkitTextStrokeColor = layer.strokeColor;
        style.WebkitTextFillColor = layer.color;
        style.paintOrder = "stroke";
      }
      if (
        layer.shadowColor &&
        (layer.shadowBlur || layer.shadowX || layer.shadowY)
      ) {
        style.textShadow = `${layer.shadowX}px ${layer.shadowY}px ${layer.shadowBlur}px ${layer.shadowColor}`;
      }
      children.push({ type: "div", props: { style, children: text } });
    }

    return {
      type: "div",
      props: {
        style: {
          width: template.width,
          height: template.height,
          display: "flex",
          position: "relative",
          backgroundColor: "#000000",
        },
        children,
      },
    };
  }

  async toSvg(template, values, overrides) {
    return satori(this.buildElement(template, values, overrides), {
      width: template.width,
      height: template.height,
      fonts: this.fonts(),
    });
  }

  async render({ template, values, overrides }) {
    const svg = await this.toSvg(template, values, overrides);
    const resvg = new Resvg(svg);
    return resvg.render().asPng();
  }

  toDataUrl(buffer) {
    return `data:image/png;base64,${buffer.toString("base64")}`;
  }
}

module.exports = { ThumbnailRenderer };
