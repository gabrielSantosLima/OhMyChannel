const { ThumbnailTemplate } = require("../entities/ThumbnailTemplate");

class SaveThumbnailTemplatesUseCase {
  constructor({ thumbnailTemplateStore }) {
    this.thumbnailTemplateStore = thumbnailTemplateStore;
  }

  async execute(templates) {
    const validated = (templates || []).map((template) =>
      ThumbnailTemplate.create(template)
    );
    this.thumbnailTemplateStore.save(validated);
    return validated;
  }
}

module.exports = { SaveThumbnailTemplatesUseCase };
