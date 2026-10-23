const DEFAULT_BASE_URL = "https://api.deepinfra.com/v1/openai";
const DEFAULT_TIMEOUT_MS = 60000;

class DeepInfraService {
  constructor({
    getApiKey,
    baseUrl = DEFAULT_BASE_URL,
    fetchImpl = fetch,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  }) {
    this.getApiKey = getApiKey;
    this.baseUrl = baseUrl;
    this.fetchImpl = fetchImpl;
    this.timeoutMs = timeoutMs;
  }

  async request(path, options = {}) {
    const apiKey = this.getApiKey();
    if (!apiKey) throw new Error("DeepInfra API key is not configured.");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        let detail = "";
        try {
          const body = await response.json();
          detail = body.error && body.error.message ? body.error.message : "";
        } catch {
          detail = "";
        }
        const suffix = detail ? `: ${detail}` : "";
        throw new Error(`DeepInfra request failed (${response.status})${suffix}`);
      }

      return response.json();
    } catch (err) {
      if (err.name === "AbortError") {
        throw new Error("DeepInfra request timed out.");
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  async listModels() {
    const data = await this.request("/models");
    return (data.data || [])
      .map((model) => model.id)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }

  async chatCompletion({
    model,
    messages,
    maxTokens = 900,
    temperature = 0.7,
  }) {
    const data = await this.request("/chat/completions", {
      method: "POST",
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
      }),
    });

    const choice = data.choices && data.choices[0];
    const content = choice && choice.message ? choice.message.content : "";
    if (!content) throw new Error("DeepInfra returned an empty response.");
    return content;
  }
}

module.exports = { DeepInfraService, DEFAULT_BASE_URL };
