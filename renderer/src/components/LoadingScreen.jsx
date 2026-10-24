import { channelIcon, t } from "../lib/api.js";

export function LoadingScreen({ statusKey, appInfo }) {
  return (
    <div className="loading-screen" role="status" aria-live="polite">
      <img
        className="loading-logo"
        src={channelIcon(appInfo)}
        alt={appInfo && appInfo.name ? appInfo.name : "OhMyChannel"}
      />
      <div className="loading-spinner" aria-hidden="true" />
      <p className="loading-status">{t(statusKey || "loading.preparing")}</p>
    </div>
  );
}
