class ThumbnailController {
  constructor({
    generateThumbnailUseCase,
    exportThumbnailUseCase,
    listThumbnailTemplatesUseCase,
    saveThumbnailTemplatesUseCase,
    listThumbnailFontsUseCase,
  }) {
    this.generateThumbnailUseCase = generateThumbnailUseCase;
    this.exportThumbnailUseCase = exportThumbnailUseCase;
    this.listThumbnailTemplatesUseCase = listThumbnailTemplatesUseCase;
    this.saveThumbnailTemplatesUseCase = saveThumbnailTemplatesUseCase;
    this.listThumbnailFontsUseCase = listThumbnailFontsUseCase;
  }

  generate(payload) {
    return this.generateThumbnailUseCase.execute(payload);
  }

  export(payload) {
    return this.exportThumbnailUseCase.execute(payload);
  }

  list() {
    return this.listThumbnailTemplatesUseCase.execute();
  }

  save(templates) {
    return this.saveThumbnailTemplatesUseCase.execute(templates);
  }

  fonts() {
    return this.listThumbnailFontsUseCase.execute();
  }
}

module.exports = { ThumbnailController };
