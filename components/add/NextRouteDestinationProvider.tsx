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
import { NextRouteDestinationModal } from "@/components/add/NextRouteDestinationModal";
import { stripLocalePrefix } from "@/lib/i18n/pathname";

const NEXT_ROUTE = "/c/next";
const MODAL_RETURN_BLOCKLIST = new Set([NEXT_ROUTE, "/c/wishlist", "/c/add"]);

type NextRouteDestinationContextValue = {
  open: () => void;
  close: () => void;
};

const NextRouteDestinationContext = createContext<NextRouteDestinationContextValue | null>(
  null
);

export function useNextRouteDestination(): NextRouteDestinationContextValue {
  const ctx = useContext(NextRouteDestinationContext);
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
  if (!next.startsWith("/")) return null;

  const bare = stripLocalePrefix(next.split("?")[0] || next);
  if (MODAL_RETURN_BLOCKLIST.has(bare)) return null;
  return stripLocalePrefix(next.split("?")[0] || next);
}

export function NextRouteDestinationProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={children}>
      <NextRouteDestinationProviderInner>{children}</NextRouteDestinationProviderInner>
    </Suspense>
  );
}

function NextRouteDestinationProviderInner({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [softOpen, setSoftOpen] = useState(false);
  const barePathname = stripLocalePrefix(pathname ?? "/");
  const nextFromUrl = sanitizeNext(searchParams?.get("next") ?? null);
  const routeOpen = barePathname === NEXT_ROUTE;
  const open = routeOpen || softOpen;

  useEffect(() => {
    if (routeOpen) setSoftOpen(false);
  }, [routeOpen]);

  const close = useCallback(() => {
    setSoftOpen(false);
    if (barePathname !== NEXT_ROUTE) return;

    const target = nextFromUrl ?? "/";
    void Promise.resolve().then(() => {
      router.replace(target);
    });
  }, [router, barePathname, nextFromUrl]);

  const openModal = useCallback(() => {
    setSoftOpen(true);
  }, []);

  const ctxValue = useMemo(() => ({ open: openModal, close }), [openModal, close]);

  return (
    <NextRouteDestinationContext.Provider value={ctxValue}>
      {children}
      {open ? <NextRouteDestinationModal onClose={close} /> : null}
    </NextRouteDestinationContext.Provider>
  );
}
