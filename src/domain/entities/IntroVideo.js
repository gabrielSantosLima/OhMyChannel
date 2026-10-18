const EFFECTS = ["none", "fade", "crossfade"];

const DEFAULT_TRANSITION = () => ({
  video: { effect: "none", fadeIn: 0, fadeOut: 0, duration: 1 },
  audio: { effect: "none", fadeIn: 0, fadeOut: 0, duration: 1 },
});

class IntroVideo {
  constructor({ id, name, path, transition, volume }) {
    this.id = id;
    this.name = name;
    this.path = path;
    this.transition = transition;
    this.volume = volume;
  }

  static create({ id, name, path, transition, volume }) {
    const cleanName = String(name || "").trim();
    if (!cleanName) throw new Error("Intro name is required.");
    const cleanPath = String(path || "").trim();
    if (!cleanPath) throw new Error("Intro file is required.");

    return new IntroVideo({
      id: id || Date.now().toString(36),
      name: cleanName,
      path: cleanPath,
      transition: IntroVideo.normalizeTransition(transition),
      volume: IntroVideo.normalizeVolume(volume),
    });
  }

  static normalizeVolume(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 1;
    return Math.min(2, Math.max(0, number));
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
