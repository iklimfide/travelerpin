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
  if (next.startsWith("/")) return next;
  return null;
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

  const [open, setOpen] = useState(false);
  const nextFromUrl = sanitizeNext(searchParams?.get("next") ?? null);
  const routeOpen = pathname === "/c/wishlist";

  useEffect(() => {
    setOpen(routeOpen);
  }, [routeOpen]);

  const close = useCallback(() => {
    setOpen(false);
    if (pathname !== "/c/wishlist") return;

    const target = nextFromUrl ?? "/";
    void Promise.resolve().then(() => {
      router.replace(target);
    });
  }, [router, pathname, nextFromUrl]);

  const openModal = useCallback(() => {
    setOpen(true);
  }, []);

  const ctxValue = useMemo(() => ({ open: openModal, close }), [openModal, close]);

  return (
    <WishlistDestinationContext.Provider value={ctxValue}>
      {children}
      {open ? <WishlistDestinationModal onClose={close} /> : null}
    </WishlistDestinationContext.Provider>
  );
}
