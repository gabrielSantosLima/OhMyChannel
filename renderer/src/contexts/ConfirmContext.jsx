import { createContext, useCallback, useContext, useRef, useState } from "react";
import { t } from "../lib/api.js";

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const resolver = useRef(null);

  const confirm = useCallback((options = {}) => {
    if (resolver.current) {
      resolver.current(false);
      resolver.current = null;
    }
    return new Promise((resolve) => {
      resolver.current = resolve;
      setState({
        title: options.title || "",
        message: options.message || "",
        confirmLabel: options.confirmLabel || t("common.confirm"),
        cancelLabel: options.cancelLabel || t("common.cancel"),
        danger: options.danger !== false,
      });
    });
  }, []);

  const finish = useCallback((result) => {
    const resolve = resolver.current;
    resolver.current = null;
    setState(null);
    if (resolve) resolve(result);
  }, []);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state ? (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirmTitle"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) finish(false);
          }}
        >
          <div className="modal">
            <h3 id="confirmTitle" className="modal-title">
              {state.title}
            </h3>
            <p className="modal-message">{state.message}</p>
            <div className="modal-actions">
              <button
                type="button"
                className="ghost"
                onClick={() => finish(false)}
              >
                {state.cancelLabel}
              </button>
              <button
                type="button"
                className={state.danger ? "danger" : "primary"}
                onClick={() => finish(true)}
              >
                {state.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error("useConfirm must be used inside ConfirmProvider");
  return context;
}
