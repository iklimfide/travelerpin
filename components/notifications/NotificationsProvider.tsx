"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { NotificationsModal } from "@/components/notifications/NotificationsModal";
import { fetchNotifications } from "@/lib/client/notification-actions";
import { profilePath } from "@/lib/seo/site";
import type { EnrichedNotificationRow } from "@/types/database";

type NotificationsContextValue = {
  openNotifications: () => void;
  isOpen: boolean;
  triggerRef: RefObject<HTMLButtonElement | null>;
};

export const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function useNotifications(): NotificationsContextValue {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationsProvider");
  }
  return context;
}

type NotificationsProviderProps = {
  username: string;
  children: ReactNode;
};

export function NotificationsProvider({ username, children }: NotificationsProviderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const routeOpen = pathname === "/notifications" || pathname.startsWith("/notifications/");
  const [open, setOpen] = useState(routeOpen);
  const [prefetchedNotifications, setPrefetchedNotifications] = useState<
    EnrichedNotificationRow[] | null
  >(null);
  const [prefetchedUnreadCount, setPrefetchedUnreadCount] = useState(0);

  useEffect(() => {
    setOpen(routeOpen);
  }, [routeOpen]);

  useEffect(() => {
    let cancelled = false;

    void fetchNotifications().then((result) => {
      if (cancelled || !result.ok) return;
      setPrefetchedNotifications(result.notifications);
      setPrefetchedUnreadCount(result.unreadCount);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Cached list renders instantly on open; fetch fresh data in the background
  // so new activity (follows, pins) shows up without a reload.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    void fetchNotifications(40, { force: true }).then((result) => {
      if (cancelled || !result.ok) return;
      setPrefetchedNotifications(result.notifications);
      setPrefetchedUnreadCount(result.unreadCount);
    });

    return () => {
      cancelled = true;
    };
  }, [open]);

  const close = useCallback(() => {
    setOpen(false);
    if (routeOpen) {
      if (typeof window !== "undefined" && window.history.length > 1) {
        router.back();
        return;
      }
      router.replace(profilePath(username));
    }
  }, [routeOpen, router, username]);

  const openNotifications = useCallback(() => {
    setOpen(true);
  }, []);

  return (
    <NotificationsContext.Provider value={{ openNotifications, isOpen: open, triggerRef }}>
      {children}
      <NotificationsModal
        open={open}
        onClose={close}
        initialNotifications={prefetchedNotifications ?? undefined}
        initialUnreadCount={prefetchedUnreadCount}
      />
    </NotificationsContext.Provider>
  );
}
