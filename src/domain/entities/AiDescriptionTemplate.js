const DEFAULT_TEMPLATE = [
  "$description",
  "",
  "🔗 Channel: $channel_link",
  "🎬 Playlist: $playlist_link",
  "",
  "$hashtags",
].join("\n");

const VARIABLES = [
  "description",
  "hashtags",
  "channel_name",
  "channel_link",
  "playlist_name",
  "playlist_link",
  "title",
  "file_name",
  "publish_date",
  "intro_name",
  "thumbnail_name",
];

const VARIABLE_NAMES = new Set(VARIABLES);
const TOKEN_PATTERN = /\$([a-z_][a-z0-9_]*)/gi;

class AiDescriptionTemplate {
  constructor({ pattern }) {
    this.pattern = pattern;
  }

  expand(values = {}) {
    return this.pattern.replace(TOKEN_PATTERN, (_match, name) => {
      const value = values[name];
      return value === undefined || value === null ? "" : String(value);
    });
  }

  static create({ pattern }) {
    const cleanPattern = String(pattern == null ? DEFAULT_TEMPLATE : pattern).trim();
    if (!cleanPattern) throw new Error("AI template is required.");

    for (const match of cleanPattern.matchAll(TOKEN_PATTERN)) {
      if (!VARIABLE_NAMES.has(match[1])) {
        throw new Error(`Unknown AI template variable: $${match[1]}.`);
      }
    }

    return new AiDescriptionTemplate({ pattern: cleanPattern });
  }

  static get defaultPattern() {
    return DEFAULT_TEMPLATE;
  }

  static get variables() {
    return [...VARIABLES];
  }
}

module.exports = { AiDescriptionTemplate, DEFAULT_TEMPLATE, VARIABLES };
