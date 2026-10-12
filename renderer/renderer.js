const els = {
  authStatus: document.getElementById("authStatus"),
  loginBtn: document.getElementById("loginBtn"),
  logoutBtn: document.getElementById("logoutBtn"),
  pickBtn: document.getElementById("pickBtn"),
  fileName: document.getElementById("fileName"),
  title: document.getElementById("title"),
  titleCount: document.getElementById("titleCount"),
  commandMenu: document.getElementById("commandMenu"),
  titlePreview: document.getElementById("titlePreview"),
  description: document.getElementById("description"),
  descCount: document.getElementById("descCount"),
  descCommandMenu: document.getElementById("descCommandMenu"),
  descPreview: document.getElementById("descPreview"),
  uploadBtn: document.getElementById("uploadBtn"),
  progressWrap: document.getElementById("progressWrap"),
  progressBar: document.getElementById("progressBar"),
  progressText: document.getElementById("progressText"),
  message: document.getElementById("message"),
  themeBtn: document.getElementById("themeBtn"),
  templatesBtn: document.getElementById("templatesBtn"),
  templatesModal: document.getElementById("templatesModal"),
  templatesClose: document.getElementById("templatesClose"),
  tplName: document.getElementById("tplName"),
  tplParams: document.getElementById("tplParams"),
  tplTitle: document.getElementById("tplTitle"),
  tplAdd: document.getElementById("tplAdd"),
  tplError: document.getElementById("tplError"),
  tplList: document.getElementById("tplList"),
};

let selectedFile = null;
let uploading = false;
let cancelled = false;
let templates = [];

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
  try {
    localStorage.setItem("theme", theme);
  } catch {
    /* ignore */
  }
}

function initTheme() {
  let saved = null;
  try {
    saved = localStorage.getItem("theme");
  } catch {
    /* ignore */
  }
  if (saved === "dark" || saved === "light") {
    applyTheme(saved);
  } else {
    const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
    applyTheme(prefersLight ? "light" : "dark");
  }
}

els.themeBtn.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  applyTheme(current === "dark" ? "light" : "dark");
});

/* ---------- Templates ---------- */

function findTemplate(name) {
  return templates.find((t) => t.name === name);
}

function expandTemplate(tpl, values) {
  let out = tpl.title;
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

  function showMenu(items) {
    if (!items.length) {
      hideMenu();
      return;
    }
    menuItems = items;
    if (menuIndex >= items.length) menuIndex = 0;
    menu.innerHTML = "";
    items.forEach((item, i) => {
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
        { name: "template", hint: "Inserir um template" },
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
            hint: t.title,
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
      )}</strong> nao encontrado.`;
      return;
    }
    const missing = tpl.params.filter((_p, i) => !parsed.values[i]);
    let html = `Previa: <strong>${escapeHtml(
      expandTemplate(tpl, parsed.values)
    )}</strong>`;
    if (missing.length) {
      html += ` &middot; faltam: ${escapeHtml(missing.join(", "))}`;
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

const titleField = createCommandField({
  input: els.title,
  menu: els.commandMenu,
  preview: els.titlePreview,
  onChange: () => {
    updateCounters();
    refreshUploadState();
  },
});

createCommandField({
  input: els.description,
  menu: els.descCommandMenu,
  preview: els.descPreview,
  onChange: () => updateCounters(),
});

/* ---------- Templates modal ---------- */

function renderTemplateList() {
  els.tplList.innerHTML = "";
  if (templates.length === 0) {
    const empty = document.createElement("div");
    empty.className = "tpl-empty";
    empty.textContent = "Nenhum template cadastrado.";
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
      tpl.title + (tpl.params.length ? " | params: " + tpl.params.join(", ") : "");
    info.appendChild(name);
    info.appendChild(detail);

    const del = document.createElement("button");
    del.className = "danger";
    del.textContent = "Excluir";
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
  const title = els.tplTitle.value.trim();

  if (!name) return (els.tplError.textContent = "Informe o nome do template.");
  if (findTemplate(name))
    return (els.tplError.textContent = "Ja existe um template com esse nome.");
  if (!title) return (els.tplError.textContent = "Informe o padrao do texto.");
  for (const param of params) {
    if (!title.includes("{" + param + "}")) {
      return (els.tplError.textContent = `O padrao nao usa o parametro {${param}}.`);
    }
  }

  templates.push({ id: Date.now().toString(36), name, params, title });
  await persistTemplates();
  els.tplError.textContent = "";
  els.tplName.value = "";
  els.tplParams.value = "";
  els.tplTitle.value = "";
  renderTemplateList();
}

els.tplAdd.addEventListener("click", addTemplate);
els.templatesBtn.addEventListener("click", () => {
  els.tplError.textContent = "";
  renderTemplateList();
  els.templatesModal.classList.remove("hidden");
});
els.templatesClose.addEventListener("click", () =>
  els.templatesModal.classList.add("hidden")
);
els.templatesModal.addEventListener("click", (e) => {
  if (e.target === els.templatesModal)
    els.templatesModal.classList.add("hidden");
});

/* ---------- Auth ---------- */

function refreshUploadState() {
  const title = expandValue(els.title.value);
  els.uploadBtn.disabled =
    uploading || !selectedFile || title.trim().length === 0;
}

function setAuthUi(authenticated) {
  els.authStatus.textContent = authenticated ? "Conectado" : "Desconectado";
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
  setMessage("Abrindo autorizacao no navegador...");
  try {
    await window.api.login();
    await refreshAuth();
    setMessage("Conectado com sucesso.", "ok");
  } catch (err) {
    setMessage("Falha ao conectar: " + err.message, "error");
  }
});

els.logoutBtn.addEventListener("click", async () => {
  await window.api.logout();
  await refreshAuth();
  setMessage("Desconectado.");
});

/* ---------- File / counters ---------- */

els.pickBtn.addEventListener("click", async () => {
  const file = await window.api.pickVideo();
  if (!file) return;
  selectedFile = file;
  const name = file.split(/[\\/]/).pop();
  els.fileName.textContent = name;
  els.fileName.title = file;
  if (!els.title.value) {
    els.title.value = name.replace(/\.[^.]+$/, "");
    titleField.updateMenu();
    titleField.updatePreview();
    updateCounters();
  }
  refreshUploadState();
});

function updateCounters() {
  const title = expandValue(els.title.value);
  els.titleCount.textContent = `${title.length} / 100`;
  els.titleCount.style.color = title.length > 100 ? "var(--error)" : "";

  const description = expandValue(els.description.value);
  els.descCount.textContent = `${description.length} / 5000`;
  els.descCount.style.color =
    description.length > 5000 ? "var(--error)" : "";
}

/* ---------- Upload ---------- */

window.api.onProgress(({ percent }) => {
  els.progressWrap.classList.remove("hidden");
  els.progressBar.style.width = percent + "%";
  els.progressText.textContent = percent + "%";
});

window.api.onCancelled(() => {
  cancelled = true;
  uploading = false;
  els.progressWrap.classList.add("hidden");
  els.progressBar.style.width = "0%";
  els.progressText.textContent = "0%";
  setMessage("Upload cancelado.", "");
  refreshUploadState();
});

els.uploadBtn.addEventListener("click", async () => {
  if (!selectedFile) return;
  uploading = true;
  cancelled = false;
  refreshUploadState();
  els.progressWrap.classList.remove("hidden");
  els.progressBar.style.width = "0%";
  els.progressText.textContent = "0%";
  setMessage("Enviando...");

  try {
    const result = await window.api.upload({
      filePath: selectedFile,
      title: expandValue(els.title.value).slice(0, 100),
      description: expandValue(els.description.value).slice(0, 5000),
    });
    setMessage(
      `Enviado! ID: ${result.id} - https://youtu.be/${result.id}`,
      "ok"
    );
    els.progressBar.style.width = "100%";
    els.progressText.textContent = "100%";
  } catch (err) {
    if (cancelled) return;
    setMessage("Erro no upload: " + err.message, "error");
  } finally {
    uploading = false;
    refreshUploadState();
  }
});

/* ---------- Init ---------- */

async function init() {
  initTheme();
  await loadTemplates();
  refreshAuth();
  updateCounters();
}

init();
