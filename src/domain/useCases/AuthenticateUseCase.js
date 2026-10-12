class AuthenticateUseCase {
  constructor({ youtubeService, browser, createCallbackServer }) {
    this.youtubeService = youtubeService;
    this.browser = browser;
    this.createCallbackServer = createCallbackServer;
  }

  async execute() {
    const callbackServer = this.createCallbackServer();
    const redirectUri = await callbackServer.start();
    try {
      const authUrl = this.youtubeService.createAuthUrl(redirectUri);
      await this.browser.open(authUrl);
      const code = await callbackServer.waitForCode();
      await this.youtubeService.exchangeCode(code, redirectUri);
      return true;
    } finally {
      callbackServer.close();
    }
  }
}

module.exports = { AuthenticateUseCase };
