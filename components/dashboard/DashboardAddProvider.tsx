"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { NextRouteModal } from "@/components/dashboard/NextRouteModal";
import { SaveDestinationModal, type SaveDestinationInitialTab } from "@/components/dashboard/SaveDestinationModal";

type DashboardAddContextValue = {
  openAddModal: (tab?: SaveDestinationInitialTab) => void;
  closeAddModal: () => void;
  openNextRouteModal: () => void;
  closeNextRouteModal: () => void;
};

const DashboardAddContext = createContext<DashboardAddContextValue | null>(null);

export function useDashboardAdd(): DashboardAddContextValue {
  const ctx = useContext(DashboardAddContext);
  if (!ctx) {
    throw new Error("useDashboardAdd must be used within DashboardAddProvider");
  }
  return ctx;
}

export type { SaveDestinationInitialTab } from "@/components/dashboard/SaveDestinationModal";

export function DashboardAddProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [initialTab, setInitialTab] = useState<SaveDestinationInitialTab>("popular");
  const [nextRouteOpen, setNextRouteOpen] = useState(false);

  const openAddModal = useCallback((tab?: SaveDestinationInitialTab) => {
    if (tab) setInitialTab(tab);
    setOpen(true);
  }, []);

  const closeAddModal = useCallback(() => setOpen(false), []);
  const openNextRouteModal = useCallback(() => setNextRouteOpen(true), []);
  const closeNextRouteModal = useCallback(() => setNextRouteOpen(false), []);

  const value = useMemo(
    () => ({ openAddModal, closeAddModal, openNextRouteModal, closeNextRouteModal }),
    [openAddModal, closeAddModal, openNextRouteModal, closeNextRouteModal]
  );

  return (
    <DashboardAddContext.Provider value={value}>
      {children}
      <SaveDestinationModal open={open} initialTab={initialTab} onClose={closeAddModal} />
      <NextRouteModal open={nextRouteOpen} onClose={closeNextRouteModal} />
    </DashboardAddContext.Provider>
  );
}
