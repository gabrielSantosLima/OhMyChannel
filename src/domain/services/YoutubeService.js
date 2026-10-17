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
    const tokens = this.tokenStore.load();
    if (!tokens) return false;
    if (!this.hasRequiredScopes(tokens)) return false;
    try {
      await this.createClient().getAccessToken();
      return true;
    } catch {
      return false;
    }
  }

  hasRequiredScopes(tokens) {
    if (!tokens || !tokens.scope) return false;
    const granted = String(tokens.scope).split(/\s+/);
    return this.scopes.every((scope) => granted.includes(scope));
  }

  async listPlaylists() {
    if (!this.tokenStore.load()) throw new Error("Not authenticated.");
    const youtube = google.youtube({ version: "v3", auth: this.createClient() });
    const playlists = [];
    let pageToken;
    do {
      const response = await youtube.playlists.list({
        part: ["snippet", "contentDetails"],
        mine: true,
        maxResults: 50,
        pageToken,
      });
      for (const item of response.data.items || []) {
        playlists.push({
          id: item.id,
          title: item.snippet ? item.snippet.title : "",
          itemCount: item.contentDetails ? item.contentDetails.itemCount : 0,
        });
      }
      pageToken = response.data.nextPageToken;
    } while (pageToken);
    return playlists;
  }

  async addToPlaylist({ videoId, playlistId }) {
    if (!this.tokenStore.load()) throw new Error("Not authenticated.");
    const youtube = google.youtube({ version: "v3", auth: this.createClient() });
    await youtube.playlistItems.insert({
      part: ["snippet"],
      requestBody: {
        snippet: {
          playlistId,
          resourceId: { kind: "youtube#video", videoId },
        },
      },
    });
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
