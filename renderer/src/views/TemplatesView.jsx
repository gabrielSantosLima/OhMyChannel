import { useState } from "react";
import { t } from "../lib/api.js";
import { useAppData } from "../contexts/AppDataContext.jsx";

export function TemplatesView({ active }) {
  const { templates, saveTemplates } = useAppData();
  const [name, setName] = useState("");
  const [params, setParams] = useState("");
  const [pattern, setPattern] = useState("");
  const [error, setError] = useState("");

  const addTemplate = async () => {
    const cleanName = name.trim().replace(/\s+/g, "");
    const cleanParams = params
      .split(",")
      .map((param) => param.trim().replace(/\s+/g, ""))
      .filter(Boolean);
    const cleanPattern = pattern.trim();

    if (!cleanName) return setError(t("templates.errorName"));
    if (templates.some((entry) => entry.name === cleanName)) {
      return setError(t("templates.errorExists"));
    }
    if (!cleanPattern) return setError(t("templates.errorPattern"));
    for (const param of cleanParams) {
      if (!cleanPattern.includes("{" + param + "}")) {
        return setError(t("templates.errorParam", { param }));
      }
    }

    await saveTemplates([
      ...templates,
      {
        id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        name: cleanName,
        params: cleanParams,
        pattern: cleanPattern,
      },
    ]);
    setError("");
    setName("");
    setParams("");
    setPattern("");
  };

  const deleteTemplate = async (id) => {
    await saveTemplates(templates.filter((entry) => entry.id !== id));
  };

  return (
    <section id="view-templates" className={"view" + (active ? " active" : "")}>
      <h2>{t("templates.title")}</h2>
      <div className="tpl-form">
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t("templates.namePlaceholder")}
        />
        <input
          type="text"
          value={params}
          onChange={(event) => setParams(event.target.value)}
          placeholder={t("templates.paramsPlaceholder")}
        />
        <input
          type="text"
          value={pattern}
          onChange={(event) => setPattern(event.target.value)}
          placeholder={t("templates.patternPlaceholder")}
        />
        <button type="button" className="primary" onClick={addTemplate}>
          {t("templates.add")}
        </button>
        <span className="tpl-error">{error}</span>
      </div>
      <div className="tpl-list">
        {templates.length === 0 ? (
          <div className="tpl-empty">{t("templates.empty")}</div>
        ) : (
          templates.map((template) => (
            <div className="tpl-item" key={template.id}>
              <div className="tpl-info">
                <span className="tpl-name">{template.name}</span>
                <span className="tpl-detail">
                  {template.pattern}
                  {template.params.length
                    ? ` | ${t("templates.detailParams")}: ${template.params.join(", ")}`
                    : ""}
                </span>
              </div>
              <button
                type="button"
                className="danger"
                onClick={() => deleteTemplate(template.id)}
              >
                {t("common.delete")}
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
