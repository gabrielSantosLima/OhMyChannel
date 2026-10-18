const fs = require("fs");
const path = require("path");

class RenderVideoUseCase {
  constructor({ videoRenderer, settingsStore, outputDir }) {
    this.videoRenderer = videoRenderer;
    this.settingsStore = settingsStore;
    this.outputDir = outputDir;
    this.renders = new Map();
  }

  async execute({ id, introPath, transition, videoPath, onProgress }) {
    const settings = this.settingsStore.load();
    const [width, height] = String(settings.renderResolution || "2560x1440")
      .split("x")
      .map(Number);

    fs.mkdirSync(this.outputDir, { recursive: true });
    const outputPath = path.join(
      this.outputDir,
      `render-${id}-${Date.now()}.mp4`
    );

    try {
      await this.videoRenderer.render({
        introPath,
        transition,
        videoPath,
        width,
        height,
        outputPath,
        onProgress,
        registerAbort: (abort) => this.renders.set(id, abort),
      });
      return { path: outputPath };
    } finally {
      this.renders.delete(id);
    }
  }

  cancel(id) {
    const abort = this.renders.get(id);
    if (abort) {
      abort();
      this.renders.delete(id);
    }
  }

  cancelAll() {
    for (const abort of this.renders.values()) abort();
    this.renders.clear();
  }
}

module.exports = { RenderVideoUseCase };
