import { useState } from "react";
import { useAppData } from "./contexts/AppDataContext.jsx";
import { useSettings } from "./contexts/SettingsContext.jsx";
import { Sidebar } from "./components/Sidebar.jsx";
import { UpdateIndicator } from "./components/UpdateIndicator.jsx";
import { LoadingScreen } from "./components/LoadingScreen.jsx";
import { UploadsView } from "./views/UploadsView.jsx";
import { TemplatesView } from "./views/TemplatesView.jsx";
import { AiView } from "./views/AiView.jsx";
import { ThumbnailsView } from "./views/ThumbnailsView.jsx";
import { IntrosView } from "./views/IntrosView.jsx";
import { CredentialsView } from "./views/CredentialsView.jsx";
import { SettingsView } from "./views/SettingsView.jsx";
import { AboutView } from "./views/AboutView.jsx";
import { useStaticCommands } from "./hooks/useStaticCommands.js";

export function App() {
  const { ready, loadingStatus, appInfo } = useAppData();
  const { settings } = useSettings();
  const [view, setView] = useState("uploads");
  useStaticCommands(ready);

  return (
    <>
      <div className={"app" + (settings.sidebarCollapsed ? " collapsed" : "")}>
        <Sidebar view={view} onChangeView={setView} />
        <main className="content">
          <header className="topbar">
            <UpdateIndicator />
          </header>
          <div className="content-body">
            <UploadsView navigate={setView} active={view === "uploads"} />
            <TemplatesView active={view === "templates"} />
            <AiView active={view === "ai"} />
            <ThumbnailsView active={view === "thumbnails"} navigate={setView} />
            <IntrosView active={view === "intros"} />
            <CredentialsView active={view === "credentials"} />
            <SettingsView active={view === "settings"} />
            <AboutView active={view === "about"} />
          </div>
        </main>
      </div>
      {!ready ? (
        <LoadingScreen statusKey={loadingStatus} appInfo={appInfo} />
      ) : null}
    </>
  );
}
