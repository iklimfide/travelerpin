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
import { AddDestinationModal } from "@/components/add/AddDestinationModal";

type AddDestinationContextValue = {
  open: () => void;
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
  if (next.startsWith("/")) return next;
  return null;
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
  const nextFromUrl = sanitizeNext(searchParams?.get("next") ?? null);
  const routeOpen = pathname === "/c/add";
  const wasRouteOpen = useRef(false);

  // Deep link: open when URL is /c/add; close only when leaving that route.
  // Soft-open via open() does not touch the URL and is not cleared by this sync.
  useEffect(() => {
    if (routeOpen) {
      wasRouteOpen.current = true;
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
    if (pathname !== "/c/add") return;

    const target = nextFromUrl ?? "/";
    void Promise.resolve().then(() => {
      router.replace(target);
    });
  }, [router, pathname, nextFromUrl]);

  const openModal = useCallback(() => {
    setOpen(true);
  }, []);

  const ctxValue = useMemo(
    () => ({ open: openModal, close, isOpen: open }),
    [openModal, close, open]
  );

  return (
    <AddDestinationContext.Provider value={ctxValue}>
      {children}
      {open ? <AddDestinationModal onClose={close} /> : null}
    </AddDestinationContext.Provider>
  );
}
