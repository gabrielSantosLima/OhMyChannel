import "./lib/legacy.js";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import { SettingsProvider } from "./contexts/SettingsContext.jsx";
import { ToastProvider } from "./contexts/ToastContext.jsx";
import { ConfirmProvider } from "./contexts/ConfirmContext.jsx";
import { AppDataProvider } from "./contexts/AppDataContext.jsx";
import { UploadQueueProvider } from "./contexts/UploadQueueContext.jsx";

const container = document.getElementById("root");
createRoot(container).render(
  <SettingsProvider>
    <ToastProvider>
      <ConfirmProvider>
        <AppDataProvider>
          <UploadQueueProvider>
            <App />
          </UploadQueueProvider>
        </AppDataProvider>
      </ConfirmProvider>
    </ToastProvider>
  </SettingsProvider>
);
