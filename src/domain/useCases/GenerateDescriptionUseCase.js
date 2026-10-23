const {
  AiDescriptionTemplate,
} = require("../entities/AiDescriptionTemplate");

const LANGUAGE_NAMES = {
  en: "English",
  "pt-BR": "Portuguese (Brazil)",
};

const KNOWN_VARIABLES = new Set(AiDescriptionTemplate.variables);

function cleanVariables(input = {}) {
  const values = {};
  for (const [key, value] of Object.entries(input || {})) {
    if (!KNOWN_VARIABLES.has(key)) continue;
    values[key] = value === undefined || value === null ? "" : String(value);
  }
  return values;
}

function normalizeHashtags(list) {
  const tags = new Set();
  for (const tag of Array.isArray(list) ? list : []) {
    const clean = String(tag).replace(/\s+/g, "").replace(/^#+/, "");
    if (clean) tags.add(`#${clean}`);
  }
  return [...tags];
}

function stripTrailingHashtags(text) {
  return String(text || "")
    .replace(/(?:\s*#[^\s#]+)+\s*$/g, "")
    .trim();
}

function parseResponse(content) {
  const text = String(content || "").trim();
  const stripped = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  const candidates = [stripped];
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start !== -1 && end > start) candidates.push(stripped.slice(start, end + 1));

  for (const candidate of candidates) {
    try {
      const data = JSON.parse(candidate);
      const description = stripTrailingHashtags(data.description);
      if (!description) continue;
      return {
        description,
        hashtags: normalizeHashtags(data.hashtags),
      };
    } catch {
      /* try the next candidate */
    }
  }

  return { description: stripTrailingHashtags(stripped), hashtags: [] };
}

function buildMessages({ brief, variables, languageName }) {
  const contextLines = [];
  if (variables.title) contextLines.push(`Video title: ${variables.title}`);
  if (variables.file_name) contextLines.push(`File name: ${variables.file_name}`);
  if (variables.channel_name)
    contextLines.push(`Channel: ${variables.channel_name}`);
  if (variables.playlist_name)
    contextLines.push(`Playlist: ${variables.playlist_name}`);

  return [
    {
      role: "system",
      content:
        "You are a YouTube metadata assistant. Write a compelling video " +
        "description from a short brief. Do not invent facts that are not in " +
        "the brief or the provided context. Return plain text without " +
        "Markdown and do not include hashtags in the description text; put " +
        "hashtags only in the hashtags array. Return only strict JSON with the " +
        'shape {"description": "string", "hashtags": ["string"]}. ' +
        "Hashtags must not include the # character. " +
        `Write the description in ${languageName}.`,
    },
    {
      role: "user",
      content: [
        `Brief: ${brief}`,
        ...contextLines,
        "Produce one description and 8 to 12 relevant hashtags.",
      ].join("\n"),
    },
  ];
}

class GenerateDescriptionUseCase {
  constructor({ aiConfigStore, deepInfraService }) {
    this.aiConfigStore = aiConfigStore;
    this.deepInfraService = deepInfraService;
  }

  async execute({ brief, fieldRole = "description", variables, language } = {}) {
    const cleanBrief = String(brief || "").trim();
    if (!cleanBrief) throw new Error("Write a brief after /generate.");

    if (!this.aiConfigStore.hasApiKey()) {
      throw new Error("DeepInfra API key is not configured.");
    }

    const config = this.aiConfigStore.loadConfig();
    const template = AiDescriptionTemplate.create({ pattern: config.template });
    const values = cleanVariables(variables);

    if (
      fieldRole === "description" &&
      template.pattern.includes("$playlist_") &&
      !values.playlist_link
    ) {
      throw new Error("Select a playlist first.");
    }

    const languageName = LANGUAGE_NAMES[language] || LANGUAGE_NAMES.en;
    const content = await this.deepInfraService.chatCompletion({
      model: config.model,
      messages: buildMessages({ brief: cleanBrief, variables: values, languageName }),
    });

    const { description, hashtags } = parseResponse(content);

    if (fieldRole !== "description") {
      return { text: description, description, hashtags };
    }

    return {
      text: template.expand({
        ...values,
        description,
        hashtags: hashtags.join(" "),
      }),
      template: template.pattern,
      description,
      hashtags,
    };
  }
}

module.exports = { GenerateDescriptionUseCase, parseResponse, normalizeHashtags };
