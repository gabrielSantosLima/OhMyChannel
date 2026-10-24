import { channelIcon, t } from "../lib/api.js";
import { useAppData } from "../contexts/AppDataContext.jsx";
import { useSettings } from "../contexts/SettingsContext.jsx";
import { useToast } from "../contexts/ToastContext.jsx";

const NAV = [
  {
    id: "uploads",
    label: "nav.uploads",
    path: "M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z",
  },
  {
    id: "templates",
    label: "nav.templates",
    path: "M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z",
  },
  {
    id: "ai",
    label: "nav.ai",
    path: "M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h3a4 4 0 0 1 4 4v1h1a2 2 0 1 1 0 4h-1v1a4 4 0 0 1-4 4h-1v1a2 2 0 1 1-4 0v-1H8a4 4 0 0 1-4-4v-1H3a2 2 0 1 1 0-4h1v-1a4 4 0 0 1 4-4h3V5.73A2 2 0 0 1 12 2zm-4 9v6h8v-6H8zm2 2h4v2h-4v-2z",
  },
  {
    id: "thumbnails",
    label: "nav.thumbnails",
    path: "M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z",
  },
  {
    id: "intros",
    label: "nav.intros",
    path: "M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-9 12V7l6 3.5L11 14z",
  },
  {
    id: "credentials",
    label: "nav.setup",
    path: "M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z",
  },
  {
    id: "settings",
    label: "nav.settings",
    path: "M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z",
  },
  {
    id: "about",
    label: "nav.about",
    path: "M11 9h2V7h-2m1 13c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8m0-18A10 10 0 0 0 2 12a10 10 0 0 0 10 10 10 10 0 0 0 10-10A10 10 0 0 0 12 2m-1 15h2v-6h-2v6z",
  },
];

export function Sidebar({ view, onChangeView }) {
  const { appInfo, authenticated, login, logout } = useAppData();
  const { settings, toggleSidebar } = useSettings();
  const { notify } = useToast();

  const handleLogin = async () => {
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

  const handleLogout = async () => {
    await logout();
    notify(t("msg.disconnected"));
  };

  return (
    <aside className="sidebar">
      <button
        type="button"
        className="collapse-toggle"
        title={t("sidebar.collapse")}
        aria-label={t("sidebar.collapse")}
        onClick={toggleSidebar}
      >
        <svg
          className="icon-collapse"
          viewBox="0 0 24 24"
          width="24"
          height="24"
          fill="currentColor"
        >
          <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
        </svg>
      </button>
      <div className="sidebar-brand">
        <img
          className="logo"
          src={channelIcon(appInfo)}
          alt={appInfo.name || "OhMyChannel"}
        />
        <span>{appInfo.name || "OhMyChannel"}</span>
      </div>

      <nav className="nav">
        {NAV.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={"nav-item" + (view === entry.id ? " active" : "")}
            onClick={() => onChangeView(entry.id)}
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="currentColor"
            >
              <path d={entry.path} />
            </svg>
            <span>{t(entry.label)}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <span className={"status " + (authenticated ? "on" : "off")}>
          {authenticated
            ? t("sidebar.connected")
            : t("sidebar.disconnected")}
        </span>
        {authenticated ? (
          <button type="button" className="ghost block" onClick={handleLogout}>
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="currentColor"
            >
              <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
            </svg>
            <span>{t("sidebar.signOut")}</span>
          </button>
        ) : (
          <button type="button" className="ghost block" onClick={handleLogin}>
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="currentColor"
            >
              <path d="M11 7L9.6 8.4l2.6 2.6H2v2h10.2l-2.6 2.6L11 17l5-5-5-5zm9 12h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-8v2h8v14z" />
            </svg>
            <span>{t("sidebar.signIn")}</span>
          </button>
        )}
      </div>
    </aside>
  );
}
