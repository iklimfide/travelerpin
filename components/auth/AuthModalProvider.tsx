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

  return (
    <AuthModalContext.Provider value={ctxValue}>
      {children}

      {active && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" role="presentation">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm"
            onClick={close}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-modal-title"
            className="relative z-10 w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="auth-modal-title" className="text-lg font-semibold text-white">
                  {active.mode === "login" ? "Log in" : "Sign up"}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Continue to TravelerPin.
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:border-slate-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setOpenState({ mode: "login", next: active.next })}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${
                  active.mode === "login"
                    ? "bg-blue-600 text-white"
                    : "border border-slate-700 text-slate-200 hover:border-slate-500"
                }`}
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => setOpenState({ mode: "register", next: active.next })}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${
                  active.mode === "register"
                    ? "bg-blue-600 text-white"
                    : "border border-slate-700 text-slate-200 hover:border-slate-500"
                }`}
              >
                Sign up
              </button>
            </div>

            <div className="mt-5">
              <AuthForm mode={active.mode} next={active.next ?? undefined} />
            </div>

            <p className="mt-5 text-center text-xs text-slate-500">
              {active.mode === "login" ? (
                <>
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    className="font-semibold text-blue-300 hover:text-blue-200"
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
                    className="font-semibold text-blue-300 hover:text-blue-200"
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
                  <Link href={active.next ?? "/"} className="text-slate-400 hover:text-slate-200">
                    Back
                  </Link>
                </>
              ) : null}
            </p>
          </div>
        </div>
      )}
    </AuthModalContext.Provider>
  );
}

