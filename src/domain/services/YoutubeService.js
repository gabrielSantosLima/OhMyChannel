const fs = require("fs");
const { Transform } = require("stream");
const { google } = require("googleapis");

class YoutubeService {
  constructor({ tokenStore, clientConfigStore, scopes }) {
    this.tokenStore = tokenStore;
    this.clientConfigStore = clientConfigStore;
    this.scopes = scopes;
  }

  createAuthUrl(redirectUri) {
    const { clientId, clientSecret } = this.clientConfigStore.load();
    const client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    return client.generateAuthUrl({
      access_type: "offline",
      scope: this.scopes,
      prompt: "consent",
    });
  }

  async exchangeCode(code, redirectUri) {
    const { clientId, clientSecret } = this.clientConfigStore.load();
    const client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    const { tokens } = await client.getToken(code);
    this.tokenStore.save(tokens);
    return tokens;
  }

  createClient() {
    const { clientId, clientSecret } = this.clientConfigStore.load();
    const client = new google.auth.OAuth2(clientId, clientSecret);
    const tokens = this.tokenStore.load();
    if (tokens) client.setCredentials(tokens);
    client.on("tokens", (newTokens) => this.tokenStore.merge(newTokens));
    return client;
  }

  async isAuthenticated() {
    if (!this.tokenStore.load()) return false;
    try {
      await this.createClient().getAccessToken();
      return true;
    } catch {
      return false;
    }
  }

  async upload({ metadata, filePath, onProgress, registerAbort }) {
    if (!this.tokenStore.load()) throw new Error("Not authenticated.");
    if (!fs.existsSync(filePath)) throw new Error("File not found.");

    const youtube = google.youtube({ version: "v3", auth: this.createClient() });
    const total = fs.statSync(filePath).size;
    let uploaded = 0;
    let cancelled = false;

    const source = fs.createReadStream(filePath);
    const counter = new Transform({
      transform(chunk, _encoding, callback) {
        if (cancelled) {
          callback(new Error("Upload canceled by user."));
          return;
        }
        uploaded += chunk.length;
        onProgress(uploaded, total);
        callback(null, chunk);
      },
    });
    source.pipe(counter);

    if (registerAbort) {
      registerAbort(() => {
        cancelled = true;
        source.destroy();
        counter.destroy();
      });
    }

    const response = await youtube.videos.insert({
      part: ["snippet", "status"],
      requestBody: {
        snippet: metadata.toSnippet(),
        status: metadata.toStatus(),
      },
      media: { body: counter },
    });

    return { id: response.data.id };
  }
}

module.exports = { YoutubeService };
