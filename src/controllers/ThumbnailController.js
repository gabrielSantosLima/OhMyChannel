class ThumbnailController {
  constructor({ generateThumbnailUseCase }) {
    this.generateThumbnailUseCase = generateThumbnailUseCase;
  }

  generate(payload) {
    return this.generateThumbnailUseCase.execute(payload);
  }
}

module.exports = { ThumbnailController };
