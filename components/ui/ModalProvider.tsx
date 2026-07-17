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
import { useAppMessages } from "@/lib/i18n/client-messages";

export type ModalVariant = "error" | "success" | "info";

type ModalMode = "alert" | "confirm";

type ModalOptions = {
  title?: string;
  variant?: ModalVariant;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type ActiveModal = {
  mode: ModalMode;
  message: string;
  title?: string;
  variant: ModalVariant;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type ModalContextValue = {
  alert: (message: string, options?: ModalOptions) => Promise<void>;
  confirm: (message: string, options?: ModalOptions) => Promise<boolean>;
};

const ModalContext = createContext<ModalContextValue | null>(null);

const FALLBACK_MODAL: ModalContextValue = {
  alert: async (message) => {
    if (typeof window !== "undefined") window.alert(message);
  },
  confirm: async (message) => {
    if (typeof window !== "undefined") return window.confirm(message);
    return false;
  },
};

export function useModal(): ModalContextValue {
  const ctx = useContext(ModalContext);
  return ctx ?? FALLBACK_MODAL;
}

const variantBorder: Record<ModalVariant, string> = {
  error: "border-red-500/40",
  success: "border-emerald-500/40",
  info: "border-blue-500/40",
};

const variantTitle: Record<ModalVariant, string> = {
  error: "text-red-400",
  success: "text-emerald-400",
  info: "text-blue-400",
};

export function ModalProvider({ children }: { children: ReactNode }) {
  const { common: commonMessages, modal: modalMessages } = useAppMessages();
  const [modal, setModal] = useState<ActiveModal | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const close = useCallback((result: boolean) => {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setModal(null);
  }, []);

  useEffect(() => {
    if (!modal) return;
    const mode = modal.mode;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close(mode === "confirm" ? false : true);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modal, close]);

  const alert = useCallback(
    (message: string, options?: ModalOptions) =>
      new Promise<void>((resolve) => {
        resolveRef.current = () => resolve();
        setModal({
          mode: "alert",
          message,
          title: options?.title,
          variant: options?.variant ?? "info",
          confirmLabel: options?.confirmLabel,
        });
      }),
    []
  );

  const confirm = useCallback(
    (message: string, options?: ModalOptions) =>
      new Promise<boolean>((resolve) => {
        resolveRef.current = resolve;
        setModal({
          mode: "confirm",
          message,
          title: options?.title,
          variant: options?.variant ?? "info",
          confirmLabel: options?.confirmLabel,
          cancelLabel: options?.cancelLabel,
          destructive: options?.destructive,
        });
      }),
    []
  );

  const defaultTitle =
    modal?.variant === "error"
      ? modalMessages.errorTitle
      : modal?.variant === "success"
        ? modalMessages.successTitle
        : modalMessages.infoTitle;

  return (
    <ModalContext.Provider value={{ alert, confirm }}>
      {children}

      {modal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="presentation"
        >
          <button
            type="button"
            aria-label={commonMessages.cancel}
            className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm"
            onClick={() => close(modal.mode === "confirm" ? false : true)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="app-modal-title"
            className={`relative z-10 w-full max-w-md rounded-xl border bg-slate-900 p-6 shadow-2xl ${variantBorder[modal.variant]}`}
          >
            <h2
              id="app-modal-title"
              className={`mb-3 text-lg font-semibold ${variantTitle[modal.variant]}`}
            >
              {modal.title ?? defaultTitle}
            </h2>
            <p className="text-sm leading-relaxed text-slate-300">{modal.message}</p>

            <div className="mt-6 flex justify-end gap-3">
              {modal.mode === "confirm" && (
                <button
                  type="button"
                  onClick={() => close(false)}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-slate-500 hover:text-white"
                >
                  {modal.cancelLabel ?? commonMessages.cancel}
                </button>
              )}
              <button
                type="button"
                autoFocus
                onClick={() => close(true)}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${
                  modal.destructive
                    ? "bg-red-600 hover:bg-red-500"
                    : "bg-blue-600 hover:bg-blue-500"
                }`}
              >
                {modal.confirmLabel ??
                  (modal.mode === "confirm"
                    ? modal.destructive
                      ? commonMessages.delete
                      : modalMessages.confirm
                    : modalMessages.ok)}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
}
