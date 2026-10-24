import { useState } from "react";
import { api, t } from "../lib/api.js";
import { useAppData } from "../contexts/AppDataContext.jsx";
import { useToast } from "../contexts/ToastContext.jsx";

const STEPS = [
  {
    title: "credentials.step1.title",
    desc: "credentials.step1.desc",
    buttons: [
      {
        label: "credentials.step1.btn",
        url: "https://console.cloud.google.com/projectcreate",
      },
    ],
  },
  {
    title: "credentials.step2.title",
    desc: "credentials.step2.desc",
    buttons: [
      {
        label: "credentials.step2.btn",
        url: "https://console.cloud.google.com/apis/library/youtube.googleapis.com",
      },
    ],
  },
  {
    title: "credentials.step3.title",
    desc: "credentials.step3.desc",
    html: true,
    buttons: [
      {
        label: "credentials.step3.btn1",
        url: "https://console.cloud.google.com/auth/overview",
      },
      {
        label: "credentials.step3.btn2",
        url: "https://console.cloud.google.com/auth/audience",
      },
    ],
  },
  {
    title: "credentials.step4.title",
    desc: "credentials.step4.desc",
    html: true,
    buttons: [
      {
        label: "credentials.step4.btn",
        url: "https://console.cloud.google.com/auth/scopes",
      },
    ],
  },
  {
    title: "credentials.step5.title",
    desc: "credentials.step5.desc",
    html: true,
    buttons: [
      {
        label: "credentials.step5.btn",
        url: "https://console.cloud.google.com/auth/clients",
      },
    ],
  },
  { title: "credentials.step6.title", desc: "credentials.step6.desc", html: true },
  { title: "credentials.step7.title", desc: "credentials.step7.desc" },
];

const REFS = [
  {
    label: "credentials.ref.oauth",
    url: "https://developers.google.com/youtube/v3/guides/auth/installed-apps",
  },
  {
    label: "credentials.ref.gettingStarted",
    url: "https://developers.google.com/youtube/v3/getting-started",
  },
  {
    label: "credentials.ref.consent",
    url: "https://support.google.com/cloud/answer/6158849",
  },
  {
    label: "credentials.ref.secret",
    url: "https://support.google.com/cloud/answer/15549257",
  },
];

export function CredentialsView({ active }) {
  const { hasCredentials, importCredentials } = useAppData();
  const { notify } = useToast();
  const [error, setError] = useState("");

  const handleImport = async () => {
    const result = await importCredentials();
    if (!result || !result.ok) {
      if (result && result.error) setError(result.error);
      return;
    }
    setError("");
    notify(t("msg.credentialsImported"), { type: "success" });
  };

  return (
    <section id="view-credentials" className={"view" + (active ? " active" : "")}>
      <h2>{t("credentials.title")}</h2>
      <div className={"cred-status " + (hasCredentials ? "on" : "off")}>
        {hasCredentials
          ? t("credentials.configured")
          : t("credentials.notConfigured")}
      </div>
      <p className="muted">{t("credentials.intro")}</p>
      <ol className="timeline">
        {STEPS.map((step) => (
          <li key={step.title}>
            <div className="timeline-body">
              <span className="timeline-title">{t(step.title)}</span>
              {step.html ? (
                <span
                  className="timeline-desc"
                  dangerouslySetInnerHTML={{ __html: t(step.desc) }}
                />
              ) : (
                <span className="timeline-desc">{t(step.desc)}</span>
              )}
              {step.buttons
                ? step.buttons.map((button, buttonIndex) => (
                    <button
                      key={button.label}
                      type="button"
                      className={
                        "ghost link" + (buttonIndex > 0 ? " inline-link" : "")
                      }
                      onClick={() => api.openExternal(button.url)}
                    >
                      {t(button.label)}
                    </button>
                  ))
                : null}
            </div>
          </li>
        ))}
      </ol>
      <div className="cred-actions">
        <button type="button" className="primary" onClick={handleImport}>
          {t("credentials.import")}
        </button>
        <span className="tpl-error">{error}</span>
      </div>
      <p className="muted cred-refs">
        <span>{t("credentials.refsLabel")}</span>{" "}
        {REFS.map((ref, index) => (
          <span key={ref.label}>
            {index > 0 ? " · " : ""}
            <a
              href="#"
              onClick={(event) => {
                event.preventDefault();
                api.openExternal(ref.url);
              }}
            >
              {t(ref.label)}
            </a>
          </span>
        ))}
      </p>
      <p className="muted">{t("credentials.note")}</p>
    </section>
  );
}
