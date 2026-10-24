import { channelIcon, t } from "../lib/api.js";
import { useAppData } from "../contexts/AppDataContext.jsx";

export function AboutView({ active }) {
  const { appInfo } = useAppData();
  return (
    <section id="view-about" className={"view" + (active ? " active" : "")}>
      <h2>{t("about.title")}</h2>
      <div className="about">
        <img
          className="about-logo"
          src={channelIcon(appInfo)}
          alt={appInfo.name || "OhMyChannel"}
        />
        <div className="about-name">{appInfo.name || "OhMyChannel"}</div>
        <div className="about-version">
          <span>{t("about.version")}</span>
          <span>{appInfo.version || "-"}</span>
        </div>
        <p className="muted">{t("about.text")}</p>
      </div>
    </section>
  );
}
