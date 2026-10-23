class GetChannelInfoUseCase {
  constructor({ youtubeService }) {
    this.youtubeService = youtubeService;
  }

  async execute() {
    return this.youtubeService.getMyChannel();
  }
}

module.exports = { GetChannelInfoUseCase };
