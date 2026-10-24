import { useEffect, useRef } from "react";
import { t } from "../lib/api.js";
import { useAppData } from "../contexts/AppDataContext.jsx";

export function useStaticCommands(ready) {
  const { templates, aiConfig, aiChannel } = useAppData();
  const dataRef = useRef({});
  dataRef.current = { templates, aiConfig, aiChannel };

  useEffect(() => {
    if (!ready) return;
    const channel = () => ({
      name:
        dataRef.current.aiConfig.channelName ||
        (dataRef.current.aiChannel ? dataRef.current.aiChannel.name : ""),
      url:
        dataRef.current.aiConfig.channelUrl ||
        (dataRef.current.aiChannel ? dataRef.current.aiChannel.url : ""),
    });
    const context = {
      getChannel: channel,
      checkAi: () => {
        if (!dataRef.current.aiConfig.model) {
          return { ok: false, error: t("ai.errorNoModel") };
        }
        if (!dataRef.current.aiConfig.hasApiKey) {
          return { ok: false, error: t("ai.errorNoKey") };
        }
        return { ok: true };
      },
    };
    const generate = async (brief, target) => {
      const result = await window.api.generateDescription({
        brief,
        fieldRole: target || "field",
        variables: {
          channel_name: channel().name,
          channel_link: channel().url,
        },
        language: document.documentElement.lang || "en",
      });
      return result.text;
    };

    document
      .querySelectorAll('input[type="text"], textarea')
      .forEach((input) => {
        if (input.dataset.commandsAttached === "true") return;
        if (input.disabled || input.readOnly) return;
        window.AppCommands.attach({
          input,
          role: input.classList.contains("ai-template") ? "template" : "other",
          context,
          getTemplates: () => dataRef.current.templates,
          generateAi: generate,
        });
        input.dataset.commandsAttached = "true";
      });
  }, [ready]);
}
