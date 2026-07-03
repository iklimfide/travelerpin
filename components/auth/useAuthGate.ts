"use client";

import { usePathname } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuthModal } from "@/components/auth/AuthModalProvider";

const REQUIRE_LOGIN_TOAST = "Please sign in to continue.";

function currentPath(pathname: string | null): string {
  const path = pathname ?? "/";
  if (typeof window === "undefined") return path;
  const qs = window.location.search;
  return qs ? `${path}${qs}` : path;
}

export function useAuthGate() {
  const toast = useToast();
  const authModal = useAuthModal();
  const pathname = usePathname();

  function requireLogin(): false {
    toast.show(REQUIRE_LOGIN_TOAST);
    authModal.open({ mode: "login", next: currentPath(pathname) });
    return false;
  }

  return { requireLogin, next: currentPath(pathname) };
}
