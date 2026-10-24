(function () {
  const ICONS = {
    success:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
    error:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><path d="M12 16h.01"/></svg>',
    warning:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
    info:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/></svg>',
  };

  let container = null;
  let seed = 0;

  function ensureContainer() {
    if (container && document.body.contains(container)) return container;
    container = document.createElement("div");
    container.id = "notifications";
    container.className = "notifications";
    container.setAttribute("aria-live", "polite");
    container.setAttribute("aria-atomic", "false");
    document.body.appendChild(container);
    return container;
  }

  function dismiss(toast) {
    if (!toast || toast.dataset.closing === "true") return;
    toast.dataset.closing = "true";
    clearTimeout(Number(toast.dataset.timer));
    toast.classList.remove("visible");
    toast.classList.add("leaving");
    window.setTimeout(() => toast.remove(), 220);
  }

  function dismissAll() {
    const host = ensureContainer();
    Array.from(host.children).forEach(dismiss);
  }

  function notify(message, options = {}) {
    if (!message) return null;
    const type = Object.prototype.hasOwnProperty.call(ICONS, options.type)
      ? options.type
      : "info";
    const title = options.title || "";
    const duration =
      options.duration === undefined
        ? type === "error"
          ? 9000
          : type === "warning"
            ? 7000
            : 4200
        : options.duration;

    const host = ensureContainer();
    while (host.children.length >= 4) dismiss(host.firstElementChild);

    const toast = document.createElement("div");
    toast.className = "notification notification-" + type;
    toast.setAttribute("role", type === "error" ? "alert" : "status");
    toast.dataset.id = String((seed += 1));

    const icon = document.createElement("span");
    icon.className = "notification-icon";
    icon.innerHTML = ICONS[type];

    const content = document.createElement("div");
    content.className = "notification-content";

    if (title) {
      const heading = document.createElement("strong");
      heading.className = "notification-title";
      heading.textContent = title;
      content.appendChild(heading);
    }

    const text = document.createElement("p");
    text.className = "notification-text";
    text.textContent = message;
    content.appendChild(text);

    const close = document.createElement("button");
    close.type = "button";
    close.className = "notification-close";
    close.setAttribute(
      "aria-label",
      window.i18n ? window.i18n.t("common.dismiss") : "Dismiss"
    );
    close.innerHTML =
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>';
    close.addEventListener("click", () => dismiss(toast));

    toast.appendChild(icon);
    toast.appendChild(content);
    toast.appendChild(close);

    if (duration > 0) {
      const progress = document.createElement("span");
      progress.className = "notification-progress";
      progress.style.animationDuration = duration + "ms";
      toast.appendChild(progress);
      toast.dataset.timer = String(
        window.setTimeout(() => dismiss(toast), duration)
      );
    }

    host.appendChild(toast);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => toast.classList.add("visible"));
    });

    return toast;
  }

  window.notifications = { notify, dismissAll };
  window.notify = notify;
})();
