const EFFECTS = ["none", "fade", "crossfade"];

const DEFAULT_TRANSITION = () => ({
  video: { effect: "none", fadeIn: 0, fadeOut: 0, duration: 1 },
  audio: { effect: "none", fadeIn: 0, fadeOut: 0, duration: 1 },
});

class IntroVideo {
  constructor({ id, name, path, transition }) {
    this.id = id;
    this.name = name;
    this.path = path;
    this.transition = transition;
  }

  static create({ id, name, path, transition }) {
    const cleanName = String(name || "").trim();
    if (!cleanName) throw new Error("Intro name is required.");
    const cleanPath = String(path || "").trim();
    if (!cleanPath) throw new Error("Intro file is required.");

    return new IntroVideo({
      id: id || Date.now().toString(36),
      name: cleanName,
      path: cleanPath,
      transition: IntroVideo.normalizeTransition(transition),
    });
  }

  static normalizeTransition(transition = {}) {
    const defaults = DEFAULT_TRANSITION();
    return {
      video: IntroVideo.normalizeTrack(transition.video, defaults.video),
      audio: IntroVideo.normalizeTrack(transition.audio, defaults.audio),
    };
  }

  static normalizeTrack(track = {}, fallback = {}) {
    const positive = (value, def) => {
      const number = Number(value);
      return Number.isFinite(number) && number >= 0 ? number : def;
    };
    return {
      effect: EFFECTS.includes(track.effect) ? track.effect : fallback.effect,
      fadeIn: positive(track.fadeIn, fallback.fadeIn),
      fadeOut: positive(track.fadeOut, fallback.fadeOut),
      duration: positive(track.duration, fallback.duration),
    };
  }
}

IntroVideo.EFFECTS = EFFECTS;

module.exports = { IntroVideo };
