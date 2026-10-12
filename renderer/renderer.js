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
};

const items = [];
const itemById = new Map();
let templates = [];
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

function matchCommand(line) {
  const match = line.trim().match(/^\/template\s+(\S+)(?:\s+(.*))?$/);
  if (!match) return null;
  return {
    name: match[1],
    values: match[2] ? match[2].split(/\s+/).filter(Boolean) : [],
  };
}

function expandValue(raw) {
  return raw
    .split("\n")
    .map((line) => {
      const parsed = matchCommand(line);
      if (!parsed) return line;
      const tpl = findTemplate(parsed.name);
      if (!tpl) return line;
      return expandTemplate(tpl, parsed.values);
    })
    .join("\n");
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

/* ---------- Command-aware field ---------- */

function createCommandField({ input, menu, preview, onChange }) {
  let menuItems = [];
  let menuIndex = 0;

  const lineStart = () =>
    input.value.lastIndexOf("\n", input.selectionStart - 1) + 1;

  const lineEnd = () => {
    const end = input.value.indexOf("\n", input.selectionStart);
    return end === -1 ? input.value.length : end;
  };

  const segmentBeforeCaret = () =>
    input.value.slice(lineStart(), input.selectionStart);

  const currentLine = () => input.value.slice(lineStart(), lineEnd());

  function setLine(text) {
    const start = lineStart();
    const end = lineEnd();
    input.value = input.value.slice(0, start) + text + input.value.slice(end);
    const pos = start + text.length;
    input.focus();
    input.setSelectionRange(pos, pos);
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

  function updateMenu() {
    const segment = segmentBeforeCaret();
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
            setLine("/template ");
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
            apply: () => {
              setLine(`/template ${t.name} `);
              hideMenu();
              updatePreview();
              onChange();
            },
          }))
      );
      return;
    }

    hideMenu();
  }

  function updatePreview() {
    const parsed = matchCommand(currentLine());
    if (!parsed) {
      preview.classList.add("hidden");
      preview.innerHTML = "";
      return;
    }
    const tpl = findTemplate(parsed.name);
    preview.classList.remove("hidden");
    if (!tpl) {
      preview.innerHTML = `Template <strong>${escapeHtml(
        parsed.name
      )}</strong> not found.`;
      return;
    }
    const missing = tpl.params.filter((_p, i) => !parsed.values[i]);
    let html = `Preview: <strong>${escapeHtml(
      expandTemplate(tpl, parsed.values)
    )}</strong>`;
    if (missing.length) {
      html += ` &middot; missing: ${escapeHtml(missing.join(", "))}`;
    }
    preview.innerHTML = html;
  }

  input.addEventListener("input", () => {
    updateMenu();
    updatePreview();
    onChange();
  });

  input.addEventListener("keydown", (event) => {
    if (menu.classList.contains("hidden")) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      menuIndex = (menuIndex + 1) % menuItems.length;
      showMenu(menuItems);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      menuIndex = (menuIndex - 1 + menuItems.length) % menuItems.length;
      showMenu(menuItems);
    } else if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      selectActive();
    } else if (event.key === "Escape") {
      hideMenu();
    }
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
  const title = expandValue(item.dom.title.value);
  item.dom.titleCount.textContent = `${title.length} / 100`;
  item.dom.titleCount.style.color = title.length > 100 ? "var(--error)" : "";

  const description = expandValue(item.dom.desc.value);
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
  item.dom.upload.disabled = done || !expandValue(item.dom.title.value).trim();
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

  const titleInput = document.createElement("input");
  titleInput.type = "text";
  titleInput.maxLength = 200;
  titleInput.autocomplete = "off";
  titleInput.value = fileName.replace(/\.[^.]+$/, "");
  titleInput.placeholder = "Video title or /template ...";
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

  const descInput = document.createElement("textarea");
  descInput.maxLength = 5000;
  descInput.rows = 3;
  descInput.placeholder = "Video description or /template ...";
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

  card.append(head, titleField, descField, actions);
  els.queue.appendChild(card);

  item.dom = {
    card,
    status,
    title: titleInput,
    titleCount,
    desc: descInput,
    descCount,
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

  const title = expandValue(item.dom.title.value).slice(0, 100);
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
      description: expandValue(item.dom.desc.value).slice(0, 5000),
    });
    item.status = "done";
    item.percent = 100;
    item.dom.fill.style.width = "100%";
    item.dom.pct.textContent = "100%";
    setMessage(`Uploaded "${title}" - https://youtu.be/${result.id}`, "ok");
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
    setMessage("Connected successfully.", "ok");
  } catch (err) {
    setMessage("Failed to connect: " + err.message, "error");
  }
});

els.logoutBtn.addEventListener("click", async () => {
  await window.api.logout();
  await refreshAuth();
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
  refreshAuth();
  refreshQueueInfo();
}

init();
