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
  thumbBgName: document.getElementById("thumbBgName"),
  thumbBgClear: document.getElementById("thumbBgClear"),
  thumbLayers: document.getElementById("thumbLayers"),
  thumbAddLayer: document.getElementById("thumbAddLayer"),
  thumbValues: document.getElementById("thumbValues"),
  thumbSave: document.getElementById("thumbSave"),
  thumbReset: document.getElementById("thumbReset"),
  thumbError: document.getElementById("thumbError"),
  thumbPreviewImg: document.getElementById("thumbPreviewImg"),
  thumbList: document.getElementById("thumbList"),
};

const items = [];
const itemById = new Map();
let templates = [];
let playlists = [];
let thumbnailTemplates = [];
let thumbnailFonts = [];
let thumbBackground = null;
let thumbLayers = [];
let thumbValues = {};
let editingThumbnailId = null;
let thumbPreviewTimer = null;
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
      thumbnailPath: item.thumbnailPath || null,
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

function bindLayer(control, key, layer, { numeric = false, event = "input" } = {}) {
  control.addEventListener(event, () => {
    layer[key] = numeric ? Number(control.value) || 0 : control.value;
    if (key === "text") renderThumbValueInputs();
    scheduleThumbPreview();
  });
}

function defaultLayer() {
  const family = thumbnailFonts.length ? thumbnailFonts[0].name : "Lato";
  const entry = thumbnailFonts.find((font) => font.name === family);
  const hasBold = entry ? entry.weights.includes(700) : false;
  return {
    text: "{episode}",
    fontFamily: family,
    fontWeight: hasBold ? 700 : 400,
    fontSize: 120,
    color: "#ffffff",
    x: 0,
    y: 820,
    width: THUMB_WIDTH,
    align: "center",
    strokeColor: "#000000",
    strokeWidth: 0,
    shadowColor: "#000000",
    shadowBlur: 0,
    shadowX: 0,
    shadowY: 0,
  };
}

function buildLayerRow(layer, index) {
  const row = document.createElement("div");
  row.className = "thumb-layer";

  const head = document.createElement("div");
  head.className = "thumb-layer-head";
  const title = document.createElement("span");
  title.textContent = "Text layer " + (index + 1);
  const remove = document.createElement("button");
  remove.className = "ghost";
  remove.textContent = "Remove";
  remove.addEventListener("click", () => {
    thumbLayers.splice(index, 1);
    renderThumbLayerRows();
    renderThumbValueInputs();
    scheduleThumbPreview();
  });
  head.append(title, remove);
  row.appendChild(head);

  const text = document.createElement("input");
  text.type = "text";
  text.value = layer.text;
  text.placeholder = "Text, e.g. EPISODE {episode}";
  bindLayer(text, "text", layer);
  row.appendChild(thumbField("Text", text));

  const grid = document.createElement("div");
  grid.className = "thumb-grid";

  const font = document.createElement("select");
  thumbnailFonts.forEach((entry) => {
    const option = document.createElement("option");
    option.value = entry.name;
    option.textContent = entry.name;
    font.appendChild(option);
  });
  font.value = layer.fontFamily;
  bindLayer(font, "fontFamily", layer, { event: "change" });
  grid.appendChild(thumbField("Font", font));

  const weight = selectInput(
    [100, 200, 300, 400, 500, 600, 700, 800, 900],
    layer.fontWeight
  );
  bindLayer(weight, "fontWeight", layer, { numeric: true, event: "change" });
  grid.appendChild(thumbField("Weight", weight));

  const size = numberInput(layer.fontSize);
  bindLayer(size, "fontSize", layer, { numeric: true });
  grid.appendChild(thumbField("Size", size));

  const color = colorInput(layer.color);
  bindLayer(color, "color", layer);
  grid.appendChild(thumbField("Color", color));

  const align = selectInput(["left", "center", "right"], layer.align);
  bindLayer(align, "align", layer, { event: "change" });
  grid.appendChild(thumbField("Align", align));

  const x = numberInput(layer.x);
  bindLayer(x, "x", layer, { numeric: true });
  grid.appendChild(thumbField("X", x));

  const y = numberInput(layer.y);
  bindLayer(y, "y", layer, { numeric: true });
  grid.appendChild(thumbField("Y", y));

  const width = numberInput(layer.width);
  bindLayer(width, "width", layer, { numeric: true });
  grid.appendChild(thumbField("Width", width));

  const strokeColor = colorInput(layer.strokeColor);
  bindLayer(strokeColor, "strokeColor", layer);
  grid.appendChild(thumbField("Stroke", strokeColor));

  const strokeWidth = numberInput(layer.strokeWidth);
  bindLayer(strokeWidth, "strokeWidth", layer, { numeric: true });
  grid.appendChild(thumbField("Stroke px", strokeWidth));

  const shadowColor = colorInput(layer.shadowColor);
  bindLayer(shadowColor, "shadowColor", layer);
  grid.appendChild(thumbField("Shadow", shadowColor));

  const shadowBlur = numberInput(layer.shadowBlur);
  bindLayer(shadowBlur, "shadowBlur", layer, { numeric: true });
  grid.appendChild(thumbField("Blur", shadowBlur));

  row.appendChild(grid);
  return row;
}

function renderThumbLayerRows() {
  els.thumbLayers.innerHTML = "";
  thumbLayers.forEach((layer, index) => {
    els.thumbLayers.appendChild(buildLayerRow(layer, index));
  });
}

function collectPlaceholders() {
  const keys = new Set();
  thumbLayers.forEach((layer) => {
    const matches = String(layer.text).match(/\{(\w+)\}/g) || [];
    matches.forEach((match) => keys.add(match.slice(1, -1)));
  });
  return [...keys];
}

function renderThumbValueInputs() {
  const keys = collectPlaceholders();
  els.thumbValues.innerHTML = "";
  if (!keys.length) {
    els.thumbValues.classList.add("hidden");
    return;
  }
  els.thumbValues.classList.remove("hidden");
  keys.forEach((key) => {
    if (thumbValues[key] === undefined) {
      thumbValues[key] =
        key === "episode" ? "12" : key === "title" ? "Sample Title" : key;
    }
    const input = document.createElement("input");
    input.type = "text";
    input.value = thumbValues[key];
    input.placeholder = key;
    input.addEventListener("input", () => {
      thumbValues[key] = input.value;
      scheduleThumbPreview();
    });
    els.thumbValues.appendChild(thumbField("{" + key + "}", input));
  });
}

function buildThumbTemplate(name) {
  return {
    id: editingThumbnailId,
    name: name || els.thumbName.value.trim() || "Untitled",
    width: THUMB_WIDTH,
    height: THUMB_HEIGHT,
    backgroundPath: thumbBackground,
    layers: thumbLayers,
  };
}

async function updateThumbPreview() {
  try {
    const dataUrl = await window.api.generateThumbnail({
      template: buildThumbTemplate(),
      values: thumbValues,
      asDataUrl: true,
    });
    els.thumbPreviewImg.src = dataUrl;
    els.thumbError.textContent = "";
  } catch (err) {
    els.thumbError.textContent = err.message;
  }
}

function scheduleThumbPreview() {
  clearTimeout(thumbPreviewTimer);
  thumbPreviewTimer = setTimeout(updateThumbPreview, 250);
}

function updateThumbBackgroundUi() {
  els.thumbBgName.textContent = thumbBackground
    ? thumbBackground.split(/[\\/]/).pop()
    : "No background";
  els.thumbBgClear.classList.toggle("hidden", !thumbBackground);
}

function resetEditor() {
  editingThumbnailId = null;
  els.thumbName.value = "";
  thumbBackground = null;
  updateThumbBackgroundUi();
  thumbValues = {};
  thumbLayers = [defaultLayer()];
  renderThumbLayerRows();
  renderThumbValueInputs();
  els.thumbError.textContent = "";
  updateThumbPreview();
}

function editThumbTemplate(tpl) {
  editingThumbnailId = tpl.id;
  els.thumbName.value = tpl.name;
  thumbBackground = tpl.backgroundPath || null;
  updateThumbBackgroundUi();
  thumbValues = {};
  thumbLayers = (tpl.layers || []).map((layer) => ({
    ...defaultLayer(),
    ...layer,
  }));
  renderThumbLayerRows();
  renderThumbValueInputs();
  els.thumbError.textContent = "";
  showView("thumbnails");
  updateThumbPreview();
}

async function saveThumbTemplate() {
  const name = els.thumbName.value.trim();
  if (!name) {
    els.thumbError.textContent = "Enter the template name.";
    return;
  }
  const template = {
    id: editingThumbnailId || undefined,
    name,
    width: THUMB_WIDTH,
    height: THUMB_HEIGHT,
    backgroundPath: thumbBackground,
    layers: thumbLayers,
  };
  const index = thumbnailTemplates.findIndex((t) => t.id === template.id);
  if (index === -1) thumbnailTemplates.push(template);
  else thumbnailTemplates[index] = template;
  try {
    thumbnailTemplates = await window.api.saveThumbnailTemplates(
      thumbnailTemplates
    );
    renderThumbTemplateList();
    resetEditor();
    setMessage("Thumbnail template saved.", "ok");
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
    detail.textContent =
      `${tpl.width}x${tpl.height} | ` +
      (tpl.layers.length ? tpl.layers.length + " layer(s)" : "no layers");
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
}

els.thumbBgBtn.addEventListener("click", async () => {
  const path = await window.api.pickThumbnail();
  if (!path) return;
  thumbBackground = path;
  updateThumbBackgroundUi();
  scheduleThumbPreview();
});

els.thumbBgClear.addEventListener("click", () => {
  thumbBackground = null;
  updateThumbBackgroundUi();
  scheduleThumbPreview();
});

els.thumbAddLayer.addEventListener("click", () => {
  thumbLayers.push(defaultLayer());
  renderThumbLayerRows();
  renderThumbValueInputs();
  scheduleThumbPreview();
});

els.thumbSave.addEventListener("click", saveThumbTemplate);
els.thumbReset.addEventListener("click", resetEditor);

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
