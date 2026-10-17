class ThumbnailController {
  constructor({
    generateThumbnailUseCase,
    listThumbnailTemplatesUseCase,
    saveThumbnailTemplatesUseCase,
    listThumbnailFontsUseCase,
  }) {
    this.generateThumbnailUseCase = generateThumbnailUseCase;
    this.listThumbnailTemplatesUseCase = listThumbnailTemplatesUseCase;
    this.saveThumbnailTemplatesUseCase = saveThumbnailTemplatesUseCase;
    this.listThumbnailFontsUseCase = listThumbnailFontsUseCase;
  }

  generate(payload) {
    return this.generateThumbnailUseCase.execute(payload);
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
