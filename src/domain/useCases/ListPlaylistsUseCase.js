class ListPlaylistsUseCase {
  constructor({ youtubeService }) {
    this.youtubeService = youtubeService;
  }

  async execute() {
    return this.youtubeService.listPlaylists();
  }
}

module.exports = { ListPlaylistsUseCase };
