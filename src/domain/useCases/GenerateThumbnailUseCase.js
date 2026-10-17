const fs = require("fs");
const path = require("path");
const { ThumbnailTemplate } = require("../entities/ThumbnailTemplate");

class GenerateThumbnailUseCase {
  constructor({ thumbnailRenderer, outputDir }) {
    this.thumbnailRenderer = thumbnailRenderer;
    this.outputDir = outputDir;
  }

  async execute({ template, values, asDataUrl }) {
    const entity = ThumbnailTemplate.create(template || {});
    const buffer = await this.thumbnailRenderer.render({
      template: entity,
      values,
    });

    if (asDataUrl) {
      return this.thumbnailRenderer.toDataUrl(buffer);
    }

    fs.mkdirSync(this.outputDir, { recursive: true });
    const filePath = path.join(
      this.outputDir,
      `thumb-${entity.id}-${Date.now()}.png`
    );
    fs.writeFileSync(filePath, buffer);
    return { path: filePath, dataUrl: this.thumbnailRenderer.toDataUrl(buffer) };
  }
}

module.exports = { GenerateThumbnailUseCase };
