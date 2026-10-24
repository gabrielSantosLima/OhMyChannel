import { useEffect, useRef, useState } from "react";
import { api, t } from "../lib/api.js";
import { useAppData } from "../contexts/AppDataContext.jsx";

export function UpdateIndicator() {
  const { updateState } = useAppData();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const visible = ["available", "downloading", "downloaded", "error"].includes(
    updateState.state
  );
  const downloading = updateState.state === "downloading";

  useEffect(() => {
    if (!open) return;
    const handler = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!visible) {
    return <div className="update-wrap hidden" />;
  }

  let title = "";
  let text = "";
  if (updateState.state === "available") {
    title = t("update.available.title");
    text = updateState.manual
      ? t("update.available.manual", { version: updateState.version })
      : t("update.available.text", { version: updateState.version });
  } else if (updateState.state === "downloading") {
    title = t("update.downloading.title");
    text = t("update.downloading.text", {
      percent: updateState.percent,
      version: updateState.version || "",
    });
  } else if (updateState.state === "downloaded") {
    title = t("update.ready.title");
    text = t("update.ready.text", { version: updateState.version });
  } else if (updateState.state === "error") {
    title = t("update.failed.title");
    text = updateState.error || t("update.unknownError");
  }

  return (
    <div className="update-wrap" ref={wrapRef}>
      <button
        type="button"
        className={
          "update-button" +
          (updateState.state === "available" ||
          updateState.state === "downloaded"
            ? " active"
            : "")
        }
        title={t("update.buttonTitle")}
        onClick={() => setOpen((current) => !current)}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0 0 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 0 0 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" />
        </svg>
        {updateState.state === "available" ||
        updateState.state === "downloaded" ? (
          <span className="update-dot" />
        ) : null}
        {downloading ? (
          <span className="update-progress">{updateState.percent}%</span>
        ) : null}
      </button>
      {open ? (
        <div className="update-popover">
          <div className="update-title">{title}</div>
          <div className="update-text">{text}</div>
          <div className="update-actions">
            {updateState.state === "downloaded" ? (
              <button
                type="button"
                className="primary"
                onClick={() => api.installUpdate()}
              >
                {t("update.restart")}
              </button>
            ) : null}
            <button
              type="button"
              className={
                updateState.manual && updateState.state === "available"
                  ? "primary"
                  : "ghost"
              }
              onClick={() => api.openRelease()}
            >
              {t("update.openRelease")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
