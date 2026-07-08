"use client";

import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthForm } from "@/components/auth/AuthForm";

type AuthModalMode = "login" | "register";

type OpenAuthModalOptions = {
  mode: AuthModalMode;
  next?: string | null;
};

type AuthModalContextValue = {
  open: (options: OpenAuthModalOptions) => void;
  close: () => void;
};

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function useAuthModal(): AuthModalContextValue {
  const ctx = useContext(AuthModalContext);
  if (!ctx) {
    return {
      open: () => {},
      close: () => {},
    };
  }
  return ctx;
}

function sanitizeNext(next: string | null | undefined): string | null {
  if (!next) return null;
  // Only allow internal navigations.
  if (next.startsWith("/")) return next;
  return null;
}

/** Renders children immediately; search-param logic suspends separately for static prerender. */
export function AuthModalProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={children}>
      <AuthModalProviderInner>{children}</AuthModalProviderInner>
    </Suspense>
  );
}

function AuthModalProviderInner({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [openState, setOpenState] = useState<OpenAuthModalOptions | null>(null);

  const nextFromUrl = sanitizeNext(searchParams?.get("next") ?? null);

  const routeMode: AuthModalMode | null =
    pathname === "/login" ? "login" : pathname === "/register" ? "register" : null;

  useEffect(() => {
    if (!routeMode) return;
    setOpenState({ mode: routeMode, next: nextFromUrl });
  }, [routeMode, nextFromUrl]);

  const open = useCallback((options: OpenAuthModalOptions) => {
    setOpenState({ mode: options.mode, next: sanitizeNext(options.next ?? null) });
  }, []);

  const close = useCallback(() => {
    setOpenState(null);

    // If user is on /login or /register, return somewhere sane.
    if (routeMode) {
      const fallback = nextFromUrl ?? "/";
      router.replace(fallback);
    }
  }, [router, routeMode, nextFromUrl]);

  const ctxValue = useMemo(() => ({ open, close }), [open, close]);

  const active = openState;
  const isLogin = active?.mode === "login";

  return (
    <AuthModalContext.Provider value={ctxValue}>
      {children}

      {active && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" role="presentation">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px]"
            onClick={close}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-modal-title"
            className="relative z-10 max-h-[min(90vh,720px)] w-full max-w-md overflow-hidden overflow-y-auto rounded-2xl border border-slate-200/90 bg-slate-100 shadow-[0_24px_56px_rgba(15,23,42,0.14)]"
          >
            <div className="auth-modal-header on-dark-surface flex items-center justify-between px-6 py-4">
              <h2 id="auth-modal-title" className="auth-modal-title text-lg font-bold tracking-tight">
                TravelerPin.com
              </h2>
              <button
                type="button"
                onClick={close}
                className="auth-modal-close rounded-lg px-2.5 py-1.5 text-lg leading-none transition hover:bg-white/15"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              <div className="flex gap-1 rounded-xl bg-slate-200/70 p-1">
                <button
                  type="button"
                  onClick={() => setOpenState({ mode: "login", next: active.next })}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    isLogin
                      ? "bg-wbs-blue text-white shadow-sm on-dark-surface"
                      : "text-slate-600 hover:text-slate-800"
                  }`}
                >
                  Log in
                </button>
                <button
                  type="button"
                  onClick={() => setOpenState({ mode: "register", next: active.next })}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    !isLogin
                      ? "bg-wbs-blue text-white shadow-sm on-dark-surface"
                      : "text-slate-600 hover:text-slate-800"
                  }`}
                >
                  Sign up
                </button>
              </div>

              <div className="mt-5">
                <AuthForm
                  mode={active.mode}
                  next={active.next ?? undefined}
                  onRegisteredPendingConfirmation={close}
                />
              </div>

              <p className="mt-5 text-center text-xs text-slate-500">
                {isLogin ? (
                  <>
                    Don&apos;t have an account?{" "}
                    <button
                      type="button"
                      className="font-semibold text-wbs-blue hover:text-wbs-blue-hover"
                      onClick={() => setOpenState({ mode: "register", next: active.next })}
                    >
                      Sign up
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <button
                      type="button"
                      className="font-semibold text-wbs-blue hover:text-wbs-blue-hover"
                      onClick={() => setOpenState({ mode: "login", next: active.next })}
                    >
                      Log in
                    </button>
                  </>
                )}
                {routeMode ? (
                  <>
                    {" "}
                    ·{" "}
                    <Link href={active.next ?? "/"} className="text-slate-500 hover:text-slate-700">
                      Back
                    </Link>
                  </>
                ) : null}
              </p>
            </div>
          </div>
        </div>
      )}
    </AuthModalContext.Provider>
  );
}

