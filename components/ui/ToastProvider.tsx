"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ToastSelectField = {
  type: "select";
  id: string;
  label?: string;
  options: { value: string; label: string }[];
  defaultValue: string;
};

export type ToastVariant = "success" | "error" | "warning" | "info";

export type ToastShowOptions = {
  durationMs?: number;
  variant?: ToastVariant;
};

export type ToastActionOptions = {
  message: string;
  actionLabel: string;
  dismissLabel?: string;
  secondaryActionLabel?: string;
  fields?: ToastSelectField[];
  onAction: (fieldValues?: Record<string, string>) => void | Promise<void>;
  onDismiss?: () => void;
  onSecondaryAction?: () => void | Promise<void>;
  durationMs?: number;
  accent?: "blue" | "emerald";
};

type ToastContextValue = {
  show: (message: string, durationMsOrOptions?: number | ToastShowOptions) => void;
  showAction: (options: ToastActionOptions) => void;
  dismiss: () => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_TOAST_DURATION_MS = 4000;

function inferToastVariant(message: string): ToastVariant {
  const lower = message.toLowerCase();

  if (
    lower.includes("fail") ||
    lower.includes("error") ||
    lower.includes("invalid") ||
    lower.includes("unable")
  ) {
    return "error";
  }

  if (
    lower.includes("first") ||
    lower.includes("login") ||
    lower.includes("already") ||
    lower.includes("pick ")
  ) {
    return "warning";
  }

  if (lower.includes("removed") || lower.includes("unchecked")) {
    return "info";
  }

  if (
    lower.includes("added") ||
    lower.includes("saved") ||
    lower.includes("success") ||
    lower.includes("selected")
  ) {
    return "success";
  }

  return "success";
}

function parseShowArgs(durationMsOrOptions?: number | ToastShowOptions): {
  durationMs: number;
  variant?: ToastVariant;
} {
  if (typeof durationMsOrOptions === "number") {
    return { durationMs: durationMsOrOptions };
  }

  return {
    durationMs: durationMsOrOptions?.durationMs ?? DEFAULT_TOAST_DURATION_MS,
    variant: durationMsOrOptions?.variant,
  };
}

const FALLBACK_TOAST: ToastContextValue = {
  show: () => {},
  showAction: () => {},
  dismiss: () => {},
};

type ToastState =
  | { kind: "message"; message: string; variant: ToastVariant }
  | {
      kind: "action";
      message: string;
      actionLabel: string;
      dismissLabel: string;
      secondaryActionLabel?: string;
      fields?: ToastSelectField[];
      fieldValues: Record<string, string>;
      onAction: (fieldValues?: Record<string, string>) => void | Promise<void>;
      onDismiss?: () => void;
      onSecondaryAction?: () => void | Promise<void>;
      accent: "blue" | "emerald";
    }
  | null;

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  return ctx ?? FALLBACK_TOAST;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setActionLoading(false);
    setToast(null);
  }, []);

  const show = useCallback(
    (message: string, durationMsOrOptions?: number | ToastShowOptions) => {
      const { durationMs, variant } = parseShowArgs(durationMsOrOptions);
      dismiss();
      setToast({
        kind: "message",
        message,
        variant: variant ?? inferToastVariant(message),
      });
      timerRef.current = setTimeout(dismiss, durationMs);
    },
    [dismiss]
  );

  const showAction = useCallback(
    (options: ToastActionOptions) => {
      dismiss();
      const fieldValues: Record<string, string> = {};
      for (const field of options.fields ?? []) {
        if (field.type === "select") {
          fieldValues[field.id] = field.defaultValue;
        }
      }
      setToast({
        kind: "action",
        message: options.message,
        actionLabel: options.actionLabel,
        dismissLabel: options.dismissLabel ?? "No",
        secondaryActionLabel: options.secondaryActionLabel,
        fields: options.fields,
        fieldValues,
        onAction: options.onAction,
        onDismiss: options.onDismiss,
        onSecondaryAction: options.onSecondaryAction,
        accent: options.accent ?? "blue",
      });
      if (options.durationMs != null) {
        timerRef.current = setTimeout(dismiss, options.durationMs);
      }
    },
    [dismiss]
  );

  useEffect(() => dismiss, [dismiss]);

  function handleDismissClick() {
    if (!toast || toast.kind !== "action" || actionLoading) return;
    toast.onDismiss?.();
    dismiss();
  }

  async function handleActionClick() {
    if (!toast || toast.kind !== "action" || actionLoading) return;

    setActionLoading(true);
    try {
      const fieldValues =
        toast.fields && toast.fields.length > 0 ? toast.fieldValues : undefined;
      await toast.onAction(fieldValues);
      dismiss();
    } catch {
      setActionLoading(false);
    }
  }

  async function handleSecondaryActionClick() {
    if (!toast || toast.kind !== "action" || actionLoading || !toast.onSecondaryAction) {
      return;
    }

    setActionLoading(true);
    try {
      await toast.onSecondaryAction();
      dismiss();
    } catch {
      setActionLoading(false);
    }
  }

  function updateFieldValue(id: string, value: string) {
    setToast((current) => {
      if (!current || current.kind !== "action") return current;
      return {
        ...current,
        fieldValues: { ...current.fieldValues, [id]: value },
      };
    });
  }

  return (
    <ToastContext.Provider value={{ show, showAction, dismiss }}>
      {children}
      {toast && (
        <div
          role={toast.kind === "action" ? "alertdialog" : "status"}
          aria-live="polite"
          className={`pointer-events-auto fixed top-1/2 left-1/2 z-[110] -translate-x-1/2 -translate-y-1/2 rounded-xl px-4 py-3 text-center text-sm shadow-2xl backdrop-blur-sm ${
            toast.kind === "action"
              ? `toast-action toast-action--${toast.accent} ${
                  toast.fields?.length ? "w-[min(100vw-2rem,24rem)]" : "w-[min(100vw-2rem,20rem)]"
                }`
              : `toast toast--${toast.variant} w-[min(100vw-2rem,20rem)]`
          }`}
        >
          <p>{toast.message}</p>
          {toast.kind === "action" && toast.fields && toast.fields.length > 0 && (
            <div className="mt-3 space-y-3 text-left">
              {toast.fields.map((field) => {
                if (field.type !== "select") return null;
                return (
                  <div key={field.id}>
                    {field.label && (
                      <label
                        htmlFor={`toast-field-${field.id}`}
                        className="toast-action__label"
                      >
                        {field.label}
                      </label>
                    )}
                    <select
                      id={`toast-field-${field.id}`}
                      value={toast.fieldValues[field.id] ?? field.defaultValue}
                      onChange={(e) => updateFieldValue(field.id, e.target.value)}
                      disabled={actionLoading}
                      className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500 disabled:opacity-60"
                    >
                      {field.options.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          )}
          {toast.kind === "action" && (
            <div className="mt-3 space-y-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDismissClick}
                  disabled={actionLoading}
                  className="flex-1 rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:border-slate-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {toast.dismissLabel}
                </button>
                <button
                  type="button"
                  onClick={handleActionClick}
                  disabled={actionLoading}
                  className="toast-action__btn-primary flex-1 rounded-lg px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading ? "…" : toast.actionLabel}
                </button>
              </div>
              {toast.secondaryActionLabel && toast.onSecondaryAction ? (
                <button
                  type="button"
                  onClick={handleSecondaryActionClick}
                  disabled={actionLoading}
                  className="w-full rounded-lg px-2 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {toast.secondaryActionLabel}
                </button>
              ) : null}
            </div>
          )}
        </div>
      )}
    </ToastContext.Provider>
  );
}
