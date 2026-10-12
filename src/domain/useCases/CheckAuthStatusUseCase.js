class CheckAuthStatusUseCase {
  constructor({ youtubeService }) {
    this.youtubeService = youtubeService;
  }

  async execute() {
    return this.youtubeService.isAuthenticated();
  }
}

module.exports = { CheckAuthStatusUseCase };
