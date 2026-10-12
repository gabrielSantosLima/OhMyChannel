const { VideoMetadata } = require("../entities/VideoMetadata");

class UploadVideoUseCase {
  constructor({ youtubeService }) {
    this.youtubeService = youtubeService;
    this.uploads = new Map();
  }

  async execute({ id, filePath, title, description, onProgress }) {
    const metadata = VideoMetadata.fromInput({ title, description });
    try {
      return await this.youtubeService.upload({
        metadata,
        filePath,
        onProgress,
        registerAbort: (abort) => this.uploads.set(id, abort),
      });
    } finally {
      this.uploads.delete(id);
    }
  }

  cancel(id) {
    const abort = this.uploads.get(id);
    if (abort) {
      abort();
      this.uploads.delete(id);
    }
  }

  cancelAll() {
    for (const abort of this.uploads.values()) abort();
    this.uploads.clear();
  }
}

module.exports = { UploadVideoUseCase };
