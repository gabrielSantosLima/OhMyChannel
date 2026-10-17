class ListThumbnailFontsUseCase {
  constructor({ thumbnailRenderer }) {
    this.thumbnailRenderer = thumbnailRenderer;
  }

  async execute() {
    const fonts = this.thumbnailRenderer.fonts();
    const families = [...new Set(fonts.map((font) => font.name))];
    return families.map((name) => ({
      name,
      weights: [
        ...new Set(
          fonts.filter((font) => font.name === name).map((font) => font.weight)
        ),
      ].sort((a, b) => a - b),
    }));
  }
}

module.exports = { ListThumbnailFontsUseCase };
