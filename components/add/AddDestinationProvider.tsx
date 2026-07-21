"use client";

import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AddDestinationModal,
  type AddDestinationMode,
} from "@/components/add/AddDestinationModal";
import { stripLocalePrefix } from "@/lib/i18n/pathname";

const ADD_ROUTE = "/c/add";
const MODAL_RETURN_BLOCKLIST = new Set([ADD_ROUTE, "/c/wishlist", "/c/next"]);

type AddDestinationContextValue = {
  open: (mode?: AddDestinationMode) => void;
  close: () => void;
  isOpen: boolean;
};

const AddDestinationContext = createContext<AddDestinationContextValue | null>(null);

export function useAddDestination(): AddDestinationContextValue {
  const ctx = useContext(AddDestinationContext);
  if (!ctx) {
    return {
      open: () => {},
      close: () => {},
      isOpen: false,
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

export function AddDestinationProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={children}>
      <AddDestinationProviderInner>{children}</AddDestinationProviderInner>
    </Suspense>
  );
}

function AddDestinationProviderInner({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AddDestinationMode>("places");
  const barePathname = stripLocalePrefix(pathname ?? "/");
  const nextFromUrl = sanitizeNext(searchParams?.get("next") ?? null);
  const routeOpen = barePathname === ADD_ROUTE;
  const wasRouteOpen = useRef(false);

  // Deep link: open when URL is /c/add; close only when leaving that route.
  // Soft-open via open() does not touch the URL and is not cleared by this sync.
  useEffect(() => {
    if (routeOpen) {
      wasRouteOpen.current = true;
      setMode("places");
      setOpen(true);
      return;
    }
    if (wasRouteOpen.current) {
      wasRouteOpen.current = false;
      setOpen(false);
    }
  }, [routeOpen]);

  const close = useCallback(() => {
    setOpen(false);
    if (barePathname !== ADD_ROUTE) return;

    const target = nextFromUrl ?? "/";
    void Promise.resolve().then(() => {
      router.replace(target);
    });
  }, [router, barePathname, nextFromUrl]);

  const openModal = useCallback((nextMode: AddDestinationMode = "places") => {
    setMode(nextMode);
    setOpen(true);
  }, []);

  const ctxValue = useMemo(
    () => ({ open: openModal, close, isOpen: open }),
    [openModal, close, open]
  );

  return (
    <AddDestinationContext.Provider value={ctxValue}>
      {children}
      {open ? <AddDestinationModal mode={mode} onClose={close} /> : null}
    </AddDestinationContext.Provider>
  );
}
