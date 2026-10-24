import { useState } from "react";
import { t } from "../lib/api.js";
import { useAppData } from "../contexts/AppDataContext.jsx";
import { useToast } from "../contexts/ToastContext.jsx";
import { useUploadQueue } from "../contexts/UploadQueueContext.jsx";
import { UploadCard } from "../components/UploadCard.jsx";

export function UploadsView({ navigate, active }) {
  const { items, addFiles, uploadAll, handleDrop } = useUploadQueue();
  const { hasCredentials, authenticated, login } = useAppData();
  const { notify } = useToast();
  const [dragOver, setDragOver] = useState(false);

  const uploadable = items.filter(
    (item) => item.status !== "uploading" && item.status !== "done"
  ).length;

  const needsSetup = !hasCredentials;
  const needsAuth = hasCredentials && !authenticated;

  const signIn = async () => {
    notify(t("msg.openingAuth"));
    try {
      await login();
      notify(t("msg.connected"), { type: "success" });
    } catch (err) {
      notify(t("msg.connectFailed", { message: err.message }), {
        type: "error",
      });
    }
  };

  return (
    <section
      id="view-uploads"
      className={
        "view" + (active ? " active" : "") + (dragOver ? " drag-over" : "")
      }
      onDragEnter={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        setDragOver(true);
      }}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
        setDragOver(true);
      }}
      onDragLeave={(event) => {
        if (
          event.relatedTarget &&
          event.currentTarget.contains(event.relatedTarget)
        ) {
          return;
        }
        setDragOver(false);
      }}
      onDrop={(event) => {
        setDragOver(false);
        handleDrop(event);
      }}
    >
      <h2>{t("nav.uploads")}</h2>

      {!hasCredentials ? (
        <div className="setup-banner">
          <span>{t("uploads.banner")}</span>
          <button type="button" onClick={() => navigate("credentials")}>
            {t("uploads.bannerBtn")}
          </button>
        </div>
      ) : null}

      <div className="toolbar">
        <button type="button" className="primary" onClick={addFiles}>
          {t("uploads.addVideos")}
        </button>
        <button
          type="button"
          disabled={uploadable === 0}
          onClick={uploadAll}
        >
          {t("uploads.uploadAll")}
        </button>
        <span className="muted">
          {items.length ? `${items.length} in queue` : ""}
        </span>
      </div>

      <div className="queue">
        {items.map((item) => (
          <UploadCard key={item.id} item={item} />
        ))}
      </div>

      {items.length === 0 ? (
        <div className="empty-queue">{t("uploads.empty")}</div>
      ) : null}

      {needsSetup || needsAuth ? (
        <div className="upload-gate">
          <div className="gate-card">
            {needsSetup ? (
              <>
                <h3>{t("gate.setupTitle")}</h3>
                <p className="muted">{t("gate.setupText")}</p>
                <button
                  type="button"
                  className="primary"
                  onClick={() => navigate("credentials")}
                >
                  {t("gate.setupButton")}
                </button>
              </>
            ) : (
              <>
                <h3>{t("gate.authTitle")}</h3>
                <p className="muted">{t("gate.authText")}</p>
                <button type="button" className="primary" onClick={signIn}>
                  {t("sidebar.signIn")}
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
