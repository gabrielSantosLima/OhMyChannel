const fs = require("fs");
const { ThumbnailTemplate } = require("../entities/ThumbnailTemplate");

class ExportThumbnailUseCase {
  constructor({ thumbnailRenderer }) {
    this.thumbnailRenderer = thumbnailRenderer;
  }

  async execute({ template, values, overrides, outputPath }) {
    if (!outputPath) throw new Error("An output path is required.");
    const entity = ThumbnailTemplate.create(template || {});
    const buffer = await this.thumbnailRenderer.render({
      template: entity,
      values,
      overrides,
    });
    fs.writeFileSync(outputPath, buffer);
    return outputPath;
  }
}

module.exports = { ExportThumbnailUseCase };
