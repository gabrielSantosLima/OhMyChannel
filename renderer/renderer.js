const els = {
  authStatus: document.getElementById("authStatus"),
  loginBtn: document.getElementById("loginBtn"),
  logoutBtn: document.getElementById("logoutBtn"),
  pickBtn: document.getElementById("pickBtn"),
  fileName: document.getElementById("fileName"),
  title: document.getElementById("title"),
  titleCount: document.getElementById("titleCount"),
  description: document.getElementById("description"),
  descCount: document.getElementById("descCount"),
  uploadBtn: document.getElementById("uploadBtn"),
  progressWrap: document.getElementById("progressWrap"),
  progressBar: document.getElementById("progressBar"),
  progressText: document.getElementById("progressText"),
  message: document.getElementById("message"),
};

let selectedFile = null;
let uploading = false;

function setMessage(text, type = "") {
  els.message.textContent = text;
  els.message.className = "message " + type;
}

function refreshUploadState() {
  els.uploadBtn.disabled =
    uploading || !selectedFile || els.title.value.trim().length === 0;
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

els.pickBtn.addEventListener("click", async () => {
  const file = await window.api.pickVideo();
  if (!file) return;
  selectedFile = file;
  const name = file.split(/[\\/]/).pop();
  els.fileName.textContent = name;
  els.fileName.title = file;
  if (!els.title.value) {
    els.title.value = name.replace(/\.[^.]+$/, "");
    updateCounters();
  }
  refreshUploadState();
});

els.title.addEventListener("input", () => {
  updateCounters();
  refreshUploadState();
});

els.description.addEventListener("input", updateCounters);

function updateCounters() {
  els.titleCount.textContent = `${els.title.value.length} / 100`;
  els.descCount.textContent = `${els.description.value.length} / 5000`;
}

window.api.onProgress(({ percent }) => {
  els.progressWrap.classList.remove("hidden");
  els.progressBar.style.width = percent + "%";
  els.progressText.textContent = percent + "%";
});

els.uploadBtn.addEventListener("click", async () => {
  if (!selectedFile) return;
  uploading = true;
  refreshUploadState();
  els.progressWrap.classList.remove("hidden");
  els.progressBar.style.width = "0%";
  els.progressText.textContent = "0%";
  setMessage("Enviando...");

  try {
    const result = await window.api.upload({
      filePath: selectedFile,
      title: els.title.value.trim(),
      description: els.description.value.trim(),
    });
    setMessage(
      `Enviado! ID: ${result.id} - https://youtu.be/${result.id}`,
      "ok"
    );
    els.progressBar.style.width = "100%";
    els.progressText.textContent = "100%";
  } catch (err) {
    setMessage("Erro no upload: " + err.message, "error");
  } finally {
    uploading = false;
    refreshUploadState();
  }
});

refreshAuth();
updateCounters();
