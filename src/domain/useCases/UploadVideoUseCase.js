const { VideoMetadata } = require("../entities/VideoMetadata");

class UploadVideoUseCase {
  constructor({ youtubeService }) {
    this.youtubeService = youtubeService;
    this.abort = null;
  }

  async execute({ filePath, title, description, onProgress }) {
    const metadata = VideoMetadata.fromInput({ title, description });
    try {
      return await this.youtubeService.upload({
        metadata,
        filePath,
        onProgress,
        registerAbort: (abort) => {
          this.abort = abort;
        },
      });
    } finally {
      this.abort = null;
    }
  }

  cancel() {
    if (this.abort) {
      this.abort();
      this.abort = null;
    }
  }
}

module.exports = { UploadVideoUseCase };
