class LogoutUseCase {
  constructor({ tokenStore }) {
    this.tokenStore = tokenStore;
  }

  async execute() {
    this.tokenStore.clear();
    return true;
  }
}

module.exports = { LogoutUseCase };
