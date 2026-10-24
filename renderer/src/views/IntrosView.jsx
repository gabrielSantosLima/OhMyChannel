import { useEffect, useRef, useState } from "react";
import { api, t } from "../lib/api.js";
import { useAppData } from "../contexts/AppDataContext.jsx";
import { useToast } from "../contexts/ToastContext.jsx";

const DEFAULT_TRANSITION = {
  video: { effect: "none", fadeIn: 0, fadeOut: 0, duration: 1 },
  audio: { effect: "none", fadeIn: 0, fadeOut: 0, duration: 1 },
};

function toFileUrl(filePath) {
  return encodeURI("file:///" + String(filePath).replace(/\\/g, "/"));
}

export function IntrosView({ active }) {
  const { intros, saveIntros } = useAppData();
  const { notify } = useToast();
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState("");
  const [videoPath, setVideoPath] = useState(null);
  const [volume, setVolume] = useState(100);
  const [transition, setTransition] = useState(DEFAULT_TRANSITION);
  const [error, setError] = useState("");
  const [previewVisible, setPreviewVisible] = useState(false);

  const previewRef = useRef(null);
  const videoRef = useRef(null);
  const blackRef = useRef(null);
  const placeholderRef = useRef(null);
  const timersRef = useRef([]);

  const clearPreviewTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const hidePreview = () => {
    clearPreviewTimers();
    setPreviewVisible(false);
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.load();
    }
  };

  useEffect(() => {
    return () => {
      clearPreviewTimers();
      const video = videoRef.current;
      if (video) video.pause();
    };
  }, []);

  const resetEditor = () => {
    setEditingId(null);
    setName("");
    setVideoPath(null);
    setVolume(100);
    setTransition(DEFAULT_TRANSITION);
    setError("");
    hidePreview();
  };

  const updateTrack = (track, key, value) => {
    setTransition((current) => ({
      ...current,
      [track]: { ...current[track], [key]: value },
    }));
  };

  const chooseVideo = async () => {
    const path = await api.pickIntro();
    if (path) setVideoPath(path);
  };

  const save = async () => {
    if (!name.trim()) {
      setError(t("intros.errorName"));
      return;
    }
    if (!videoPath) {
      setError(t("intros.errorVideo"));
      return;
    }
    const intro = {
      id: editingId || undefined,
      name: name.trim(),
      path: videoPath,
      transition,
      volume: (Number(volume) || 0) / 100,
    };
    const next = [...intros];
    const index = next.findIndex((entry) => entry.id === intro.id);
    if (index === -1) next.push(intro);
    else next[index] = intro;
    try {
      await saveIntros(next);
      notify(t("msg.introSaved"), { type: "success" });
      resetEditor();
    } catch (err) {
      setError(err.message);
    }
  };

  const editIntro = (intro) => {
    setEditingId(intro.id);
    setName(intro.name || "");
    setVideoPath(intro.path || null);
    setVolume(intro.volume != null ? intro.volume * 100 : 100);
    setTransition(intro.transition || DEFAULT_TRANSITION);
    setError("");
    hidePreview();
  };

  const deleteIntro = async (intro) => {
    const next = intros.filter((entry) => entry.id !== intro.id);
    await saveIntros(next);
    if (editingId === intro.id) resetEditor();
  };

  const runCrossfade = (duration) => {
    const video = videoRef.current;
    const placeholder = placeholderRef.current;
    if (!video || !placeholder) return;
    const seconds = Math.max(0.1, duration);
    placeholder.style.transition = "none";
    placeholder.style.opacity = "1";
    video.style.transition = `opacity ${seconds}s linear`;
    requestAnimationFrame(() => {
      video.style.opacity = "0";
    });
  };

  const runFade = (fadeOut, fadeIn) => {
    const video = videoRef.current;
    const black = blackRef.current;
    if (!video || !black) return;
    const out = Math.max(0.1, fadeOut);
    const back = Math.max(0.1, fadeIn);
    black.style.transition = `opacity ${out}s linear`;
    video.style.transition = `opacity ${out}s linear`;
    requestAnimationFrame(() => {
      black.style.opacity = "1";
      video.style.opacity = "0";
    });
    timersRef.current.push(
      setTimeout(() => {
        black.style.transition = `opacity ${back}s linear`;
        requestAnimationFrame(() => {
          black.style.opacity = "0";
        });
      }, out * 1000)
    );
  };

  const previewIntro = () => {
    if (!videoPath) {
      setError(t("intros.errorPreview"));
      return;
    }
    clearPreviewTimers();
    setPreviewVisible(true);
    requestAnimationFrame(() => {
      const video = videoRef.current;
      const placeholder = placeholderRef.current;
      const black = blackRef.current;
      if (!video || !placeholder || !black) return;
      const baseVolume = Math.min(1, Math.max(0, Number(volume) / 100));

      black.style.transition = "none";
      video.style.transition = "none";
      black.style.opacity = "0";
      placeholder.style.opacity = "1";
      video.style.opacity = "1";
      video.volume = baseVolume;
      video.src = toFileUrl(videoPath);

      const onTime = () => {
        const duration = video.duration;
        if (!duration || Number.isNaN(duration)) return;

        if (transition.video.effect === "crossfade") {
          const start = duration - transition.video.duration;
          if (video.currentTime >= start) {
            video.removeEventListener("timeupdate", onTime);
            runCrossfade(transition.video.duration);
          }
        } else if (transition.video.effect === "fade") {
          const start = duration - transition.video.fadeOut;
          if (video.currentTime >= start) {
            video.removeEventListener("timeupdate", onTime);
            runFade(transition.video.fadeOut, transition.video.fadeIn);
          }
        }

        const audio = transition.audio;
        if (audio.effect !== "none") {
          const length =
            audio.effect === "crossfade" ? audio.duration : audio.fadeOut;
          const start = duration - length;
          if (length > 0 && video.currentTime >= start) {
            video.volume =
              baseVolume *
              Math.max(0, 1 - (video.currentTime - start) / length);
          }
        }
      };

      video.addEventListener("timeupdate", onTime);
      video.addEventListener(
        "ended",
        () => {
          if (transition.video.effect === "none") {
            video.style.transition = "opacity 0.15s linear";
            video.style.opacity = "0";
          }
        },
        { once: true }
      );
      video.play().catch(() => {});
    });
  };

  const videoFadeEnabled = transition.video.effect === "fade";
  const videoCrossfadeEnabled = transition.video.effect === "crossfade";
  const audioFadeEnabled = transition.audio.effect === "fade";
  const audioCrossfadeEnabled = transition.audio.effect === "crossfade";

  return (
    <section className={"view" + (active ? " active" : "")}>
      <h2>{t("intros.title")}</h2>
      <div className="intro-editor">
        <div className="intro-form">
          <div className="intro-row">
            <input
              type="text"
              placeholder={t("intros.namePlaceholder")}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <button type="button" onClick={chooseVideo}>
              {t("common.chooseVideo")}
            </button>
            <span className="thumb-name">
              {videoPath
                ? videoPath.split(/[\\/]/).pop()
                : t("intros.noVideo")}
            </span>
            <label className="thumb-field intro-volume">
              <span>
                {t("intros.volume")} {volume}%
              </span>
              <input
                type="range"
                min="0"
                max="200"
                step="5"
                value={volume}
                onChange={(event) => setVolume(Number(event.target.value))}
              />
            </label>
          </div>

          <div className="intro-transitions">
            {["video", "audio"].map((track) => (
              <div className="intro-track" key={track}>
                <span className="intro-track-title">{t(`intros.${track}`)}</span>
                <div className="intro-track-fields">
                  <label className="thumb-field">
                    <span>{t("intros.effect")}</span>
                    <select
                      value={transition[track].effect}
                      onChange={(event) =>
                        updateTrack(track, "effect", event.target.value)
                      }
                    >
                      <option value="none">{t("effect.none")}</option>
                      <option value="fade">{t("effect.fade")}</option>
                      <option value="crossfade">{t("effect.crossfade")}</option>
                    </select>
                  </label>
                  <label className="thumb-field">
                    <span>{t("intros.fadeIn")}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={transition[track].fadeIn}
                      disabled={
                        track === "video"
                          ? !videoFadeEnabled
                          : !audioFadeEnabled
                      }
                      onChange={(event) =>
                        updateTrack(
                          track,
                          "fadeIn",
                          Number(event.target.value) || 0
                        )
                      }
                    />
                  </label>
                  <label className="thumb-field">
                    <span>{t("intros.fadeOut")}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={transition[track].fadeOut}
                      disabled={
                        track === "video"
                          ? !videoFadeEnabled
                          : !audioFadeEnabled
                      }
                      onChange={(event) =>
                        updateTrack(
                          track,
                          "fadeOut",
                          Number(event.target.value) || 0
                        )
                      }
                    />
                  </label>
                  <label className="thumb-field">
                    <span>{t("intros.duration")}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={transition[track].duration}
                      disabled={
                        track === "video"
                          ? !videoCrossfadeEnabled
                          : !audioCrossfadeEnabled
                      }
                      onChange={(event) =>
                        updateTrack(
                          track,
                          "duration",
                          Number(event.target.value) || 0
                        )
                      }
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>

          <div className="intro-actions">
            <button type="button" onClick={previewIntro}>
              {t("common.preview")}
            </button>
            <button type="button" className="primary" onClick={save}>
              {t("intros.save")}
            </button>
            <button type="button" className="ghost" onClick={resetEditor}>
              {t("common.new")}
            </button>
            <span className="tpl-error">{error}</span>
          </div>
        </div>

        <div
          className={"intro-preview" + (previewVisible ? "" : " hidden")}
          ref={previewRef}
        >
          <div className="intro-preview-stage">
            <div className="intro-preview-placeholder" ref={placeholderRef}>
              {t("intros.mainVideo")}
            </div>
            <div className="intro-preview-black" ref={blackRef} />
            <video
              className="intro-preview-video"
              ref={videoRef}
              playsInline
            />
          </div>
          <span className="muted">{t("intros.approxPreview")}</span>
        </div>
      </div>

      <div className="tpl-list">
        {intros.length === 0 ? (
          <div className="tpl-empty">{t("intros.empty")}</div>
        ) : (
          intros.map((intro) => (
            <div className="tpl-item" key={intro.id}>
              <div className="tpl-info">
                <span className="tpl-name">{intro.name}</span>
                <span className="tpl-detail">
                  video: {intro.transition.video.effect} | audio:{" "}
                  {intro.transition.audio.effect}
                </span>
              </div>
              <div className="tpl-item-actions">
                <button
                  type="button"
                  className="ghost"
                  onClick={() => editIntro(intro)}
                >
                  {t("common.edit")}
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={() => deleteIntro(intro)}
                >
                  {t("common.delete")}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
