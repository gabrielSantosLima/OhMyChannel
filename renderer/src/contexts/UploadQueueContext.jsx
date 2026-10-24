import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { api, t } from "../lib/api.js";
import {
  fileName,
  genId,
  getDroppedPath,
  hasFileDrag,
  isImageFile,
  isVideoFile,
  itemOverrides,
  serializeField,
  statusText,
  thumbnailPlaceholders,
  toIsoOrNull,
} from "../lib/serialize.js";
import { useAppData } from "./AppDataContext.jsx";
import { useSettings } from "./SettingsContext.jsx";
import { useToast } from "./ToastContext.jsx";

const UploadQueueContext = createContext(null);

function createItem(filePath) {
  return {
    id: genId(),
    filePath,
    fileName: fileName(filePath),
    initialTitle: fileName(filePath).replace(/\.[^.]+$/, ""),
    status: "pending",
    percent: 0,
    cancelled: false,
    renderedPath: null,
    thumbnailPath: null,
    thumbnailValues: {},
    thumbTemplateId: "",
    thumbColorEnabled: false,
    thumbColor: "#efe6d5",
    thumbShadowEnabled: false,
    thumbShadow: "#000000",
    introId: "",
    playlistId: "",
    publishAt: "",
  };
}

export function UploadQueueProvider({ children }) {
  const { notify } = useToast();
  const { settings } = useSettings();
  const {
    templates,
    thumbnailTemplates,
    intros,
    aiConfig,
    aiChannel,
    playlists,
  } = useAppData();
  const [items, setItems] = useState([]);
  const itemsRef = useRef(items);
  const cardsRef = useRef(new Map());
  cardsRef.current = cardsRef.current || new Map();
  itemsRef.current = items;

  const latestData = useRef({});
  latestData.current = {
    templates,
    thumbnailTemplates,
    intros,
    aiConfig,
    aiChannel,
    playlists,
    settings,
  };

  const updateItem = useCallback((id, patch) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, ...(typeof patch === "function" ? patch(item) : patch) }
          : item
      )
    );
  }, []);

  const getItem = useCallback(
    (id) => itemsRef.current.find((item) => item.id === id) || null,
    []
  );

  const registerCard = useCallback((id, cardApi) => {
    cardsRef.current.set(id, cardApi);
    return () => {
      if (cardsRef.current.get(id) === cardApi) cardsRef.current.delete(id);
    };
  }, []);

  const addItem = useCallback((filePath) => {
    const item = createItem(filePath);
    setItems((current) => [...current, item]);
    return item;
  }, []);

  const addFiles = useCallback(async () => {
    const files = await api.pickVideo();
    if (!files || files.length === 0) return;
    files.forEach(addItem);
    notify(
      files.length === 1
        ? t("msg.videosAddedOne")
        : t("msg.videosAdded", { count: files.length })
    );
  }, [addItem, notify]);

  const removeItem = useCallback(
    (id) => {
      const item = getItem(id);
      if (!item || item.status === "uploading") return;
      setItems((current) => current.filter((entry) => entry.id !== id));
      cardsRef.current.delete(id);
      notify(t("msg.videoRemoved"));
    },
    [getItem, notify]
  );

  const startUpload = useCallback(
    async (item) => {
      if (!item || item.status === "uploading" || item.status === "done") return;
      const card = cardsRef.current.get(item.id);
      const title = (card ? card.getTitle() : "").slice(0, 100);
      if (!title.trim()) {
        notify(t("msg.needsTitle"), { type: "error" });
        return;
      }

      let thumbnailPath = item.thumbnailPath || null;
      const template = latestData.current.thumbnailTemplates.find(
        (entry) => entry.id === item.thumbTemplateId
      );
      if (template) {
        try {
          const generated = await api.generateThumbnail({
            template,
            values: item.thumbnailValues,
            overrides: itemOverrides(item),
          });
          thumbnailPath = generated.path;
        } catch (err) {
          notify(t("msg.thumbnailGenFailed", { message: err.message }), {
            type: "error",
          });
          return;
        }
      }

      updateItem(item.id, {
        status: "uploading",
        cancelled: false,
        percent: 0,
      });

      try {
        const result = await api.upload({
          id: item.id,
          filePath: item.renderedPath || item.filePath,
          title,
          description: serializeField(
            card ? card.getDescription() : null,
            latestData.current.templates
          ).slice(0, 5000),
          playlistId: item.playlistId || null,
          publishAt: toIsoOrNull(item.publishAt),
          thumbnailPath,
        });
        updateItem(item.id, { status: "done", percent: 100 });
        const warnings =
          result.warnings && result.warnings.length
            ? " - " + result.warnings.join("; ")
            : "";
        notify(
          t("msg.uploaded", {
            title,
            url: `https://youtu.be/${result.id}`,
            warnings,
          }),
          {
            type:
              result.warnings && result.warnings.length ? "error" : "success",
          }
        );
      } catch (err) {
        const current = getItem(item.id);
        updateItem(item.id, {
          status: current && current.cancelled ? "canceled" : "error",
        });
        if (!(current && current.cancelled)) {
          notify(t("msg.uploadError", { message: err.message }), {
            type: "error",
          });
        }
      }
    },
    [getItem, notify, updateItem]
  );

  const startRender = useCallback(
    async (item) => {
      if (!item) return;
      if (
        item.status === "uploading" ||
        item.status === "rendering" ||
        item.status === "queued"
      ) {
        return;
      }
      const intro = latestData.current.intros.find(
        (entry) => entry.id === item.introId
      );
      if (!intro) return;

      updateItem(item.id, {
        status: "queued",
        cancelled: false,
        percent: 0,
      });

      try {
        const result = await api.renderVideo({
          id: item.id,
          introPath: intro.path,
          transition: intro.transition,
          volume: intro.volume,
          videoPath: item.filePath,
        });
        const rendered = { ...item, renderedPath: result.path, status: "rendered" };
        updateItem(item.id, {
          renderedPath: result.path,
          status: "rendered",
        });
        if (latestData.current.settings.autoSubmitAfterRender) {
          await startUpload(rendered);
        } else {
          notify(t("msg.rendered", { name: item.fileName }), {
            type: "success",
          });
        }
      } catch (err) {
        const current = getItem(item.id);
        updateItem(item.id, {
          status: current && current.cancelled ? "canceled" : "error",
        });
        if (!(current && current.cancelled)) {
          notify(t("msg.renderError", { message: err.message }), {
            type: "error",
          });
        }
      }
    },
    [getItem, notify, startUpload, updateItem]
  );

  const handleItemAction = useCallback(
    (item) => {
      if (item.introId && !item.renderedPath) startRender(item);
      else startUpload(item);
    },
    [startRender, startUpload]
  );

  const cancelItem = useCallback(
    async (item) => {
      if (!item) return;
      if (item.status === "rendering" || item.status === "queued") {
        updateItem(item.id, { cancelled: true, status: "canceled" });
        await api.cancelRender(item.id);
        return;
      }
      if (item.status !== "uploading") return;
      updateItem(item.id, { cancelled: true, status: "canceled" });
      await api.cancelUpload(item.id);
    },
    [updateItem]
  );

  const uploadAll = useCallback(() => {
    const pending = itemsRef.current.filter(
      (item) => item.status !== "uploading" && item.status !== "done"
    );
    pending.forEach(handleItemAction);
    if (pending.length) {
      notify(t("msg.startingUploads", { count: pending.length }));
    }
  }, [handleItemAction, notify]);

  const handleDrop = useCallback(
    (event) => {
      event.preventDefault();
      const files = Array.from(event.dataTransfer.files || []);
      const paths = files
        .map(getDroppedPath)
        .filter(Boolean)
        .filter(isVideoFile);
      if (!paths.length) {
        if (!files.some((file) => isImageFile(getDroppedPath(file)))) {
          notify(t("msg.noVideoFiles"), { type: "error" });
        }
        return;
      }
      paths.forEach(addItem);
      notify(
        paths.length === 1
          ? t("msg.videosAddedOne")
          : t("msg.videosAdded", { count: paths.length })
      );
    },
    [addItem, notify]
  );

  const setThumbTemplate = useCallback(
    (id, templateId) => {
      const template = latestData.current.thumbnailTemplates.find(
        (entry) => entry.id === templateId
      );
      const values = {};
      if (template) {
        thumbnailPlaceholders(template).forEach((key) => {
          if (key === "episode") values[key] = "1";
          else if (key === "title") {
            const card = cardsRef.current.get(id);
            values[key] = (card ? card.getTitle() : "").slice(0, 100);
          } else values[key] = key;
        });
      }
      updateItem(id, { thumbTemplateId: templateId, thumbnailValues: values });
    },
    [updateItem]
  );

  useEffect(() => {
    api.onProgress(({ id, percent }) => {
      const item = itemsRef.current.find((entry) => entry.id === id);
      if (!item || item.status !== "uploading") return;
      updateItem(id, { percent });
    });
    api.onCancelled(({ id }) => {
      updateItem(id, { status: "canceled", cancelled: true });
    });
    api.onRenderState(({ id, status }) => {
      const item = itemsRef.current.find((entry) => entry.id === id);
      if (!item || item.cancelled) return;
      if (status === "queued" || status === "rendering") {
        updateItem(id, { status });
      }
    });
    api.onRenderProgress(({ id, percent }) => {
      const item = itemsRef.current.find((entry) => entry.id === id);
      if (!item || item.cancelled) return;
      updateItem(id, { status: "rendering", percent });
    });
  }, [updateItem]);

  const value = useMemo(
    () => ({
      items,
      addFiles,
      addItem,
      removeItem,
      registerCard,
      updateItem,
      handleItemAction,
      cancelItem,
      uploadAll,
      handleDrop,
      setThumbTemplate,
      statusText: (item) => statusText(item, t),
      hasFileDrag,
    }),
    [
      items,
      addFiles,
      addItem,
      removeItem,
      registerCard,
      updateItem,
      handleItemAction,
      cancelItem,
      uploadAll,
      handleDrop,
      setThumbTemplate,
    ]
  );

  return (
    <UploadQueueContext.Provider value={value}>
      {children}
    </UploadQueueContext.Provider>
  );
}

export function useUploadQueue() {
  const context = useContext(UploadQueueContext);
  if (!context) {
    throw new Error("useUploadQueue must be used inside UploadQueueProvider");
  }
  return context;
}
