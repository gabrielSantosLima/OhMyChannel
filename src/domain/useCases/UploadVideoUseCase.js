const { VideoMetadata } = require("../entities/VideoMetadata");

class UploadVideoUseCase {
  constructor({ youtubeService }) {
    this.youtubeService = youtubeService;
    this.uploads = new Map();
  }

  async execute({
    id,
    filePath,
    title,
    description,
    playlistId,
    publishAt,
    thumbnailPath,
    onProgress,
  }) {
    const metadata = VideoMetadata.fromInput({ title, description, publishAt });
    try {
      const result = await this.youtubeService.upload({
        metadata,
        filePath,
        onProgress,
        registerAbort: (abort) => this.uploads.set(id, abort),
      });

      const warnings = [];
      if (thumbnailPath) {
        try {
          await this.youtubeService.setThumbnail({
            videoId: result.id,
            filePath: thumbnailPath,
          });
        } catch (err) {
          warnings.push(`Thumbnail not set: ${err.message}`);
        }
      }

      if (playlistId) {
        try {
          await this.youtubeService.addToPlaylist({
            videoId: result.id,
            playlistId,
          });
        } catch (err) {
          warnings.push(`Playlist not updated: ${err.message}`);
        }
      }

      return { ...result, warnings };
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
