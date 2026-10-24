import { useEffect, useMemo, useRef, useState } from "react";
import { api, t } from "../lib/api.js";
import {
  fileName,
  getDroppedPath,
  hasFileDrag,
  isImageFile,
  itemOverrides,
  serializeField,
  thumbnailPlaceholders,
  toIsoOrNull,
} from "../lib/serialize.js";
import { useAppData } from "../contexts/AppDataContext.jsx";
import { useSettings } from "../contexts/SettingsContext.jsx";
import { useToast } from "../contexts/ToastContext.jsx";
import { useUploadQueue } from "../contexts/UploadQueueContext.jsx";
import { CommandField } from "../components/CommandField.jsx";

function uploadButtonLabel(item) {
  if (item.renderedPath) return t("common.upload");
  if (item.introId) return t("common.edit");
  return t("common.upload");
}

export function UploadCard({ item }) {
  const {
    updateItem,
    registerCard,
    cancelItem,
    removeItem,
    handleItemAction,
    statusText,
    setThumbTemplate,
  } = useUploadQueue();
  const {
    templates,
    playlists,
    intros,
    thumbnailTemplates,
    aiConfig,
    aiChannel,
  } = useAppData();
  const { settings } = useSettings();
  const { notify } = useToast();

  const titleRef = useRef(null);
  const descRef = useRef(null);
  const itemRef = useRef(item);
  const dataRef = useRef({});
  const thumbFieldRef = useRef(null);

  itemRef.current = item;
  dataRef.current = {
    templates,
    playlists,
    intros,
    thumbnailTemplates,
    aiConfig,
    aiChannel,
    settings,
  };

  const [titleLength, setTitleLength] = useState(0);
  const [preview, setPreview] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const getPlaylistValue = () => {
    const playlist = dataRef.current.playlists.find(
      (entry) => entry.id === itemRef.current.playlistId
    );
    if (!playlist) return null;
    return {
      id: playlist.id,
      title: playlist.title,
      url: `https://www.youtube.com/playlist?list=${playlist.id}`,
    };
  };

  const getIntroValue = () => {
    const intro = dataRef.current.intros.find(
      (entry) => entry.id === itemRef.current.introId
    );
    return intro ? { name: intro.name } : null;
  };

  const getThumbnailValue = () =>
    itemRef.current.thumbnailPath
      ? { name: fileName(itemRef.current.thumbnailPath) }
      : null;

  const getChannelValue = () => ({
    name:
      dataRef.current.aiConfig.channelName ||
      (dataRef.current.aiChannel ? dataRef.current.aiChannel.name : ""),
    url:
      dataRef.current.aiConfig.channelUrl ||
      (dataRef.current.aiChannel ? dataRef.current.aiChannel.url : ""),
  });

  const getTitle = () =>
    serializeField(titleRef.current, dataRef.current.templates)
      .replace(/\u200B/g, "")
      .trim();

  const buildContext = (role) => ({
    getTitle,
    getFileName: () => itemRef.current.fileName,
    getPlaylist: getPlaylistValue,
    getPublishDate: () => itemRef.current.publishAt,
    getIntro: getIntroValue,
    getThumbnail: getThumbnailValue,
    getChannel: getChannelValue,
    checkAi: (targetRole) => {
      const effectiveRole = targetRole || role;
      if (!dataRef.current.aiConfig.model) {
        return { ok: false, error: t("ai.errorNoModel") };
      }
      if (!dataRef.current.aiConfig.hasApiKey) {
        return { ok: false, error: t("ai.errorNoKey") };
      }
      const template = dataRef.current.aiConfig.template || "";
      if (
        effectiveRole === "description" &&
        /\$playlist_/.test(template) &&
        !getPlaylistValue()
      ) {
        return { ok: false, error: t("ai.errorPlaylist") };
      }
      return { ok: true };
    },
  });

  const titleContext = useMemo(() => buildContext("title"), []);
  const descContext = useMemo(() => buildContext("description"), []);

  const generateItemAi = async (brief, role) => {
    const playlist = getPlaylistValue();
    const intro = getIntroValue();
    const thumbnail = getThumbnailValue();
    const channel = getChannelValue();
    const result = await api.generateDescription({
      brief,
      fieldRole: role,
      variables: {
        title: getTitle(),
        file_name: itemRef.current.fileName,
        playlist_name: playlist ? playlist.title : "",
        playlist_link: playlist ? playlist.url : "",
        publish_date: itemRef.current.publishAt,
        intro_name: intro ? intro.name : "",
        thumbnail_name: thumbnail ? thumbnail.name : "",
        channel_name: channel.name,
        channel_link: channel.url,
      },
      language: dataRef.current.settings.language || "en",
    });
    if (role === "description") {
      return {
        text: result.text,
        richTemplate:
          result.template || dataRef.current.aiConfig.template || "",
        richValues: {
          description: result.description || "",
          hashtags: Array.isArray(result.hashtags)
            ? result.hashtags.join(" ")
            : "",
        },
      };
    }
    return result.text;
  };

  useEffect(() => {
    return registerCard(item.id, {
      getTitle,
      getDescription: () =>
        serializeField(descRef.current, dataRef.current.templates),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  const selectedTemplate = thumbnailTemplates.find(
    (template) => template.id === item.thumbTemplateId
  );
  const placeholderKeys = selectedTemplate
    ? thumbnailPlaceholders(selectedTemplate)
    : [];

  useEffect(() => {
    if (!selectedTemplate) {
      setPreview("");
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const dataUrl = await api.generateThumbnail({
          template: selectedTemplate,
          values: item.thumbnailValues,
          overrides: itemOverrides(item),
          asDataUrl: true,
        });
        if (!cancelled) setPreview(dataUrl);
      } catch {
        if (!cancelled) setPreview("");
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    selectedTemplate,
    item.thumbTemplateId,
    item.thumbColorEnabled,
    item.thumbColor,
    item.thumbShadowEnabled,
    item.thumbShadow,
    JSON.stringify(item.thumbnailValues),
  ]);

  const copyDescription = async () => {
    const text = serializeField(descRef.current, dataRef.current.templates);
    if (!text.trim()) {
      notify(t("msg.descriptionEmpty"), { type: "error" });
      return;
    }
    try {
      await api.copyText(text);
      notify(t("msg.descriptionCopied"), { type: "success" });
    } catch (err) {
      notify(t("msg.copyFailed", { message: err.message }), { type: "error" });
    }
  };

  const chooseThumbnail = async () => {
    const path = await api.pickThumbnail();
    if (path) updateItem(item.id, { thumbnailPath: path });
  };

  const handleThumbDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOver(false);
    const file = event.dataTransfer.files[0];
    const path = file ? getDroppedPath(file) : "";
    if (path && isImageFile(path)) {
      updateItem(item.id, { thumbnailPath: path });
    } else {
      notify(t("msg.dropImage"), { type: "error" });
    }
  };

  const busy =
    item.status === "uploading" ||
    item.status === "rendering" ||
    item.status === "queued";
  const done = item.status === "done";
  const label = uploadButtonLabel(item);
  const disabled = done || (label === t("common.upload") && !titleLength);

  const refreshToken = [
    item.playlistId,
    item.publishAt,
    item.introId,
    item.thumbnailPath,
    aiConfig.channelName,
    aiConfig.channelUrl,
  ].join("|");

  return (
    <div className="upload-card">
      <div className="card-head">
        <span className="card-file" title={item.filePath}>
          {item.fileName}
        </span>
        <span className={"card-status " + item.status}>
          {statusText(item)}
        </span>
      </div>

      <CommandField
        label={t("item.title")}
        placeholder={t("item.titlePlaceholder")}
        max={200}
        counterMax={100}
        initialValue={item.initialTitle}
        role="title"
        context={titleContext}
        templates={templates}
        generateAi={(brief) => generateItemAi(brief, "title")}
        refreshToken={refreshToken}
        onLengthChange={setTitleLength}
        onChange={() => {}}
        inputRef={titleRef}
      />

      <CommandField
        label={t("item.description")}
        action={
          <button
            type="button"
            className="icon-button"
            title={t("item.copyDescription")}
            aria-label={t("item.copyDescription")}
            onClick={copyDescription}
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="9" y="9" width="12" height="12" rx="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
          </button>
        }
        placeholder={t("item.descriptionPlaceholder")}
        multiline
        max={5000}
        counterMax={5000}
        role="description"
        context={descContext}
        templates={templates}
        generateAi={(brief) => generateItemAi(brief, "description")}
        refreshToken={refreshToken}
        onChange={() => {}}
        inputRef={descRef}
      />

      <div className="card-options">
        <div className="opt">
          <label>{t("item.playlist")}</label>
          <select
            className="opt-select"
            value={item.playlistId}
            onChange={(event) =>
              updateItem(item.id, { playlistId: event.target.value })
            }
          >
            <option value="">{t("item.playlistNone")}</option>
            {playlists.map((playlist) => (
              <option key={playlist.id} value={playlist.id}>
                {playlist.title}
              </option>
            ))}
          </select>
        </div>

        <div className="opt">
          <label>{t("item.publishAt")}</label>
          <input
            type="datetime-local"
            value={item.publishAt}
            onChange={(event) => {
              updateItem(item.id, { publishAt: event.target.value });
            }}
          />
        </div>

        <div
          className={"opt thumb-opt" + (dragOver ? " drag-over" : "")}
          ref={thumbFieldRef}
          onDragEnter={(event) => {
            if (!hasFileDrag(event)) return;
            event.preventDefault();
            event.stopPropagation();
            setDragOver(true);
          }}
          onDragOver={(event) => {
            if (!hasFileDrag(event)) return;
            event.preventDefault();
            event.stopPropagation();
            event.dataTransfer.dropEffect = "copy";
            setDragOver(true);
          }}
          onDragLeave={(event) => {
            if (
              event.relatedTarget &&
              thumbFieldRef.current.contains(event.relatedTarget)
            ) {
              return;
            }
            setDragOver(false);
          }}
          onDrop={handleThumbDrop}
        >
          <label>{t("item.thumbnail")}</label>
          <div className="thumb-row">
            <button type="button" onClick={chooseThumbnail}>
              {t("common.chooseImage")}
            </button>
            <span className="thumb-name">
              {item.thumbnailPath
                ? fileName(item.thumbnailPath)
                : t("item.noImage")}
            </span>
            {item.thumbnailPath ? (
              <button
                type="button"
                className="ghost"
                onClick={() => updateItem(item.id, { thumbnailPath: null })}
              >
                {t("common.remove")}
              </button>
            ) : null}
          </div>
        </div>

        <div className="opt">
          <label>{t("item.thumbnailTemplate")}</label>
          <select
            className="opt-select"
            value={item.thumbTemplateId}
            onChange={(event) => setThumbTemplate(item.id, event.target.value)}
          >
            <option value="">{t("common.none")}</option>
            {thumbnailTemplates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
          <label className="thumb-override">
            <input
              type="checkbox"
              checked={item.thumbColorEnabled}
              onChange={(event) =>
                updateItem(item.id, {
                  thumbColorEnabled: event.target.checked,
                })
              }
            />
            <span>Color</span>
            <input
              type="color"
              value={item.thumbColor}
              disabled={!item.thumbColorEnabled}
              onChange={(event) =>
                updateItem(item.id, { thumbColor: event.target.value })
              }
            />
          </label>
          <label className="thumb-override">
            <input
              type="checkbox"
              checked={item.thumbShadowEnabled}
              onChange={(event) =>
                updateItem(item.id, {
                  thumbShadowEnabled: event.target.checked,
                })
              }
            />
            <span>Shadow</span>
            <input
              type="color"
              value={item.thumbShadow}
              disabled={!item.thumbShadowEnabled}
              onChange={(event) =>
                updateItem(item.id, { thumbShadow: event.target.value })
              }
            />
          </label>
          {placeholderKeys.length ? (
            <div className="thumb-values card-thumb-values">
              {placeholderKeys.map((key) => (
                <div className="thumb-field" key={key}>
                  <span>{"{" + key + "}"}</span>
                  <input
                    type="text"
                    placeholder={key}
                    value={item.thumbnailValues[key] ?? ""}
                    onChange={(event) =>
                      updateItem(item.id, {
                        thumbnailValues: {
                          ...item.thumbnailValues,
                          [key]: event.target.value,
                        },
                      })
                    }
                  />
                </div>
              ))}
            </div>
          ) : null}
          {preview ? (
            <img
              className="card-thumb-preview"
              src={preview}
              alt={t("item.thumbnail")}
            />
          ) : null}
        </div>

        <div className="opt">
          <label>{t("item.intro")}</label>
          <select
            className="opt-select"
            value={item.introId}
            onChange={(event) =>
              updateItem(item.id, {
                introId: event.target.value,
                renderedPath: null,
              })
            }
          >
            <option value="">{t("common.none")}</option>
            {intros.map((intro) => (
              <option key={intro.id} value={intro.id}>
                {intro.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card-actions">
        {!busy && !done ? (
          <button
            type="button"
            className="primary"
            disabled={disabled}
            onClick={() => handleItemAction(item)}
          >
            {label}
          </button>
        ) : null}
        {busy ? (
          <button type="button" onClick={() => cancelItem(item)}>
            {t("common.cancel")}
          </button>
        ) : null}
        {!busy ? (
          <button type="button" onClick={() => removeItem(item.id)}>
            {t("common.remove")}
          </button>
        ) : null}
        {busy || done ? (
          <div className="progress">
            <div className="bar">
              <div
                className="fill"
                style={{ width: (done ? 100 : item.percent) + "%" }}
              />
            </div>
            <span className="pct">{(done ? 100 : item.percent) + "%"}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
