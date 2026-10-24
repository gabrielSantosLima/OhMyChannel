import { useEffect, useState } from "react";
import { api, t } from "../lib/api.js";
import { useAppData } from "../contexts/AppDataContext.jsx";
import { useConfirm } from "../contexts/ConfirmContext.jsx";

export function AiView({ active }) {
  const {
    aiConfig,
    aiModels,
    setAiModels,
    saveAiConfig,
    refreshChannelInfo,
  } = useAppData();
  const { confirm } = useConfirm();
  const [form, setForm] = useState({
    provider: "deepinfra",
    model: "",
    apiKey: "",
    channelName: "",
    channelUrl: "",
    template: "",
  });
  const [status, setStatus] = useState({ message: "", type: "" });

  useEffect(() => {
    setForm((current) => ({
      provider: aiConfig.provider || "deepinfra",
      model: aiConfig.model || "",
      apiKey: "",
      channelName: aiConfig.channelName || "",
      channelUrl: aiConfig.channelUrl || "",
      template: aiConfig.template || aiConfig.defaultTemplate || "",
    }));
    if (!aiConfig.encryptionAvailable) {
      setStatus({ message: t("ai.encryptionUnavailable"), type: "error" });
    }
  }, [aiConfig]);

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const save = async () => {
    try {
      await saveAiConfig({
        provider: form.provider,
        model: form.model.trim(),
        channelName: form.channelName.trim(),
        channelUrl: form.channelUrl.trim(),
        template: form.template,
        apiKey: form.apiKey.trim() || undefined,
      });
      setStatus({ message: t("ai.saved"), type: "ok" });
      return true;
    } catch (err) {
      setStatus({ message: err.message, type: "error" });
      return false;
    }
  };

  const removeKey = async () => {
    if (!aiConfig.hasApiKey) return;
    const confirmed = await confirm({
      title: t("ai.removeKeyTitle"),
      message: t("ai.removeKeyConfirm"),
      confirmLabel: t("ai.removeKey"),
      danger: true,
    });
    if (!confirmed) return;
    try {
      await saveAiConfig({
        provider: aiConfig.provider,
        model: aiConfig.model,
        channelName: aiConfig.channelName,
        channelUrl: aiConfig.channelUrl,
        template: aiConfig.template,
        clearApiKey: true,
      });
      setStatus({ message: t("ai.keyRemoved"), type: "ok" });
    } catch (err) {
      setStatus({ message: err.message, type: "error" });
    }
  };

  const loadModels = async () => {
    try {
      if (form.apiKey.trim()) {
        const saved = await save();
        if (!saved) return;
      }
      const models = await api.listAiModels();
      setAiModels(models);
      let nextModel = form.model;
      if (!nextModel.trim() && models.length) nextModel = models[0];
      if (nextModel !== form.model) update("model", nextModel);
      setStatus({
        message: t("ai.modelsLoaded", { count: models.length }),
        type: "ok",
      });
    } catch (err) {
      setStatus({ message: err.message, type: "error" });
    }
  };

  const testConnection = async () => {
    try {
      if (form.apiKey.trim()) {
        const saved = await save();
        if (!saved) return;
      }
      await api.testAi();
      setStatus({ message: t("ai.testSuccess"), type: "ok" });
    } catch (err) {
      setStatus({
        message: t("ai.testFailed", { message: err.message }),
        type: "error",
      });
    }
  };

  const detectChannel = async () => {
    try {
      const channel = await refreshChannelInfo();
      update("channelName", channel.name || "");
      update("channelUrl", channel.url || "");
      setStatus({ message: t("ai.channelDetected"), type: "ok" });
    } catch (err) {
      setStatus({
        message: t("ai.channelFailed", { message: err.message }),
        type: "error",
      });
    }
  };

  const modelMissing = !form.model.trim();
  const modelSelectValue = aiModels.includes(form.model) ? form.model : "";

  return (
    <section id="view-ai" className={"view" + (active ? " active" : "")}>
      <h2>{t("ai.title")}</h2>
      <p className="muted">{t("ai.intro")}</p>

      <div className="ai-form">
        <div className="setting">
          <div className="setting-info">
            <span className="setting-title">{t("ai.provider")}</span>
            <span className="setting-desc">{t("ai.providerDesc")}</span>
          </div>
          <select
            className="ai-select"
            value={form.provider}
            onChange={(event) => update("provider", event.target.value)}
          >
            <option value="deepinfra">DeepInfra</option>
          </select>
        </div>

        <div className="setting">
          <div className="setting-info">
            <span className="setting-title">{t("ai.apiKey")}</span>
            <span className="setting-desc">{t("ai.apiKeyDesc")}</span>
          </div>
          <div className="ai-field-stack">
            <input
              type="password"
              autoComplete="off"
              placeholder={t("ai.apiKeyPlaceholder")}
              value={form.apiKey}
              onChange={(event) => update("apiKey", event.target.value)}
            />
            <span
              className={
                "ai-key-state " + (aiConfig.hasApiKey ? "configured" : "missing")
              }
            >
              {aiConfig.hasApiKey
                ? t("ai.keyConfigured")
                : t("ai.keyNotConfigured")}
            </span>
            <button
              type="button"
              className="danger"
              disabled={!aiConfig.hasApiKey}
              onClick={removeKey}
            >
              {t("ai.removeKey")}
            </button>
          </div>
        </div>

        <div className="setting">
          <div className="setting-info">
            <span className="setting-title">{t("ai.model")}</span>
            <span className="setting-desc">{t("ai.modelDesc")}</span>
          </div>
          <div className="ai-field-stack">
            <input
              type="text"
              className={modelMissing ? "invalid" : ""}
              title={modelMissing ? t("ai.modelRequired") : ""}
              placeholder={t("ai.modelPlaceholder")}
              value={form.model}
              onChange={(event) => update("model", event.target.value)}
            />
            <select
              className={"ai-select" + (modelMissing ? " invalid" : "")}
              title={modelMissing ? t("ai.modelRequired") : ""}
              value={modelSelectValue}
              onChange={(event) => {
                if (event.target.value) update("model", event.target.value);
              }}
            >
              <option value="">{t("ai.modelChoose")}</option>
              {aiModels.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
            <span
              className={"ai-hint error" + (modelMissing ? "" : " hidden")}
            >
              {t("ai.modelRequired")}
            </span>
            <button type="button" onClick={loadModels}>
              {t("ai.loadModels")}
            </button>
          </div>
        </div>

        <div className="setting">
          <div className="setting-info">
            <span className="setting-title">{t("ai.channel")}</span>
            <span className="setting-desc">{t("ai.channelDesc")}</span>
          </div>
          <div className="ai-field-stack">
            <input
              type="text"
              placeholder={t("ai.channelNamePlaceholder")}
              value={form.channelName}
              onChange={(event) => update("channelName", event.target.value)}
            />
            <input
              type="text"
              placeholder={t("ai.channelUrlPlaceholder")}
              value={form.channelUrl}
              onChange={(event) => update("channelUrl", event.target.value)}
            />
            <button type="button" onClick={detectChannel}>
              {t("ai.detectChannel")}
            </button>
          </div>
        </div>

        <div className="setting ai-template-setting">
          <div className="setting-info">
            <span className="setting-title">{t("ai.template")}</span>
            <span className="setting-desc">{t("ai.templateDesc")}</span>
          </div>
          <textarea
            className="ai-template"
            rows="10"
            spellCheck={false}
            value={form.template}
            onChange={(event) => update("template", event.target.value)}
          />
          <div className="ai-actions">
            <button
              type="button"
              onClick={() => update("template", aiConfig.defaultTemplate || "")}
            >
              {t("ai.resetTemplate")}
            </button>
          </div>
        </div>

        <div className="ai-actions">
          <button type="button" className="primary" onClick={save}>
            {t("common.save")}
          </button>
          <button type="button" onClick={testConnection}>
            {t("ai.test")}
          </button>
        </div>
        <p className={"ai-status " + status.type}>{status.message}</p>
      </div>
    </section>
  );
}
