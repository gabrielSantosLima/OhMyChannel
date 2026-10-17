class ListThumbnailTemplatesUseCase {
  constructor({ thumbnailTemplateStore }) {
    this.thumbnailTemplateStore = thumbnailTemplateStore;
  }

  async execute() {
    return this.thumbnailTemplateStore.load();
  }
}

module.exports = { ListThumbnailTemplatesUseCase };
