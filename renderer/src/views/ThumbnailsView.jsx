import { useEffect, useMemo, useRef, useState } from "react";
import { api, t } from "../lib/api.js";
import { useAppData } from "../contexts/AppDataContext.jsx";
import { useToast } from "../contexts/ToastContext.jsx";

const THUMB_WIDTH = 1920;
const THUMB_HEIGHT = 1080;

let elementSeed = 0;
function newElementId() {
  elementSeed += 1;
  return `el-${Date.now().toString(36)}-${elementSeed}`;
}

function defaultTextElement(fonts) {
  const names = (fonts || []).map((font) => font.name);
  const family = names.includes("BBH Hegarty")
    ? "BBH Hegarty"
    : names[0] || "BBH Hegarty";
  const entry = (fonts || []).find((font) => font.name === family);
  const hasBold = entry ? entry.weights.includes(700) : false;
  return {
    id: newElementId(),
    type: "text",
    text: "{episode}",
    fontFamily: family,
    fontWeight: hasBold ? 700 : 400,
    fontSize: 357,
    color: "#efe6d5",
    x: 60,
    y: 700,
    width: 1800,
    align: "left",
    lineHeight: 1.1,
    letterSpacing: 0,
    strokeColor: "#000000",
    strokeWidth: 0,
    shadowColor: "#000000",
    shadowBlur: 12,
    shadowX: 0,
    shadowY: 8,
  };
}

function previewText(text, parameters) {
  return String(text).replace(/\{(\w+)\}/g, (_match, key) => {
    const param = parameters.find((entry) => entry.key === key);
    if (!param) return key;
    return param.value !== "" ? param.value : key;
  });
}

function previewValues(parameters) {
  const values = {};
  parameters.forEach((param) => {
    values[param.key] = param.value;
  });
  return values;
}

function elementBox(element, parameters) {
  if (element.type === "image") {
    return {
      left: element.x,
      top: element.y,
      width: element.width || 200,
      height: element.height || 200,
    };
  }
  const lines = previewText(element.text, parameters).split("\n").length || 1;
  return {
    left: element.x,
    top: element.y,
    width: element.width || THUMB_WIDTH,
    height: element.fontSize * element.lineHeight * lines,
  };
}

function NumberField({ label, value, onChange }) {
  return (
    <label className="thumb-field">
      <span>{label}</span>
      <input
        type="number"
        value={value ?? 0}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
      />
    </label>
  );
}

function ColorField({ label, value, onChange }) {
  return (
    <label className="thumb-field">
      <span>{label}</span>
      <input
        type="color"
        value={/^#[0-9a-f]{6}$/i.test(value || "") ? value : "#000000"}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function SelectField({ label, value, options, onChange, numeric = false }) {
  return (
    <label className="thumb-field">
      <span>{label}</span>
      <select
        value={String(value)}
        onChange={(event) =>
          onChange(numeric ? Number(event.target.value) : event.target.value)
        }
      >
        {options.map((option) => (
          <option key={String(option)} value={String(option)}>
            {String(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ThumbnailsView({ active, navigate }) {
  const { thumbnailTemplates, thumbnailFonts, saveThumbnailTemplates } =
    useAppData();
  const { notify } = useToast();
  const stageWrapRef = useRef(null);
  const stageRef = useRef(null);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [backgroundPath, setBackgroundPath] = useState(null);
  const [parameters, setParameters] = useState([]);
  const [elements, setElements] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState("");
  const [stageImage, setStageImage] = useState("");
  const [scale, setScale] = useState(1);
  const [contextMenu, setContextMenu] = useState(null);
  const [insertKey, setInsertKey] = useState("");

  const selected = elements.find((element) => element.id === selectedId) || null;

  const resetEditor = () => {
    const initial = defaultTextElement(thumbnailFonts);
    setEditingId(null);
    setName("");
    setBackgroundPath(null);
    setParameters([]);
    setElements([initial]);
    setSelectedId(initial.id);
    setError("");
  };

  useEffect(() => {
    if (thumbnailFonts.length && elements.length === 0) {
      const initial = defaultTextElement(thumbnailFonts);
      setElements([initial]);
      setSelectedId(initial.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thumbnailFonts]);

  useEffect(() => {
    if (!active) return;
    const update = () => {
      const width = stageWrapRef.current
        ? stageWrapRef.current.clientWidth
        : THUMB_WIDTH;
      setScale(width / THUMB_WIDTH);
    };
    update();
    const observer = new ResizeObserver(update);
    if (stageWrapRef.current) observer.observe(stageWrapRef.current);
    return () => observer.disconnect();
  }, [active]);

  useEffect(() => {
    const keys = new Set();
    elements.forEach((element) => {
      if (element.type !== "text") return;
      (String(element.text).match(/\{(\w+)\}/g) || []).forEach((match) =>
        keys.add(match.slice(1, -1))
      );
    });
    const detected = [...keys];
    setParameters((current) => {
      const next = detected.map(
        (key) =>
          current.find((param) => param.key === key) || {
            key,
            mode: "dynamic",
            value: "",
          }
      );
      return JSON.stringify(next) === JSON.stringify(current) ? current : next;
    });
  }, [elements]);

  useEffect(() => {
    if (!active || elements.length === 0) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const template = {
          id: editingId || undefined,
          name: name || "Untitled",
          width: THUMB_WIDTH,
          height: THUMB_HEIGHT,
          backgroundPath,
          parameters: parameters.map((param) => ({ ...param })),
          elements,
        };
        const dataUrl = await api.generateThumbnail({
          template,
          values: previewValues(parameters),
          asDataUrl: true,
        });
        if (!cancelled) {
          setStageImage(dataUrl);
          setError("");
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [active, elements, parameters, backgroundPath, editingId, name]);

  const updateElement = (id, key, value) => {
    setElements((current) =>
      current.map((element) =>
        element.id === id ? { ...element, [key]: value } : element
      )
    );
  };

  const startDrag = (event, element) => {
    if (event.button !== 0) return;
    event.preventDefault();
    setSelectedId(element.id);
    const startX = event.clientX;
    const startY = event.clientY;
    const originX = element.x;
    const originY = element.y;
    const move = (moveEvent) => {
      const x = Math.round(originX + (moveEvent.clientX - startX) / scale);
      const y = Math.round(originY + (moveEvent.clientY - startY) / scale);
      setElements((current) =>
        current.map((entry) =>
          entry.id === element.id ? { ...entry, x, y } : entry
        )
      );
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const addTextElement = () => {
    const element = defaultTextElement(thumbnailFonts);
    element.text = t("thumbnails.newText");
    setElements((current) => [...current, element]);
    setSelectedId(element.id);
    setContextMenu(null);
  };

  const addImageElement = async () => {
    const path = await api.pickThumbnail();
    if (!path) return;
    const element = {
      id: newElementId(),
      type: "image",
      src: path,
      x: 120,
      y: 120,
      width: 400,
      height: 400,
      opacity: 1,
    };
    setElements((current) => [...current, element]);
    setSelectedId(element.id);
    setContextMenu(null);
  };

  const duplicateElement = (element) => {
    const copy = JSON.parse(JSON.stringify(element));
    copy.id = newElementId();
    copy.x += 30;
    copy.y += 30;
    setElements((current) => [...current, copy]);
    setSelectedId(copy.id);
  };

  const bringToFront = (element) => {
    setElements((current) => [
      ...current.filter((entry) => entry.id !== element.id),
      element,
    ]);
  };

  const sendToBack = (element) => {
    setElements((current) => [
      element,
      ...current.filter((entry) => entry.id !== element.id),
    ]);
  };

  const deleteElement = (element) => {
    setElements((current) => current.filter((entry) => entry.id !== element.id));
    if (selectedId === element.id) setSelectedId(null);
  };

  const chooseBackground = async () => {
    const path = await api.pickThumbnail();
    if (path) setBackgroundPath(path);
  };

  const chooseImage = async (element) => {
    const path = await api.pickThumbnail();
    if (path) updateElement(element.id, "src", path);
  };

  const currentTemplate = (overrideName) => ({
    id: editingId || undefined,
    name: overrideName || name.trim() || "Untitled",
    width: THUMB_WIDTH,
    height: THUMB_HEIGHT,
    backgroundPath,
    parameters: parameters.map((param) => ({ ...param })),
    elements,
  });

  const save = async () => {
    if (!name.trim()) {
      setError(t("templates.errorName"));
      return;
    }
    const template = currentTemplate(name.trim());
    const next = [...thumbnailTemplates];
    const index = next.findIndex((entry) => entry.id === template.id);
    if (index === -1) next.push(template);
    else next[index] = template;
    try {
      await saveThumbnailTemplates(next);
      notify(t("thumbnails.saved"), { type: "success" });
      resetEditor();
    } catch (err) {
      setError(err.message);
    }
  };

  const exportThumb = async () => {
    try {
      await api.exportThumbnail({
        template: currentTemplate(),
        values: previewValues(parameters),
      });
    } catch (err) {
      setError(err.message);
    }
  };

  const editTemplate = (template) => {
    setEditingId(template.id);
    setName(template.name || "");
    setBackgroundPath(template.backgroundPath || null);
    setParameters((template.parameters || []).map((param) => ({ ...param })));
    const copy = JSON.parse(JSON.stringify(template.elements || []));
    setElements(copy);
    setSelectedId(copy.length ? copy[0].id : null);
    setError("");
  };

  const deleteTemplate = async (template) => {
    await saveThumbnailTemplates(
      thumbnailTemplates.filter((entry) => entry.id !== template.id)
    );
  };

  const elementMenu = (element) => [
    { label: t("common.edit"), action: () => setSelectedId(element.id) },
    { label: t("common.duplicate"), action: () => duplicateElement(element) },
    { label: t("common.bringToFront"), action: () => bringToFront(element) },
    { label: t("common.sendToBack"), action: () => sendToBack(element) },
    { separator: true },
    { label: t("common.delete"), action: () => deleteElement(element) },
  ];

  const canvasMenu = [
    { label: t("common.addText"), action: addTextElement },
    { label: t("common.addImage"), action: addImageElement },
    { separator: true },
    { label: t("common.exportPng"), action: exportThumb },
  ];

  const insertParameter = () => {
    if (!selected || selected.type !== "text") return;
    const key = insertKey.replace(/[^a-zA-Z0-9_]/g, "");
    if (!key) return;
    updateElement(selected.id, "text", selected.text + `{${key}}`);
    setInsertKey("");
    setParameters((current) =>
      current.some((param) => param.key === key)
        ? current
        : [...current, { key, mode: "dynamic", value: "" }]
    );
  };

  const boxes = useMemo(
    () =>
      elements.map((element) => ({
        element,
        box: elementBox(element, parameters),
      })),
    [elements, parameters]
  );

  return (
    <section className={"view" + (active ? " active" : "")}>
      <h2>{t("thumbnails.title")}</h2>
      <div className="thumb-toolbar">
        <input
          type="text"
          placeholder={t("thumbnails.namePlaceholder")}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <button type="button" onClick={chooseBackground}>
          {t("thumbnails.background")}
        </button>
        <button type="button" onClick={exportThumb}>
          {t("thumbnails.export")}
        </button>
        <button type="button" className="primary" onClick={save}>
          {t("common.save")}
        </button>
        <button type="button" className="ghost" onClick={resetEditor}>
          {t("common.new")}
        </button>
        <span className="tpl-error">{error}</span>
      </div>

      <div className="thumb-workspace">
        <div className="thumb-stage-wrap" ref={stageWrapRef}>
          <div
            className="thumb-stage"
            ref={stageRef}
            style={{ transform: `scale(${scale})` }}
            onMouseDown={(event) => {
              if (
                event.target === stageRef.current ||
                event.target.classList.contains("thumb-stage-img") ||
                event.target.classList.contains("thumb-stage-boxes")
              ) {
                setSelectedId(null);
              }
            }}
            onContextMenu={(event) => {
              event.preventDefault();
              const box =
                event.target.closest && event.target.closest(".thumb-box");
              if (box) {
                const element = elements.find(
                  (entry) => entry.id === box.dataset.id
                );
                if (!element) return;
                setSelectedId(element.id);
                setContextMenu({
                  x: event.clientX,
                  y: event.clientY,
                  items: elementMenu(element),
                });
              } else {
                setContextMenu({
                  x: event.clientX,
                  y: event.clientY,
                  items: canvasMenu,
                });
              }
            }}
          >
            {stageImage ? (
              <img
                className="thumb-stage-img"
                src={stageImage}
                alt="Thumbnail preview"
              />
            ) : null}
            <div className="thumb-stage-boxes">
              {boxes.map(({ element, box }) => (
                <div
                  key={element.id}
                  className={
                    "thumb-box" +
                    (element.id === selectedId ? " selected" : "")
                  }
                  data-id={element.id}
                  style={{
                    left: box.left + "px",
                    top: box.top + "px",
                    width: box.width + "px",
                    height: box.height + "px",
                  }}
                  onMouseDown={(event) => startDrag(event, element)}
                />
              ))}
            </div>
          </div>
        </div>

        <aside className="thumb-props">
          {!selected ? (
            <span className="muted">{t("thumbnails.selectElement")}</span>
          ) : (
            <>
              <div className="thumb-props-title">
                {selected.type === "image"
                  ? t("thumbnails.imageElement")
                  : t("thumbnails.textElement")}
              </div>
              <div className="thumb-grid">
                <NumberField
                  label={t("thumbnails.field.x")}
                  value={selected.x}
                  onChange={(value) => updateElement(selected.id, "x", value)}
                />
                <NumberField
                  label={t("thumbnails.field.y")}
                  value={selected.y}
                  onChange={(value) => updateElement(selected.id, "y", value)}
                />
                <NumberField
                  label={t("thumbnails.field.width")}
                  value={selected.width}
                  onChange={(value) =>
                    updateElement(selected.id, "width", value)
                  }
                />
                {selected.type === "image" ? (
                  <>
                    <NumberField
                      label={t("thumbnails.field.height")}
                      value={selected.height}
                      onChange={(value) =>
                        updateElement(selected.id, "height", value)
                      }
                    />
                    <NumberField
                      label={t("thumbnails.field.opacity")}
                      value={selected.opacity}
                      onChange={(value) =>
                        updateElement(selected.id, "opacity", value)
                      }
                    />
                  </>
                ) : (
                  <>
                    <NumberField
                      label={t("thumbnails.field.lineHeight")}
                      value={selected.lineHeight}
                      onChange={(value) =>
                        updateElement(selected.id, "lineHeight", value)
                      }
                    />
                    <NumberField
                      label={t("thumbnails.field.spacing")}
                      value={selected.letterSpacing}
                      onChange={(value) =>
                        updateElement(selected.id, "letterSpacing", value)
                      }
                    />
                    <SelectField
                      label={t("thumbnails.field.weight")}
                      value={selected.fontWeight}
                      numeric
                      options={[100, 200, 300, 400, 500, 600, 700, 800, 900]}
                      onChange={(value) =>
                        updateElement(selected.id, "fontWeight", value)
                      }
                    />
                    <SelectField
                      label={t("thumbnails.field.align")}
                      value={selected.align}
                      options={["left", "center", "right"]}
                      onChange={(value) =>
                        updateElement(selected.id, "align", value)
                      }
                    />
                  </>
                )}
              </div>

              {selected.type === "image" ? (
                <div className="thumb-row">
                  <button type="button" onClick={() => chooseImage(selected)}>
                    {t("common.chooseImage")}
                  </button>
                </div>
              ) : (
                <>
                  <label className="thumb-field">
                    <span>{t("thumbnails.field.font")}</span>
                    <select
                      value={selected.fontFamily}
                      onChange={(event) =>
                        updateElement(
                          selected.id,
                          "fontFamily",
                          event.target.value
                        )
                      }
                    >
                      {thumbnailFonts.map((font) => (
                        <option key={font.name} value={font.name}>
                          {font.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="thumb-field">
                    <span>{t("thumbnails.field.text")}</span>
                    <textarea
                      rows="2"
                      placeholder={t("thumbnails.textPlaceholder")}
                      value={selected.text}
                      onChange={(event) =>
                        updateElement(selected.id, "text", event.target.value)
                      }
                    />
                  </label>
                  <div className="thumb-row">
                    <input
                      type="text"
                      placeholder={t("thumbnails.paramNamePlaceholder")}
                      value={insertKey}
                      onChange={(event) => setInsertKey(event.target.value)}
                    />
                    <button type="button" onClick={insertParameter}>
                      {t("common.insert")}
                    </button>
                  </div>
                  <div className="thumb-grid">
                    <ColorField
                      label={t("thumbnails.field.color")}
                      value={selected.color}
                      onChange={(value) =>
                        updateElement(selected.id, "color", value)
                      }
                    />
                    <ColorField
                      label={t("thumbnails.field.stroke")}
                      value={selected.strokeColor}
                      onChange={(value) =>
                        updateElement(selected.id, "strokeColor", value)
                      }
                    />
                    <NumberField
                      label={t("thumbnails.field.strokeWidth")}
                      value={selected.strokeWidth}
                      onChange={(value) =>
                        updateElement(selected.id, "strokeWidth", value)
                      }
                    />
                    <ColorField
                      label={t("thumbnails.field.shadow")}
                      value={selected.shadowColor}
                      onChange={(value) =>
                        updateElement(selected.id, "shadowColor", value)
                      }
                    />
                    <NumberField
                      label={t("thumbnails.field.blur")}
                      value={selected.shadowBlur}
                      onChange={(value) =>
                        updateElement(selected.id, "shadowBlur", value)
                      }
                    />
                    <NumberField
                      label={t("thumbnails.field.shadowX")}
                      value={selected.shadowX}
                      onChange={(value) =>
                        updateElement(selected.id, "shadowX", value)
                      }
                    />
                    <NumberField
                      label={t("thumbnails.field.shadowY")}
                      value={selected.shadowY}
                      onChange={(value) =>
                        updateElement(selected.id, "shadowY", value)
                      }
                    />
                  </div>
                </>
              )}
            </>
          )}
        </aside>
      </div>

      <div className="thumb-params">
        {parameters.length === 0 ? (
          <span className="muted">{t("thumbnails.noParams")}</span>
        ) : (
          parameters.map((param) => (
            <div className="thumb-param" key={param.key}>
              <span className="thumb-param-key">{"{" + param.key + "}"}</span>
              <select
                value={param.mode}
                onChange={(event) =>
                  setParameters((current) =>
                    current.map((entry) =>
                      entry.key === param.key
                        ? { ...entry, mode: event.target.value }
                        : entry
                    )
                  )
                }
              >
                <option value="dynamic">dynamic</option>
                <option value="static">static</option>
              </select>
              <input
                type="text"
                value={param.value}
                placeholder={
                  param.mode === "static"
                    ? t("thumbnails.fixedValue")
                    : t("thumbnails.previewValue")
                }
                onChange={(event) =>
                  setParameters((current) =>
                    current.map((entry) =>
                      entry.key === param.key
                        ? { ...entry, value: event.target.value }
                        : entry
                    )
                  )
                }
              />
            </div>
          ))
        )}
      </div>

      {contextMenu ? (
        <>
          <div
            className="thumb-context-dismiss"
            onMouseDown={() => setContextMenu(null)}
          />
          <div
            className="context-menu"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {contextMenu.items.map((entry, index) =>
              entry.separator ? (
                <div className="context-sep" key={`sep-${index}`} />
              ) : (
                <div
                  className="context-item"
                  key={entry.label + index}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    setContextMenu(null);
                    entry.action();
                  }}
                >
                  {entry.label}
                </div>
              )
            )}
          </div>
        </>
      ) : null}

      <div className="tpl-list">
        {thumbnailTemplates.length === 0 ? (
          <div className="tpl-empty">{t("thumbnails.empty")}</div>
        ) : (
          thumbnailTemplates.map((template) => (
            <div className="tpl-item" key={template.id}>
              <div className="tpl-info">
                <span className="tpl-name">{template.name}</span>
                <span className="tpl-detail">
                  {(template.elements || []).length} element(s) |{" "}
                  {(template.parameters || []).length} parameter(s)
                </span>
              </div>
              <div className="tpl-item-actions">
                <button
                  type="button"
                  className="ghost"
                  onClick={() => editTemplate(template)}
                >
                  {t("common.edit")}
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={() => deleteTemplate(template)}
                >
                  {t("common.delete")}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
