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
import { WishlistDestinationModal } from "@/components/add/WishlistDestinationModal";
import { stripLocalePrefix } from "@/lib/i18n/pathname";

const WISHLIST_ROUTE = "/c/wishlist";
const MODAL_RETURN_BLOCKLIST = new Set([WISHLIST_ROUTE, "/c/next", "/c/add"]);

type WishlistDestinationContextValue = {
  open: () => void;
  close: () => void;
};

const WishlistDestinationContext = createContext<WishlistDestinationContextValue | null>(
  null
);

export function useWishlistDestination(): WishlistDestinationContextValue {
  const ctx = useContext(WishlistDestinationContext);
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

export function WishlistDestinationProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={children}>
      <WishlistDestinationProviderInner>{children}</WishlistDestinationProviderInner>
    </Suspense>
  );
}

function WishlistDestinationProviderInner({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [softOpen, setSoftOpen] = useState(false);
  const barePathname = stripLocalePrefix(pathname ?? "/");
  const nextFromUrl = sanitizeNext(searchParams?.get("next") ?? null);
  const routeOpen = barePathname === WISHLIST_ROUTE;
  const open = routeOpen || softOpen;

  useEffect(() => {
    if (routeOpen) setSoftOpen(false);
  }, [routeOpen]);

  const close = useCallback(() => {
    setSoftOpen(false);
    if (barePathname !== WISHLIST_ROUTE) return;

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
    <WishlistDestinationContext.Provider value={ctxValue}>
      {children}
      {open ? <WishlistDestinationModal onClose={close} /> : null}
    </WishlistDestinationContext.Provider>
  );
}
