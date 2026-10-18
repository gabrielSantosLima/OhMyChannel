const els = {
  app: document.querySelector(".app"),
  authStatus: document.getElementById("authStatus"),
  loginBtn: document.getElementById("loginBtn"),
  logoutBtn: document.getElementById("logoutBtn"),
  addBtn: document.getElementById("addBtn"),
  uploadAllBtn: document.getElementById("uploadAllBtn"),
  queueInfo: document.getElementById("queueInfo"),
  queue: document.getElementById("queue"),
  emptyQueue: document.getElementById("emptyQueue"),
  viewUploads: document.getElementById("view-uploads"),
  message: document.getElementById("message"),
  themeSegmented: document.getElementById("themeSegmented"),
  bgToggle: document.getElementById("bgToggle"),
  parallelInput: document.getElementById("parallelInput"),
  collapseBtn: document.getElementById("collapseBtn"),
  tplName: document.getElementById("tplName"),
  tplParams: document.getElementById("tplParams"),
  tplTitle: document.getElementById("tplTitle"),
  tplAdd: document.getElementById("tplAdd"),
  tplError: document.getElementById("tplError"),
  tplList: document.getElementById("tplList"),
  thumbName: document.getElementById("thumbName"),
  thumbBgBtn: document.getElementById("thumbBgBtn"),
  thumbExportBtn: document.getElementById("thumbExportBtn"),
  thumbSave: document.getElementById("thumbSave"),
  thumbReset: document.getElementById("thumbReset"),
  thumbError: document.getElementById("thumbError"),
  thumbStageWrap: document.getElementById("thumbStageWrap"),
  thumbStage: document.getElementById("thumbStage"),
  thumbStageImg: document.getElementById("thumbStageImg"),
  thumbStageBoxes: document.getElementById("thumbStageBoxes"),
  thumbProps: document.getElementById("thumbProps"),
  thumbParams: document.getElementById("thumbParams"),
  thumbContext: document.getElementById("thumbContext"),
  thumbList: document.getElementById("thumbList"),
  aboutVersion: document.getElementById("aboutVersion"),
};

const items = [];
const itemById = new Map();
let templates = [];
let playlists = [];
let thumbnailTemplates = [];
let thumbnailFonts = [];
let thumbBackground = null;
let thumbElements = [];
let thumbParameters = [];
let selectedElementId = null;
let editingThumbnailId = null;
let thumbStageScale = 1;
let stageRenderTimer = null;
let settings = { theme: "dark", background: true, maxParallel: 4 };
let idSeed = 0;

function genId() {
  idSeed += 1;
  return `${Date.now().toString(36)}-${idSeed}`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[c]);
}

function setMessage(text, type = "") {
  els.message.textContent = text;
  els.message.className = "message " + type;
}

/* ---------- Theme ---------- */

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

/* ---------- Navigation ---------- */

const navButtons = Array.from(document.querySelectorAll(".nav-item"));
const views = Array.from(document.querySelectorAll(".view"));

function showView(name) {
  navButtons.forEach((btn) =>
    btn.classList.toggle("active", btn.dataset.view === name)
  );
  views.forEach((view) =>
    view.classList.toggle("active", view.id === "view-" + name)
  );
  if (name === "thumbnails") {
    requestAnimationFrame(() => updateStageScale());
  }
}

navButtons.forEach((btn) =>
  btn.addEventListener("click", () => showView(btn.dataset.view))
);

/* ---------- Settings ---------- */

const themeButtons = Array.from(
  document.querySelectorAll("#themeSegmented .seg-btn")
);

function renderSettingsForm() {
  themeButtons.forEach((btn) =>
    btn.classList.toggle("active", btn.dataset.theme === settings.theme)
  );
  els.bgToggle.checked = !!settings.background;
  els.parallelInput.value = settings.maxParallel;
  els.app.classList.toggle("collapsed", !!settings.sidebarCollapsed);
}

async function persistSettings(changes) {
  settings = await window.api.saveSettings(changes);
  applyTheme(settings.theme);
  renderSettingsForm();
}

themeButtons.forEach((btn) =>
  btn.addEventListener("click", () => persistSettings({ theme: btn.dataset.theme }))
);

els.bgToggle.addEventListener("change", () =>
  persistSettings({ background: els.bgToggle.checked })
);

els.parallelInput.addEventListener("change", () =>
  persistSettings({ maxParallel: Number(els.parallelInput.value) })
);

els.collapseBtn.addEventListener("click", () =>
  persistSettings({ sidebarCollapsed: !settings.sidebarCollapsed })
);

/* ---------- Templates ---------- */

function findTemplate(name) {
  return templates.find((t) => t.name === name);
}

function expandTemplate(tpl, values) {
  let out = tpl.pattern;
  tpl.params.forEach((param, i) => {
    out = out.split("{" + param + "}").join(values[i] ?? "");
  });
  return out;
}

function isCommandWidget(node) {
  return (
    node &&
    node.nodeType === Node.ELEMENT_NODE &&
    node.classList.contains("cmd")
  );
}

function nodeText(node) {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent;
  if (node.nodeName === "BR") return "\n";
  return Array.from(node.childNodes).map(nodeText).join("");
}

function serializeNode(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent.replace(/\u200B/g, "");
  }
  if (node.nodeName === "BR") return "\n";
  if (node.nodeType === Node.ELEMENT_NODE) {
    if (isCommandWidget(node)) {
      const tpl = findTemplate(node.dataset.template);
      if (!tpl) return "";
      const values = Array.from(node.querySelectorAll(".chip")).map(
        (chip) => chip.textContent
      );
      return expandTemplate(tpl, values);
    }
    return Array.from(node.childNodes).map(serializeNode).join("");
  }
  return "";
}

function serializeField(root) {
  return Array.from(root.childNodes).map(serializeNode).join("");
}

function toIsoOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function createCommandWidget(tpl) {
  const widget = document.createElement("span");
  widget.className = "cmd";
  widget.contentEditable = "false";
  widget.dataset.template = tpl.name;

  const name = document.createElement("span");
  name.className = "cmd-name";
  name.textContent = "/template " + tpl.name;
  widget.appendChild(name);

  tpl.params.forEach((param, index) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.contentEditable = "true";
    chip.spellcheck = false;
    chip.dataset.param = param;
    chip.dataset.index = String(index);
    chip.dataset.placeholder = param;
    widget.appendChild(chip);
  });

  return widget;
}

async function loadTemplates() {
  try {
    templates = await window.api.listTemplates();
  } catch {
    templates = [];
  }
}

async function persistTemplates() {
  templates = await window.api.saveTemplates(templates);
}

/* ---------- Playlists ---------- */

async function loadPlaylists() {
  try {
    playlists = await window.api.listPlaylists();
  } catch {
    playlists = [];
  }
  refreshPlaylistSelects();
}

function fillPlaylistSelect(select) {
  const current = select.value;
  select.innerHTML = "";
  const none = document.createElement("option");
  none.value = "";
  none.textContent = "No playlist";
  select.appendChild(none);
  playlists.forEach((playlist) => {
    const option = document.createElement("option");
    option.value = playlist.id;
    option.textContent = playlist.title;
    select.appendChild(option);
  });
  select.value = playlists.some((p) => p.id === current) ? current : "";
}

function refreshPlaylistSelects() {
  items.forEach((item) => {
    if (item.dom.playlist) fillPlaylistSelect(item.dom.playlist);
  });
}

function applyThumbnail(item, path) {
  item.thumbnailPath = path || null;
  item.dom.thumbnailName.textContent = path
    ? path.split(/[\\/]/).pop()
    : "No image";
  item.dom.thumbnailClear.classList.toggle("hidden", !path);
}

function fillThumbTemplateSelect(select) {
  const current = select.value;
  select.innerHTML = "";
  const none = document.createElement("option");
  none.value = "";
  none.textContent = "None";
  select.appendChild(none);
  thumbnailTemplates.forEach((tpl) => {
    const option = document.createElement("option");
    option.value = tpl.id;
    option.textContent = tpl.name;
    select.appendChild(option);
  });
  select.value = thumbnailTemplates.some((tpl) => tpl.id === current)
    ? current
    : "";
}

function thumbnailPlaceholders(tpl) {
  const staticKeys = new Set(
    (tpl.parameters || [])
      .filter((param) => param.mode === "static")
      .map((param) => param.key)
  );
  const keys = new Set();
  (tpl.elements || []).forEach((element) => {
    if (element.type !== "text") return;
    (String(element.text).match(/\{(\w+)\}/g) || []).forEach((match) => {
      const key = match.slice(1, -1);
      if (!staticKeys.has(key)) keys.add(key);
    });
  });
  return [...keys];
}

function renderItemThumbValues(item) {
  const wrap = item.dom.thumbTemplateValues;
  if (!wrap) return;
  wrap.innerHTML = "";
  const tpl = thumbnailTemplates.find(
    (t) => t.id === item.dom.thumbTemplate.value
  );
  if (!tpl) {
    wrap.classList.add("hidden");
    return;
  }
  const keys = thumbnailPlaceholders(tpl);
  if (!keys.length) {
    wrap.classList.add("hidden");
    return;
  }
  wrap.classList.remove("hidden");
  keys.forEach((key) => {
    if (item.thumbnailValues[key] === undefined) {
      item.thumbnailValues[key] =
        key === "episode"
          ? "1"
          : key === "title"
          ? serializeField(item.dom.title).slice(0, 100)
          : key;
    }
    const input = document.createElement("input");
    input.type = "text";
    input.value = item.thumbnailValues[key];
    input.placeholder = key;
    input.addEventListener("input", () => {
      item.thumbnailValues[key] = input.value;
      scheduleItemThumbPreview(item);
    });
    wrap.appendChild(thumbField("{" + key + "}", input));
  });
}

function refreshThumbTemplateSelects() {
  items.forEach((item) => {
    if (!item.dom.thumbTemplate) return;
    fillThumbTemplateSelect(item.dom.thumbTemplate);
    renderItemThumbValues(item);
    scheduleItemThumbPreview(item);
  });
}

function createOverrideControl(label, defaultColor) {
  const wrap = document.createElement("label");
  wrap.className = "thumb-override";
  const check = document.createElement("input");
  check.type = "checkbox";
  const text = document.createElement("span");
  text.textContent = label;
  const color = document.createElement("input");
  color.type = "color";
  color.value = defaultColor;
  color.disabled = true;
  check.addEventListener("change", () => {
    color.disabled = !check.checked;
  });
  wrap.append(check, text, color);
  return { wrap, check, color };
}

function itemOverrides(item) {
  const overrides = {};
  if (item.dom.thumbColorCheck && item.dom.thumbColorCheck.checked) {
    overrides.color = item.dom.thumbColorInput.value;
  }
  if (item.dom.thumbShadowCheck && item.dom.thumbShadowCheck.checked) {
    overrides.shadowColor = item.dom.thumbShadowInput.value;
  }
  return overrides;
}

function scheduleItemThumbPreview(item) {
  clearTimeout(item.thumbPreviewTimer);
  item.thumbPreviewTimer = setTimeout(() => updateItemThumbPreview(item), 300);
}

async function updateItemThumbPreview(item) {
  const img = item.dom.thumbPreview;
  if (!img) return;
  const tpl = thumbnailTemplates.find(
    (t) => t.id === item.dom.thumbTemplate.value
  );
  if (!tpl) {
    img.classList.add("hidden");
    return;
  }
  try {
    const dataUrl = await window.api.generateThumbnail({
      template: tpl,
      values: item.thumbnailValues,
      overrides: itemOverrides(item),
      asDataUrl: true,
    });
    img.src = dataUrl;
    img.classList.remove("hidden");
  } catch {
    img.classList.add("hidden");
  }
}

/* ---------- Command-aware field ---------- */

function createCommandField({ input, menu, preview, onChange }) {
  let menuItems = [];
  let menuIndex = 0;

  const selectionRange = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const range = sel.getRangeAt(0);
    if (!input.contains(range.startContainer)) return null;
    return range;
  };

  const nodeFromCaret = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    let node = sel.getRangeAt(0).startContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
    return node;
  };

  const chipFromCaret = () => {
    const node = nodeFromCaret();
    return node && node.closest ? node.closest(".chip") : null;
  };

  const widgetFromCaret = () => {
    const node = nodeFromCaret();
    return node && node.closest ? node.closest(".cmd") : null;
  };

  const setCaret = (container, offset) => {
    input.focus();
    const range = document.createRange();
    range.setStart(container, offset);
    range.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  };

  const caretBefore = (node) => {
    const parent = node.parentNode;
    const prev = node.previousSibling;
    if (prev && prev.nodeType === Node.TEXT_NODE) {
      setCaret(prev, prev.textContent.length);
      return;
    }
    setCaret(parent, Array.prototype.indexOf.call(parent.childNodes, node));
  };

  const caretAfter = (node) => {
    const parent = node.parentNode;
    const next = node.nextSibling;
    if (next && next.nodeType === Node.TEXT_NODE) {
      setCaret(next, 0);
      return;
    }
    setCaret(parent, Array.prototype.indexOf.call(parent.childNodes, node) + 1);
  };

  const caretIn = (node, atEnd, focusEl) => {
    (focusEl || input).focus();
    const range = document.createRange();
    range.selectNodeContents(node);
    range.collapse(!atEnd);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  };

  function lineTextBeforeCaret() {
    if (widgetFromCaret()) return "";
    const range = selectionRange();
    if (!range) return "";
    const start = range.startContainer;
    if (start.nodeType !== Node.TEXT_NODE) return "";
    let text = start.textContent.slice(0, range.startOffset);
    let node = start;
    while (node && node !== input) {
      let prev = node.previousSibling;
      while (prev) {
        if (prev.nodeName === "BR") return text;
        if (isCommandWidget(prev)) return "";
        text = nodeText(prev) + text;
        if (text.includes("\n")) return text;
        prev = prev.previousSibling;
      }
      node = node.parentNode;
    }
    return text;
  }

  function hideMenu() {
    menuItems = [];
    menuIndex = 0;
    menu.classList.add("hidden");
    menu.innerHTML = "";
  }

  function showMenu(menuList) {
    if (!menuList.length) {
      hideMenu();
      return;
    }
    menuItems = menuList;
    if (menuIndex >= menuList.length) menuIndex = 0;
    menu.innerHTML = "";
    menuList.forEach((item, i) => {
      const row = document.createElement("div");
      row.className = "cmd-item" + (i === menuIndex ? " active" : "");
      const left = document.createElement("span");
      left.innerHTML = item.icon
        ? `<span class="cmd-icon">${item.icon}</span>${escapeHtml(item.label)}`
        : escapeHtml(item.label);
      const right = document.createElement("span");
      right.className = "hint";
      right.textContent = item.hint || "";
      row.appendChild(left);
      row.appendChild(right);
      row.addEventListener("mousedown", (e) => {
        e.preventDefault();
        item.apply();
      });
      menu.appendChild(row);
    });
    menu.classList.remove("hidden");
  }

  function selectActive() {
    if (menuItems.length) menuItems[menuIndex].apply();
  }

  function replaceLineTextWith(segment, text) {
    const range = selectionRange();
    if (!range || range.startContainer.nodeType !== Node.TEXT_NODE) return;
    const node = range.startContainer;
    const from = Math.max(0, range.startOffset - segment.length);
    const r = document.createRange();
    r.setStart(node, from);
    r.setEnd(node, range.startOffset);
    r.deleteContents();
    const next = document.createTextNode(text);
    r.insertNode(next);
    setCaret(next, next.length);
  }

  function insertTemplate(tpl) {
    const range = selectionRange();
    if (!range || range.startContainer.nodeType !== Node.TEXT_NODE) return;
    const node = range.startContainer;
    const segment = lineTextBeforeCaret();
    const from = Math.max(0, range.startOffset - segment.length);
    const r = document.createRange();
    r.setStart(node, from);
    r.setEnd(node, range.startOffset);
    r.deleteContents();

    hideMenu();

    if (!tpl.params.length) {
      const textNode = document.createTextNode(expandTemplate(tpl, []));
      r.insertNode(textNode);
      setCaret(textNode, textNode.length);
    } else {
      const widget = createCommandWidget(tpl);
      r.insertNode(widget);
      const spacer = document.createTextNode("\u200B");
      widget.parentNode.insertBefore(spacer, widget.nextSibling);
      focusChip(widget.querySelector(".chip"), false);
    }

    updatePreview();
    onChange();
  }

  function focusChip(chip, atEnd) {
    if (!chip) return;
    caretIn(chip, atEnd, chip);
    updatePreview();
  }

  function updateMenu() {
    const segment = lineTextBeforeCaret();
    if (!segment.startsWith("/")) {
      hideMenu();
      return;
    }
    const tokens = segment.split(" ");
    const command = tokens[0];

    if (tokens.length === 1) {
      const query = command.slice(1).toLowerCase();
      const commands = [
        { name: "template", hint: "Insert a template" },
      ].filter((c) => c.name.startsWith(query));
      showMenu(
        commands.map((c) => ({
          icon: "/",
          label: c.name,
          hint: c.hint,
          apply: () => {
            replaceLineTextWith(segment, "/template ");
            updateMenu();
            updatePreview();
            onChange();
          },
        }))
      );
      return;
    }

    if (command === "/template" && tokens.length === 2) {
      const query = tokens[1].toLowerCase();
      showMenu(
        templates
          .filter((t) => t.name.toLowerCase().startsWith(query))
          .map((t) => ({
            icon: "#",
            label: t.name,
            hint: t.pattern,
            apply: () => insertTemplate(t),
          }))
      );
      return;
    }

    hideMenu();
  }

  function updatePreview() {
    const widget = widgetFromCaret();
    if (!widget) {
      preview.classList.add("hidden");
      preview.innerHTML = "";
      return;
    }
    const tpl = findTemplate(widget.dataset.template);
    const values = Array.from(widget.querySelectorAll(".chip")).map(
      (chip) => chip.textContent
    );
    preview.classList.remove("hidden");
    if (!tpl) {
      preview.innerHTML = "Template not found.";
      return;
    }
    const missing = tpl.params.filter((_p, i) => !(values[i] || "").trim());
    let html = `Preview: <strong>${escapeHtml(
      expandTemplate(tpl, values)
    )}</strong>`;
    if (missing.length) {
      html += ` &middot; missing: ${escapeHtml(missing.join(", "))}`;
    }
    preview.innerHTML = html;
  }

  function chipOffset(chip, range) {
    if (!range || !chip.contains(range.startContainer)) return 0;
    const pre = document.createRange();
    pre.selectNodeContents(chip);
    pre.setEnd(range.startContainer, range.startOffset);
    return pre.toString().length;
  }

  function chipIsEmpty(chip) {
    return chip.textContent.replace(/\u200B/g, "").length === 0;
  }

  function handleChipKey(event, chip) {
    const widget = chip.closest(".cmd");
    const chips = Array.from(widget.querySelectorAll(".chip"));
    const index = chips.indexOf(chip);
    const range = selectionRange();
    const offset = chipOffset(chip, range);
    const length = chip.textContent.length;
    const dir = event.shiftKey ? -1 : 1;

    if (event.key === "Tab" || event.key === "Enter") {
      event.preventDefault();
      const target = chips[index + dir];
      if (target) focusChip(target, dir < 0);
      else if (dir > 0) caretAfter(widget);
      else caretBefore(widget);
      return true;
    }

    if (event.key === "ArrowLeft" && !event.shiftKey && offset === 0) {
      event.preventDefault();
      const target = chips[index - 1];
      if (target) focusChip(target, true);
      else caretBefore(widget);
      return true;
    }

    if (event.key === "ArrowRight" && !event.shiftKey && offset === length) {
      event.preventDefault();
      const target = chips[index + 1];
      if (target) focusChip(target, false);
      else caretAfter(widget);
      return true;
    }

    if (event.key === "Backspace" && offset === 0 && chipIsEmpty(chip)) {
      event.preventDefault();
      const target = chips[index - 1];
      if (target) focusChip(target, true);
      else caretBefore(widget);
      return true;
    }

    return false;
  }

  input.addEventListener("input", () => {
    updateMenu();
    updatePreview();
    onChange();
  });

  input.addEventListener("keydown", (event) => {
    const chip = chipFromCaret();
    if (chip && handleChipKey(event, chip)) return;

    const menuOpen = !menu.classList.contains("hidden");

    if (event.key === "Enter") {
      event.preventDefault();
      if (menuOpen) {
        selectActive();
        return;
      }
      if (input.dataset.multiline === "true") {
        document.execCommand("insertLineBreak");
        updatePreview();
        onChange();
      }
      return;
    }

    if (!menuOpen) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      menuIndex = (menuIndex + 1) % menuItems.length;
      showMenu(menuItems);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      menuIndex = (menuIndex - 1 + menuItems.length) % menuItems.length;
      showMenu(menuItems);
    } else if (event.key === "Tab") {
      event.preventDefault();
      selectActive();
    } else if (event.key === "Escape") {
      hideMenu();
    }
  });

  input.addEventListener("paste", (event) => {
    event.preventDefault();
    const clipboard = event.clipboardData || window.clipboardData;
    let text = clipboard ? clipboard.getData("text/plain") : "";
    if (!text) return;
    if (input.dataset.multiline !== "true") {
      text = text.replace(/[\r\n]+/g, " ");
    }
    const max = Number(input.dataset.max || 0);
    if (max) {
      const current = serializeField(input).length;
      text = text.slice(0, Math.max(0, max - current));
    }
    document.execCommand("insertText", false, text);
    updateMenu();
    updatePreview();
    onChange();
  });

  input.addEventListener("beforeinput", (event) => {
    const max = Number(input.dataset.max || 0);
    if (!max || !event.data) return;
    const current = serializeField(input).length;
    if (current + event.data.length > max) event.preventDefault();
  });

  return { updateMenu, updatePreview, hideMenu };
}

/* ---------- Queue ---------- */

function statusText(item) {
  switch (item.status) {
    case "uploading":
      return `Uploading ${item.percent}%`;
    case "done":
      return "Done";
    case "error":
      return "Error";
    case "canceled":
      return "Canceled";
    default:
      return "Pending";
  }
}

function updateItemCounters(item) {
  const title = serializeField(item.dom.title);
  item.dom.titleCount.textContent = `${title.length} / 100`;
  item.dom.titleCount.style.color = title.length > 100 ? "var(--error)" : "";

  const description = serializeField(item.dom.desc);
  item.dom.descCount.textContent = `${description.length} / 5000`;
  item.dom.descCount.style.color =
    description.length > 5000 ? "var(--error)" : "";
}

function refreshItem(item) {
  item.dom.status.textContent = statusText(item);
  item.dom.status.className = "card-status " + item.status;

  const uploading = item.status === "uploading";
  const done = item.status === "done";

  item.dom.upload.classList.toggle("hidden", uploading || done);
  item.dom.cancel.classList.toggle("hidden", !uploading);
  item.dom.remove.classList.toggle("hidden", uploading);
  item.dom.progress.classList.toggle("hidden", !uploading && !done);
  item.dom.upload.disabled = done || !serializeField(item.dom.title).trim();
}

function refreshQueueInfo() {
  els.emptyQueue.classList.toggle("hidden", items.length > 0);
  const uploadable = items.filter(
    (item) => item.status !== "uploading" && item.status !== "done"
  ).length;
  els.queueInfo.textContent = items.length
    ? `${items.length} in queue`
    : "";
  els.uploadAllBtn.disabled = uploadable === 0;
}

function addItem(filePath) {
  const fileName = filePath.split(/[\\/]/).pop();
  const item = {
    id: genId(),
    filePath,
    fileName,
    status: "pending",
    percent: 0,
    cancelled: false,
    thumbnailPath: null,
    thumbnailValues: {},
    thumbPreviewTimer: null,
    dom: {},
  };

  const card = document.createElement("div");
  card.className = "upload-card";

  const head = document.createElement("div");
  head.className = "card-head";
  const file = document.createElement("span");
  file.className = "card-file";
  file.textContent = fileName;
  file.title = filePath;
  const status = document.createElement("span");
  status.className = "card-status pending";
  status.textContent = "Pending";
  head.appendChild(file);
  head.appendChild(status);

  const titleInput = document.createElement("div");
  titleInput.className = "cmd-field";
  titleInput.contentEditable = "true";
  titleInput.setAttribute("spellcheck", "false");
  titleInput.dataset.placeholder = "Video title or /template ...";
  titleInput.dataset.max = "200";
  titleInput.textContent = fileName.replace(/\.[^.]+$/, "");
  const titleCount = document.createElement("span");
  titleCount.className = "counter";
  const titleMenu = document.createElement("div");
  titleMenu.className = "command-menu hidden";
  const titlePreview = document.createElement("div");
  titlePreview.className = "preview hidden";
  const titleField = document.createElement("div");
  titleField.className = "field";
  const titleLabel = document.createElement("label");
  titleLabel.textContent = "Title";
  titleField.append(titleLabel, titleInput, titleCount, titleMenu, titlePreview);

  const descInput = document.createElement("div");
  descInput.className = "cmd-field";
  descInput.contentEditable = "true";
  descInput.setAttribute("spellcheck", "false");
  descInput.dataset.placeholder = "Video description or /template ...";
  descInput.dataset.max = "5000";
  descInput.dataset.multiline = "true";
  const descCount = document.createElement("span");
  descCount.className = "counter";
  const descMenu = document.createElement("div");
  descMenu.className = "command-menu hidden";
  const descPreview = document.createElement("div");
  descPreview.className = "preview hidden";
  const descField = document.createElement("div");
  descField.className = "field";
  const descLabel = document.createElement("label");
  descLabel.textContent = "Description";
  descField.append(descLabel, descInput, descCount, descMenu, descPreview);

  const options = document.createElement("div");
  options.className = "card-options";
  const playlistField = document.createElement("div");
  playlistField.className = "opt";
  const playlistLabel = document.createElement("label");
  playlistLabel.textContent = "Playlist";
  const playlistSelect = document.createElement("select");
  playlistSelect.className = "opt-select";
  fillPlaylistSelect(playlistSelect);
  playlistField.append(playlistLabel, playlistSelect);
  options.appendChild(playlistField);

  const publishField = document.createElement("div");
  publishField.className = "opt";
  const publishLabel = document.createElement("label");
  publishLabel.textContent = "Publish at";
  const publishInput = document.createElement("input");
  publishInput.type = "datetime-local";
  publishField.append(publishLabel, publishInput);
  options.appendChild(publishField);

  const thumbField = document.createElement("div");
  thumbField.className = "opt thumb-opt";
  const thumbLabel = document.createElement("label");
  thumbLabel.textContent = "Thumbnail";
  const thumbRow = document.createElement("div");
  thumbRow.className = "thumb-row";
  const thumbButton = document.createElement("button");
  thumbButton.type = "button";
  thumbButton.textContent = "Choose image";
  const thumbName = document.createElement("span");
  thumbName.className = "thumb-name";
  thumbName.textContent = "No image";
  const thumbClear = document.createElement("button");
  thumbClear.type = "button";
  thumbClear.className = "ghost hidden";
  thumbClear.textContent = "Remove";
  thumbRow.append(thumbButton, thumbName, thumbClear);
  thumbField.append(thumbLabel, thumbRow);
  options.appendChild(thumbField);

  const tplField = document.createElement("div");
  tplField.className = "opt";
  const tplLabel = document.createElement("label");
  tplLabel.textContent = "Thumbnail template";
  const tplSelect = document.createElement("select");
  tplSelect.className = "opt-select";
  fillThumbTemplateSelect(tplSelect);
  const colorOverride = createOverrideControl("Color", "#efe6d5");
  const shadowOverride = createOverrideControl("Shadow", "#000000");
  const tplValues = document.createElement("div");
  tplValues.className = "thumb-values card-thumb-values hidden";
  const tplPreview = document.createElement("img");
  tplPreview.className = "card-thumb-preview hidden";
  tplPreview.alt = "Thumbnail preview";
  tplField.append(
    tplLabel,
    tplSelect,
    colorOverride.wrap,
    shadowOverride.wrap,
    tplValues,
    tplPreview
  );
  options.appendChild(tplField);

  const actions = document.createElement("div");
  actions.className = "card-actions";
  const upload = document.createElement("button");
  upload.className = "primary";
  upload.textContent = "Upload";
  const cancel = document.createElement("button");
  cancel.className = "hidden";
  cancel.textContent = "Cancel";
  const remove = document.createElement("button");
  remove.textContent = "Remove";
  const progress = document.createElement("div");
  progress.className = "progress hidden";
  const bar = document.createElement("div");
  bar.className = "bar";
  const fill = document.createElement("div");
  fill.className = "fill";
  bar.appendChild(fill);
  const pct = document.createElement("span");
  pct.className = "pct";
  pct.textContent = "0%";
  progress.append(bar, pct);
  actions.append(upload, cancel, remove, progress);

  card.append(head, titleField, descField, options, actions);
  els.queue.appendChild(card);

  item.dom = {
    card,
    status,
    title: titleInput,
    titleCount,
    desc: descInput,
    descCount,
    playlist: playlistSelect,
    publish: publishInput,
    thumbnailName: thumbName,
    thumbnailClear: thumbClear,
    thumbTemplate: tplSelect,
    thumbTemplateValues: tplValues,
    thumbColorCheck: colorOverride.check,
    thumbColorInput: colorOverride.color,
    thumbShadowCheck: shadowOverride.check,
    thumbShadowInput: shadowOverride.color,
    thumbPreview: tplPreview,
    upload,
    cancel,
    remove,
    progress,
    fill,
    pct,
  };

  const onChange = () => {
    updateItemCounters(item);
    refreshItem(item);
  };

  createCommandField({
    input: titleInput,
    menu: titleMenu,
    preview: titlePreview,
    onChange,
  });
  createCommandField({
    input: descInput,
    menu: descMenu,
    preview: descPreview,
    onChange,
  });

  upload.addEventListener("click", () => startUpload(item));
  cancel.addEventListener("click", () => cancelItem(item));
  remove.addEventListener("click", () => removeItem(item));

  thumbButton.addEventListener("click", async () => {
    const path = await window.api.pickThumbnail();
    if (path) applyThumbnail(item, path);
  });
  thumbClear.addEventListener("click", () => applyThumbnail(item, null));

  tplSelect.addEventListener("change", () => {
    item.thumbnailValues = {};
    renderItemThumbValues(item);
    scheduleItemThumbPreview(item);
  });

  [
    colorOverride.check,
    colorOverride.color,
    shadowOverride.check,
    shadowOverride.color,
  ].forEach((control) => {
    control.addEventListener("input", () => scheduleItemThumbPreview(item));
    control.addEventListener("change", () => scheduleItemThumbPreview(item));
  });

  ["dragenter", "dragover"].forEach((type) =>
    thumbField.addEventListener(type, (event) => {
      if (!hasFileDrag(event)) return;
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "copy";
      thumbField.classList.add("drag-over");
    })
  );
  thumbField.addEventListener("dragleave", (event) => {
    if (event.relatedTarget && thumbField.contains(event.relatedTarget)) return;
    thumbField.classList.remove("drag-over");
  });
  thumbField.addEventListener("drop", (event) => {
    if (!hasFileDrag(event)) return;
    event.preventDefault();
    event.stopPropagation();
    thumbField.classList.remove("drag-over");
    const file = event.dataTransfer.files[0];
    const path = file ? getDroppedPath(file) : "";
    if (path && isImageFile(path)) {
      applyThumbnail(item, path);
    } else {
      setMessage("Drop a JPG, PNG or WEBP image as the thumbnail.", "error");
    }
  });

  items.push(item);
  itemById.set(item.id, item);

  updateItemCounters(item);
  refreshItem(item);
  refreshQueueInfo();
  return item;
}

async function addFiles() {
  const files = await window.api.pickVideo();
  if (!files || files.length === 0) return;
  files.forEach(addItem);
  setMessage(
    files.length === 1 ? "1 video added." : `${files.length} videos added.`,
    ""
  );
}

const VIDEO_EXTENSIONS = ["mp4", "mkv", "mov", "avi", "webm"];
const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

function fileExtension(path) {
  return path.split(".").pop().toLowerCase();
}

function isVideoFile(path) {
  return VIDEO_EXTENSIONS.includes(fileExtension(path));
}

function isImageFile(path) {
  return IMAGE_EXTENSIONS.includes(fileExtension(path));
}

function getDroppedPath(file) {
  try {
    return window.api.getPathForFile(file);
  } catch {
    return file.path || "";
  }
}

function handleDrop(event) {
  event.preventDefault();
  const files = Array.from(event.dataTransfer.files || []);
  const paths = files
    .map(getDroppedPath)
    .filter(Boolean)
    .filter(isVideoFile);

  if (!paths.length) {
    if (!files.some((file) => isImageFile(getDroppedPath(file)))) {
      setMessage("No supported video files were dropped.", "error");
    }
    return;
  }

  paths.forEach(addItem);
  setMessage(
    paths.length === 1 ? "1 video added." : `${paths.length} videos added.`,
    ""
  );
}

function hasFileDrag(event) {
  const types = event.dataTransfer && event.dataTransfer.types;
  return types ? Array.prototype.includes.call(types, "Files") : false;
}

els.viewUploads.addEventListener("dragenter", (event) => {
  if (!hasFileDrag(event)) return;
  event.preventDefault();
  els.viewUploads.classList.add("drag-over");
});

els.viewUploads.addEventListener("dragover", (event) => {
  if (!hasFileDrag(event)) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "copy";
  els.viewUploads.classList.add("drag-over");
});

els.viewUploads.addEventListener("dragleave", (event) => {
  if (event.relatedTarget && els.viewUploads.contains(event.relatedTarget)) {
    return;
  }
  els.viewUploads.classList.remove("drag-over");
});

els.viewUploads.addEventListener("drop", (event) => {
  if (!hasFileDrag(event)) return;
  els.viewUploads.classList.remove("drag-over");
  handleDrop(event);
});

window.addEventListener("dragover", (event) => {
  if (hasFileDrag(event)) event.preventDefault();
});
window.addEventListener("drop", (event) => {
  if (hasFileDrag(event)) event.preventDefault();
});

function removeItem(item) {
  if (item.status === "uploading") return;
  const index = items.indexOf(item);
  if (index !== -1) items.splice(index, 1);
  itemById.delete(item.id);
  item.dom.card.remove();
  refreshQueueInfo();
}

async function startUpload(item) {
  if (item.status === "uploading" || item.status === "done") return;

  const title = serializeField(item.dom.title).slice(0, 100);
  if (!title.trim()) {
    setMessage("Every upload needs a title.", "error");
    return;
  }

  let thumbnailPath = item.thumbnailPath || null;
  const templateId = item.dom.thumbTemplate
    ? item.dom.thumbTemplate.value
    : "";
  if (templateId) {
    const template = thumbnailTemplates.find((t) => t.id === templateId);
    if (template) {
      try {
        const generated = await window.api.generateThumbnail({
          template,
          values: item.thumbnailValues,
          overrides: itemOverrides(item),
        });
        thumbnailPath = generated.path;
      } catch (err) {
        setMessage("Thumbnail generation failed: " + err.message, "error");
        return;
      }
    }
  }

  item.status = "uploading";
  item.cancelled = false;
  item.percent = 0;
  item.dom.fill.style.width = "0%";
  item.dom.pct.textContent = "0%";
  refreshItem(item);
  refreshQueueInfo();

  try {
    const result = await window.api.upload({
      id: item.id,
      filePath: item.filePath,
      title,
      description: serializeField(item.dom.desc).slice(0, 5000),
      playlistId: item.dom.playlist.value || null,
      publishAt: toIsoOrNull(item.dom.publish.value),
      thumbnailPath,
    });
    item.status = "done";
    item.percent = 100;
    item.dom.fill.style.width = "100%";
    item.dom.pct.textContent = "100%";
    const warnings = result.warnings && result.warnings.length
      ? " - " + result.warnings.join("; ")
      : "";
    setMessage(
      `Uploaded "${title}" - https://youtu.be/${result.id}${warnings}`,
      result.warnings && result.warnings.length ? "error" : "ok"
    );
  } catch (err) {
    if (item.cancelled) {
      item.status = "canceled";
    } else {
      item.status = "error";
      setMessage("Upload error: " + err.message, "error");
    }
  } finally {
    refreshItem(item);
    refreshQueueInfo();
  }
}

async function cancelItem(item) {
  if (item.status !== "uploading") return;
  item.cancelled = true;
  await window.api.cancelUpload(item.id);
  item.status = "canceled";
  refreshItem(item);
  refreshQueueInfo();
}

function uploadAll() {
  const pending = items.filter(
    (item) => item.status !== "uploading" && item.status !== "done"
  );
  pending.forEach(startUpload);
  if (pending.length) {
    setMessage(`Starting ${pending.length} upload(s)...`, "");
  }
}

els.addBtn.addEventListener("click", addFiles);
els.uploadAllBtn.addEventListener("click", uploadAll);

/* ---------- Templates modal ---------- */

function renderTemplateList() {
  els.tplList.innerHTML = "";
  if (templates.length === 0) {
    const empty = document.createElement("div");
    empty.className = "tpl-empty";
    empty.textContent = "No templates yet.";
    els.tplList.appendChild(empty);
    return;
  }
  templates.forEach((tpl) => {
    const item = document.createElement("div");
    item.className = "tpl-item";

    const info = document.createElement("div");
    info.className = "tpl-info";
    const name = document.createElement("span");
    name.className = "tpl-name";
    name.textContent = tpl.name;
    const detail = document.createElement("span");
    detail.className = "tpl-detail";
    detail.textContent =
      tpl.pattern + (tpl.params.length ? " | params: " + tpl.params.join(", ") : "");
    info.appendChild(name);
    info.appendChild(detail);

    const del = document.createElement("button");
    del.className = "danger";
    del.textContent = "Delete";
    del.addEventListener("click", async () => {
      templates = templates.filter((t) => t.id !== tpl.id);
      await persistTemplates();
      renderTemplateList();
    });

    item.appendChild(info);
    item.appendChild(del);
    els.tplList.appendChild(item);
  });
}

async function addTemplate() {
  const name = els.tplName.value.trim().replace(/\s+/g, "");
  const params = els.tplParams.value
    .split(",")
    .map((p) => p.trim().replace(/\s+/g, ""))
    .filter(Boolean);
  const pattern = els.tplTitle.value.trim();

  if (!name) return (els.tplError.textContent = "Enter the template name.");
  if (findTemplate(name))
    return (els.tplError.textContent =
      "A template with this name already exists.");
  if (!pattern) return (els.tplError.textContent = "Enter the pattern.");
  for (const param of params) {
    if (!pattern.includes("{" + param + "}")) {
      return (els.tplError.textContent = `The pattern does not use parameter {${param}}.`);
    }
  }

  templates.push({ id: genId(), name, params, pattern });
  await persistTemplates();
  els.tplError.textContent = "";
  els.tplName.value = "";
  els.tplParams.value = "";
  els.tplTitle.value = "";
  renderTemplateList();
}

els.tplAdd.addEventListener("click", addTemplate);

/* ---------- Thumbnail templates ---------- */

const THUMB_WIDTH = 1920;
const THUMB_HEIGHT = 1080;

let thumbElementSeed = 0;

function newThumbElementId() {
  thumbElementSeed += 1;
  return `el-${Date.now().toString(36)}-${thumbElementSeed}`;
}

function thumbField(label, control) {
  const wrap = document.createElement("div");
  wrap.className = "thumb-field";
  const span = document.createElement("span");
  span.textContent = label;
  wrap.append(span, control);
  return wrap;
}

function numberInput(value) {
  const input = document.createElement("input");
  input.type = "number";
  input.value = String(value ?? 0);
  return input;
}

function colorInput(value) {
  const input = document.createElement("input");
  input.type = "color";
  input.value = /^#[0-9a-f]{6}$/i.test(value || "") ? value : "#000000";
  return input;
}

function selectInput(options, value) {
  const select = document.createElement("select");
  options.forEach((option) => {
    const el = document.createElement("option");
    el.value = String(option);
    el.textContent = String(option);
    select.appendChild(el);
  });
  select.value = String(value);
  return select;
}

function defaultTextElement() {
  const names = thumbnailFonts.map((font) => font.name);
  const family = names.includes("BBH Hegarty")
    ? "BBH Hegarty"
    : names[0] || "BBH Hegarty";
  const entry = thumbnailFonts.find((font) => font.name === family);
  const hasBold = entry ? entry.weights.includes(700) : false;
  return {
    id: newThumbElementId(),
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

function previewText(text) {
  return String(text).replace(/\{(\w+)\}/g, (_match, key) => {
    const param = thumbParameters.find((p) => p.key === key);
    if (!param) return key;
    return param.value !== "" ? param.value : key;
  });
}

function thumbPreviewValues() {
  const values = {};
  thumbParameters.forEach((param) => {
    values[param.key] = param.value;
  });
  return values;
}

function elementBox(element) {
  if (element.type === "image") {
    return {
      left: element.x,
      top: element.y,
      width: element.width || 200,
      height: element.height || 200,
    };
  }
  const lines = previewText(element.text).split("\n").length || 1;
  return {
    left: element.x,
    top: element.y,
    width: element.width || THUMB_WIDTH,
    height: element.fontSize * element.lineHeight * lines,
  };
}

function currentThumbTemplate(nameOverride) {
  return {
    id: editingThumbnailId || undefined,
    name: nameOverride || els.thumbName.value.trim() || "Untitled",
    width: THUMB_WIDTH,
    height: THUMB_HEIGHT,
    backgroundPath: thumbBackground,
    parameters: thumbParameters.map((param) => ({
      key: param.key,
      mode: param.mode,
      value: param.value,
    })),
    elements: thumbElements,
  };
}

function updateStageScale() {
  const width = els.thumbStageWrap.clientWidth || THUMB_WIDTH;
  thumbStageScale = width / THUMB_WIDTH;
  els.thumbStage.style.transform = `scale(${thumbStageScale})`;
}

function renderStageBoxes() {
  els.thumbStageBoxes.innerHTML = "";
  thumbElements.forEach((element) => {
    const box = document.createElement("div");
    box.className =
      "thumb-box" + (element.id === selectedElementId ? " selected" : "");
    const geometry = elementBox(element);
    box.style.left = geometry.left + "px";
    box.style.top = geometry.top + "px";
    box.style.width = geometry.width + "px";
    box.style.height = geometry.height + "px";
    box.dataset.id = element.id;
    box.addEventListener("mousedown", (event) => startDrag(event, element));
    els.thumbStageBoxes.appendChild(box);
  });
}

function startDrag(event, element) {
  if (event.button !== 0) return;
  event.preventDefault();
  selectElement(element.id);
  const startX = event.clientX;
  const startY = event.clientY;
  const originX = element.x;
  const originY = element.y;
  const move = (moveEvent) => {
    element.x = Math.round(
      originX + (moveEvent.clientX - startX) / thumbStageScale
    );
    element.y = Math.round(
      originY + (moveEvent.clientY - startY) / thumbStageScale
    );
    renderStageBoxes();
  };
  const up = () => {
    window.removeEventListener("mousemove", move);
    window.removeEventListener("mouseup", up);
    renderProps();
    scheduleStageRender();
  };
  window.addEventListener("mousemove", move);
  window.addEventListener("mouseup", up);
}

function selectElement(id) {
  selectedElementId = id;
  renderStageBoxes();
  renderProps();
}

function scheduleStageRender() {
  renderStageBoxes();
  clearTimeout(stageRenderTimer);
  stageRenderTimer = setTimeout(renderStageImage, 250);
}

async function renderStageImage() {
  try {
    const dataUrl = await window.api.generateThumbnail({
      template: currentThumbTemplate(),
      values: thumbPreviewValues(),
      asDataUrl: true,
    });
    els.thumbStageImg.src = dataUrl;
    els.thumbError.textContent = "";
  } catch (err) {
    els.thumbError.textContent = err.message;
  }
}

function bindProp(control, element, key, opts = {}) {
  const { numeric = false, event = "input", after } = opts;
  control.addEventListener(event, () => {
    element[key] = numeric ? Number(control.value) || 0 : control.value;
    renderStageBoxes();
    if (after) after();
    scheduleStageRender();
  });
}

function renderProps() {
  const panel = els.thumbProps;
  panel.innerHTML = "";
  const element = thumbElements.find((el) => el.id === selectedElementId);
  if (!element) {
    const hint = document.createElement("span");
    hint.className = "muted";
    hint.textContent = "Select an element";
    panel.appendChild(hint);
    return;
  }

  const title = document.createElement("div");
  title.className = "thumb-props-title";
  title.textContent =
    element.type === "image" ? "Image element" : "Text element";
  panel.appendChild(title);

  const grid = document.createElement("div");
  grid.className = "thumb-grid";

  const x = numberInput(element.x);
  bindProp(x, element, "x", { numeric: true });
  grid.appendChild(thumbField("X", x));

  const y = numberInput(element.y);
  bindProp(y, element, "y", { numeric: true });
  grid.appendChild(thumbField("Y", y));

  const width = numberInput(element.width);
  bindProp(width, element, "width", { numeric: true });
  grid.appendChild(thumbField("Width", width));

  if (element.type === "image") {
    const height = numberInput(element.height);
    bindProp(height, element, "height", { numeric: true });
    grid.appendChild(thumbField("Height", height));

    const opacity = numberInput(element.opacity);
    bindProp(opacity, element, "opacity", { numeric: true });
    grid.appendChild(thumbField("Opacity", opacity));
    panel.appendChild(grid);

    const row = document.createElement("div");
    row.className = "thumb-row";
    const choose = document.createElement("button");
    choose.type = "button";
    choose.textContent = "Choose image";
    choose.addEventListener("click", async () => {
      const path = await window.api.pickThumbnail();
      if (path) {
        element.src = path;
        scheduleStageRender();
      }
    });
    row.appendChild(choose);
    panel.appendChild(row);
    return;
  }

  const lineHeight = numberInput(element.lineHeight);
  bindProp(lineHeight, element, "lineHeight", { numeric: true });
  grid.appendChild(thumbField("Line height", lineHeight));

  const spacing = numberInput(element.letterSpacing);
  bindProp(spacing, element, "letterSpacing", { numeric: true });
  grid.appendChild(thumbField("Spacing", spacing));

  const weight = selectInput(
    [100, 200, 300, 400, 500, 600, 700, 800, 900],
    element.fontWeight
  );
  bindProp(weight, element, "fontWeight", { numeric: true, event: "change" });
  grid.appendChild(thumbField("Weight", weight));

  const align = selectInput(["left", "center", "right"], element.align);
  bindProp(align, element, "align", { event: "change" });
  grid.appendChild(thumbField("Align", align));

  panel.appendChild(grid);

  const font = document.createElement("select");
  thumbnailFonts.forEach((entry) => {
    const option = document.createElement("option");
    option.value = entry.name;
    option.textContent = entry.name;
    font.appendChild(option);
  });
  font.value = element.fontFamily;
  bindProp(font, element, "fontFamily", { event: "change" });
  panel.appendChild(thumbField("Font", font));

  const text = document.createElement("textarea");
  text.rows = 2;
  text.value = element.text;
  text.placeholder = "Text with {parameters}";
  text.addEventListener("input", () => {
    element.text = text.value;
    renderParams();
    renderStageBoxes();
    scheduleStageRender();
  });
  panel.appendChild(thumbField("Text", text));

  const insertRow = document.createElement("div");
  insertRow.className = "thumb-row";
  const keyInput = document.createElement("input");
  keyInput.type = "text";
  keyInput.placeholder = "parameter name";
  const insert = document.createElement("button");
  insert.type = "button";
  insert.textContent = "Insert";
  insert.addEventListener("click", () => {
    const key = keyInput.value.replace(/[^a-zA-Z0-9_]/g, "");
    if (!key) return;
    element.text += `{${key}}`;
    text.value = element.text;
    keyInput.value = "";
    if (!thumbParameters.some((param) => param.key === key)) {
      thumbParameters.push({ key, mode: "dynamic", value: "" });
    }
    renderParams();
    renderStageBoxes();
    scheduleStageRender();
  });
  insertRow.append(keyInput, insert);
  panel.appendChild(insertRow);

  const color = colorInput(element.color);
  bindProp(color, element, "color");
  const strokeColor = colorInput(element.strokeColor);
  bindProp(strokeColor, element, "strokeColor");
  const strokeWidth = numberInput(element.strokeWidth);
  bindProp(strokeWidth, element, "strokeWidth", { numeric: true });
  const shadowColor = colorInput(element.shadowColor);
  bindProp(shadowColor, element, "shadowColor");
  const shadowBlur = numberInput(element.shadowBlur);
  bindProp(shadowBlur, element, "shadowBlur", { numeric: true });
  const shadowX = numberInput(element.shadowX);
  bindProp(shadowX, element, "shadowX", { numeric: true });
  const shadowY = numberInput(element.shadowY);
  bindProp(shadowY, element, "shadowY", { numeric: true });

  const styleGrid = document.createElement("div");
  styleGrid.className = "thumb-grid";
  styleGrid.appendChild(thumbField("Color", color));
  styleGrid.appendChild(thumbField("Stroke", strokeColor));
  styleGrid.appendChild(thumbField("Stroke px", strokeWidth));
  styleGrid.appendChild(thumbField("Shadow", shadowColor));
  styleGrid.appendChild(thumbField("Blur", shadowBlur));
  styleGrid.appendChild(thumbField("Shadow X", shadowX));
  styleGrid.appendChild(thumbField("Shadow Y", shadowY));
  panel.appendChild(styleGrid);
}

function renderParams() {
  const keys = new Set();
  thumbElements.forEach((element) => {
    if (element.type !== "text") return;
    (String(element.text).match(/\{(\w+)\}/g) || []).forEach((match) =>
      keys.add(match.slice(1, -1))
    );
  });
  const detected = [...keys];
  thumbParameters = detected.map(
    (key) =>
      thumbParameters.find((param) => param.key === key) || {
        key,
        mode: "dynamic",
        value: "",
      }
  );

  els.thumbParams.innerHTML = "";
  if (!detected.length) {
    const hint = document.createElement("span");
    hint.className = "muted";
    hint.textContent = "No parameters. Add {name} inside a text element.";
    els.thumbParams.appendChild(hint);
    return;
  }
  detected.forEach((key) => {
    const param = thumbParameters.find((p) => p.key === key);
    const row = document.createElement("div");
    row.className = "thumb-param";
    const name = document.createElement("span");
    name.className = "thumb-param-key";
    name.textContent = "{" + key + "}";
    const mode = selectInput(["dynamic", "static"], param.mode);
    mode.addEventListener("change", () => {
      param.mode = mode.value;
      renderParams();
      scheduleStageRender();
    });
    const value = document.createElement("input");
    value.type = "text";
    value.value = param.value;
    value.placeholder =
      param.mode === "static" ? "Fixed value" : "Preview value";
    value.addEventListener("input", () => {
      param.value = value.value;
      scheduleStageRender();
    });
    row.append(name, mode, value);
    els.thumbParams.appendChild(row);
  });
}

function hideContextMenu() {
  els.thumbContext.classList.add("hidden");
}

function showContextMenu(x, y, items) {
  const menu = els.thumbContext;
  menu.innerHTML = "";
  items.forEach((item) => {
    if (item.separator) {
      const sep = document.createElement("div");
      sep.className = "context-sep";
      menu.appendChild(sep);
      return;
    }
    const row = document.createElement("div");
    row.className = "context-item";
    row.textContent = item.label;
    row.addEventListener("mousedown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      hideContextMenu();
      item.action();
    });
    menu.appendChild(row);
  });
  menu.style.left = x + "px";
  menu.style.top = y + "px";
  menu.classList.remove("hidden");
}

function addTextElement() {
  const element = defaultTextElement();
  element.text = "New text";
  thumbElements.push(element);
  selectElement(element.id);
  renderParams();
  scheduleStageRender();
}

async function addImageElement() {
  const path = await window.api.pickThumbnail();
  if (!path) return;
  const element = {
    id: newThumbElementId(),
    type: "image",
    src: path,
    x: 120,
    y: 120,
    width: 400,
    height: 400,
    opacity: 1,
  };
  thumbElements.push(element);
  selectElement(element.id);
  scheduleStageRender();
}

function elementMenuItems(element) {
  return [
    { label: "Edit", action: () => selectElement(element.id) },
    {
      label: "Duplicate",
      action: () => {
        const copy = JSON.parse(JSON.stringify(element));
        copy.id = newThumbElementId();
        copy.x += 30;
        copy.y += 30;
        thumbElements.push(copy);
        selectElement(copy.id);
        renderParams();
        scheduleStageRender();
      },
    },
    {
      label: "Bring to front",
      action: () => {
        thumbElements = thumbElements.filter((el) => el.id !== element.id);
        thumbElements.push(element);
        scheduleStageRender();
      },
    },
    {
      label: "Send to back",
      action: () => {
        thumbElements = thumbElements.filter((el) => el.id !== element.id);
        thumbElements.unshift(element);
        scheduleStageRender();
      },
    },
    { separator: true },
    {
      label: "Delete",
      action: () => {
        thumbElements = thumbElements.filter((el) => el.id !== element.id);
        if (selectedElementId === element.id) selectedElementId = null;
        renderProps();
        renderParams();
        scheduleStageRender();
      },
    },
  ];
}

function canvasMenuItems() {
  return [
    { label: "Add text", action: addTextElement },
    { label: "Add image", action: addImageElement },
    { separator: true },
    { label: "Export PNG", action: exportThumb },
  ];
}

function resetEditor() {
  editingThumbnailId = null;
  els.thumbName.value = "";
  thumbBackground = null;
  thumbParameters = [];
  thumbElements = [defaultTextElement()];
  selectedElementId = thumbElements[0].id;
  renderParams();
  renderProps();
  updateStageScale();
  scheduleStageRender();
}

function editThumbTemplate(tpl) {
  editingThumbnailId = tpl.id;
  els.thumbName.value = tpl.name;
  thumbBackground = tpl.backgroundPath || null;
  thumbParameters = (tpl.parameters || []).map((param) => ({ ...param }));
  thumbElements = JSON.parse(JSON.stringify(tpl.elements || []));
  selectedElementId = thumbElements.length ? thumbElements[0].id : null;
  renderParams();
  renderProps();
  showView("thumbnails");
  updateStageScale();
  scheduleStageRender();
}

async function saveThumbTemplate() {
  const name = els.thumbName.value.trim();
  if (!name) {
    els.thumbError.textContent = "Enter the template name.";
    return;
  }
  const template = currentThumbTemplate(name);
  const index = thumbnailTemplates.findIndex((t) => t.id === template.id);
  if (index === -1) thumbnailTemplates.push(template);
  else thumbnailTemplates[index] = template;
  try {
    thumbnailTemplates = await window.api.saveThumbnailTemplates(
      thumbnailTemplates
    );
    renderThumbTemplateList();
    refreshThumbTemplateSelects();
    resetEditor();
    setMessage("Thumbnail template saved.", "ok");
  } catch (err) {
    els.thumbError.textContent = err.message;
  }
}

async function exportThumb() {
  try {
    await window.api.exportThumbnail({
      template: currentThumbTemplate(),
      values: thumbPreviewValues(),
    });
  } catch (err) {
    els.thumbError.textContent = err.message;
  }
}

function renderThumbTemplateList() {
  els.thumbList.innerHTML = "";
  if (!thumbnailTemplates.length) {
    const empty = document.createElement("div");
    empty.className = "tpl-empty";
    empty.textContent = "No thumbnail templates yet.";
    els.thumbList.appendChild(empty);
    return;
  }
  thumbnailTemplates.forEach((tpl) => {
    const item = document.createElement("div");
    item.className = "tpl-item";

    const info = document.createElement("div");
    info.className = "tpl-info";
    const name = document.createElement("span");
    name.className = "tpl-name";
    name.textContent = tpl.name;
    const detail = document.createElement("span");
    detail.className = "tpl-detail";
    const elementCount = (tpl.elements || []).length;
    const paramCount = (tpl.parameters || []).length;
    detail.textContent = `${elementCount} element(s) | ${paramCount} parameter(s)`;
    info.append(name, detail);

    const buttons = document.createElement("div");
    buttons.className = "tpl-item-actions";
    const edit = document.createElement("button");
    edit.className = "ghost";
    edit.textContent = "Edit";
    edit.addEventListener("click", () => editThumbTemplate(tpl));
    const del = document.createElement("button");
    del.className = "danger";
    del.textContent = "Delete";
    del.addEventListener("click", async () => {
      thumbnailTemplates = thumbnailTemplates.filter((t) => t.id !== tpl.id);
      thumbnailTemplates = await window.api.saveThumbnailTemplates(
        thumbnailTemplates
      );
      renderThumbTemplateList();
      refreshThumbTemplateSelects();
    });
    buttons.append(edit, del);

    item.append(info, buttons);
    els.thumbList.appendChild(item);
  });
}

async function loadThumbnailFonts() {
  try {
    thumbnailFonts = await window.api.listThumbnailFonts();
  } catch {
    thumbnailFonts = [];
  }
}

async function loadThumbnailTemplates() {
  try {
    thumbnailTemplates = await window.api.listThumbnailTemplates();
  } catch {
    thumbnailTemplates = [];
  }
  renderThumbTemplateList();
  refreshThumbTemplateSelects();
}

els.thumbBgBtn.addEventListener("click", async () => {
  const path = await window.api.pickThumbnail();
  if (!path) return;
  thumbBackground = path;
  scheduleStageRender();
});

els.thumbExportBtn.addEventListener("click", exportThumb);
els.thumbSave.addEventListener("click", saveThumbTemplate);
els.thumbReset.addEventListener("click", resetEditor);

els.thumbStage.addEventListener("mousedown", (event) => {
  if (
    event.target === els.thumbStage ||
    event.target === els.thumbStageImg ||
    event.target === els.thumbStageBoxes
  ) {
    selectElement(null);
  }
});

els.thumbStage.addEventListener("contextmenu", (event) => {
  event.preventDefault();
  const box = event.target.closest ? event.target.closest(".thumb-box") : null;
  if (box) {
    const element = thumbElements.find((el) => el.id === box.dataset.id);
    if (!element) return;
    selectElement(element.id);
    showContextMenu(event.clientX, event.clientY, elementMenuItems(element));
  } else {
    showContextMenu(event.clientX, event.clientY, canvasMenuItems());
  }
});

window.addEventListener("mousedown", (event) => {
  if (!els.thumbContext.contains(event.target)) hideContextMenu();
});

window.addEventListener("resize", () => {
  if (document.getElementById("view-thumbnails").classList.contains("active")) {
    updateStageScale();
  }
});

/* ---------- Auth ---------- */

function setAuthUi(authenticated) {
  els.authStatus.textContent = authenticated ? "Connected" : "Disconnected";
  els.authStatus.className = "status " + (authenticated ? "on" : "off");
  els.loginBtn.classList.toggle("hidden", authenticated);
  els.logoutBtn.classList.toggle("hidden", !authenticated);
}

async function refreshAuth() {
  try {
    const authenticated = await window.api.authStatus();
    setAuthUi(authenticated);
  } catch {
    setAuthUi(false);
  }
}

els.loginBtn.addEventListener("click", async () => {
  setMessage("Opening authorization in your browser...");
  try {
    await window.api.login();
    await refreshAuth();
    await loadPlaylists();
    setMessage("Connected successfully.", "ok");
  } catch (err) {
    setMessage("Failed to connect: " + err.message, "error");
  }
});

els.logoutBtn.addEventListener("click", async () => {
  await window.api.logout();
  await refreshAuth();
  playlists = [];
  refreshPlaylistSelects();
  setMessage("Disconnected.");
});

/* ---------- Upload events ---------- */

window.api.onProgress(({ id, percent }) => {
  const item = itemById.get(id);
  if (!item || item.status !== "uploading") return;
  item.percent = percent;
  item.dom.fill.style.width = percent + "%";
  item.dom.pct.textContent = percent + "%";
  item.dom.status.textContent = statusText(item);
});

window.api.onCancelled(({ id }) => {
  const item = itemById.get(id);
  if (!item) return;
  item.cancelled = true;
  item.status = "canceled";
  item.dom.progress.classList.add("hidden");
  refreshItem(item);
  refreshQueueInfo();
});

/* ---------- Init ---------- */

async function init() {
  try {
    settings = await window.api.getSettings();
  } catch {
    /* keep defaults */
  }
  try {
    const info = await window.api.getAppInfo();
    els.aboutVersion.textContent = info.version;
  } catch {
    /* ignore */
  }
  applyTheme(settings.theme);
  renderSettingsForm();
  await loadTemplates();
  renderTemplateList();
  await loadThumbnailFonts();
  await loadThumbnailTemplates();
  resetEditor();
  await refreshAuth();
  await loadPlaylists();
  refreshQueueInfo();
}

init();
