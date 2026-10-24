import "../../i18n.js";
import "../../variables.js";
import "../../commands.js";

export function serializeNode(node, templates) {
  if (!node) return "";
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent.replace(/\u200B/g, "");
  }
  if (node.nodeName === "BR") return "\n";
  if (node.nodeType === Node.ELEMENT_NODE) {
    if (node.classList.contains("ai-cmd")) return "";
    if (node.classList.contains("cmd")) {
      const template = findTemplate(templates, node.dataset.template);
      if (!template) return "";
      const values = Array.from(node.querySelectorAll(".chip")).map(
        (chip) => chip.textContent
      );
      return expandTemplate(template, values);
    }
    if (node.classList.contains("var")) {
      return node.__resolve ? String(node.__resolve() || "") : "";
    }
    return Array.from(node.childNodes).map((child) => serializeNode(child, templates)).join("");
  }
  return "";
}

export function serializeField(root, templates) {
  if (!root) return "";
  return Array.from(root.childNodes)
    .map((child) => serializeNode(child, templates))
    .join("");
}

export function findTemplate(templates, name) {
  return (templates || []).find((template) => template.name === name);
}

export function expandTemplate(template, values) {
  let output = template.pattern;
  template.params.forEach((param, index) => {
    output = output.split("{" + param + "}").join(values[index] ?? "");
  });
  return output;
}

export function toIsoOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function fileExtension(filePath) {
  return String(filePath).split(".").pop().toLowerCase();
}

export const VIDEO_EXTENSIONS = ["mp4", "mkv", "mov", "avi", "webm"];
export const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

export function isVideoFile(filePath) {
  return VIDEO_EXTENSIONS.includes(fileExtension(filePath));
}

export function isImageFile(filePath) {
  return IMAGE_EXTENSIONS.includes(fileExtension(filePath));
}

export function getDroppedPath(file) {
  try {
    return window.api.getPathForFile(file);
  } catch {
    return file.path || "";
  }
}

export function hasFileDrag(event) {
  const types = event.dataTransfer && event.dataTransfer.types;
  return types ? Array.prototype.includes.call(types, "Files") : false;
}

export function thumbnailPlaceholders(template) {
  const staticKeys = new Set(
    (template.parameters || [])
      .filter((param) => param.mode === "static")
      .map((param) => param.key)
  );
  const keys = new Set();
  (template.elements || []).forEach((element) => {
    if (element.type !== "text") return;
    (String(element.text).match(/\{(\w+)\}/g) || []).forEach((match) => {
      const key = match.slice(1, -1);
      if (!staticKeys.has(key)) keys.add(key);
    });
  });
  return [...keys];
}

export function itemOverrides(item) {
  const overrides = {};
  if (item.thumbColorEnabled) overrides.color = item.thumbColor;
  if (item.thumbShadowEnabled) overrides.shadowColor = item.thumbShadow;
  return overrides;
}

export function statusText(item, t) {
  switch (item.status) {
    case "queued":
      return t("status.queued");
    case "rendering":
      return t("status.rendering", { percent: item.percent });
    case "rendered":
      return t("status.rendered");
    case "uploading":
      return t("status.uploading", { percent: item.percent });
    case "done":
      return t("status.done");
    case "error":
      return t("status.error");
    case "canceled":
      return t("status.canceled");
    default:
      return t("status.pending");
  }
}

export function fileName(filePath) {
  return String(filePath).split(/[\\/]/).pop();
}

export function genId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
