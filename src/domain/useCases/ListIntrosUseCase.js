class ListIntrosUseCase {
  constructor({ introStore }) {
    this.introStore = introStore;
  }

  async execute() {
    return this.introStore.load();
  }
}

module.exports = { ListIntrosUseCase };
