const { UploadTemplate } = require("../entities/UploadTemplate");

class SaveTemplatesUseCase {
  constructor({ templateStore }) {
    this.templateStore = templateStore;
  }

  async execute(templates) {
    const validated = (templates || []).map((template) =>
      UploadTemplate.create(template)
    );
    this.templateStore.save(validated);
    return validated;
  }
}

module.exports = { SaveTemplatesUseCase };
