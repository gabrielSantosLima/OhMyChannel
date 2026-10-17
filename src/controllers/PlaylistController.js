class PlaylistController {
  constructor({ listPlaylistsUseCase }) {
    this.listPlaylistsUseCase = listPlaylistsUseCase;
  }

  list() {
    return this.listPlaylistsUseCase.execute();
  }
}

module.exports = { PlaylistController };
