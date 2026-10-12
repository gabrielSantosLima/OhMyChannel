const http = require("http");

class AuthCallbackServer {
  constructor() {
    this.server = null;
    this.redirectUri = null;
    this.codePromise = null;
  }

  async start() {
    this.server = http.createServer();
    await new Promise((resolve) =>
      this.server.listen(0, "127.0.0.1", resolve)
    );
    const { port } = this.server.address();
    this.redirectUri = `http://127.0.0.1:${port}`;

    this.codePromise = new Promise((resolve, reject) => {
      this.server.on("request", (req, res) => {
        const url = new URL(req.url, this.redirectUri);
        const code = url.searchParams.get("code");
        const error = url.searchParams.get("error");
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(
          "<h2>Authorization complete. You can close this tab and return to the app.</h2>"
        );
        if (error) reject(new Error(error));
        else if (code) resolve(code);
      });
    });

    return this.redirectUri;
  }

  waitForCode() {
    return this.codePromise;
  }

  close() {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }
}

module.exports = { AuthCallbackServer };
