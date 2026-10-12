class ListTemplatesUseCase {
  constructor({ templateStore }) {
    this.templateStore = templateStore;
  }

  async execute() {
    return this.templateStore.load();
  }
}

module.exports = { ListTemplatesUseCase };
