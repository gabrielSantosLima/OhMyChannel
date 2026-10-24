import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { t } from "../lib/api.js";

const ToastContext = createContext(null);

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

let nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    (message, options = {}) => {
      if (!message) return null;
      const type = ICONS[options.type] ? options.type : "info";
      const duration =
        options.duration === undefined
          ? type === "error"
            ? 9000
            : type === "warning"
              ? 7000
              : 4200
          : options.duration;
      const id = nextId++;
      setToasts((current) => {
        const next = [...current, { id, message, type }];
        while (next.length > 4) {
          const removed = next.shift();
          const timer = timers.current.get(removed.id);
          if (timer) clearTimeout(timer);
          timers.current.delete(removed.id);
        }
        return next;
      });
      if (duration > 0) {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), duration)
        );
      }
      return id;
    },
    [dismiss]
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((timer) => clearTimeout(timer));
      pending.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ notify, dismiss }}>
      {children}
      <div
        id="notifications"
        className="notifications"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`notification notification-${toast.type} visible`}
            role={toast.type === "error" ? "alert" : "status"}
          >
            <span
              className="notification-icon"
              dangerouslySetInnerHTML={{ __html: ICONS[toast.type] }}
            />
            <div className="notification-content">
              <p className="notification-text">{toast.message}</p>
            </div>
            <button
              type="button"
              className="notification-close"
              aria-label={t("common.dismiss")}
              onClick={() => dismiss(toast.id)}
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M18 6L6 18" />
                <path d="M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
