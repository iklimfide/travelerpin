"use client";

import { useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuthModal } from "@/components/auth/AuthModalProvider";

const REQUIRE_LOGIN_TOAST = "Please sign in to continue.";

function currentPath(pathname: string | null, searchParams: ReturnType<typeof useSearchParams>) {
  const path = pathname ?? "/";
  const qs = searchParams?.toString() ?? "";
  return qs ? `${path}?${qs}` : path;
}

export function useAuthGate() {
  const toast = useToast();
  const authModal = useAuthModal();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const next = useMemo(() => currentPath(pathname, searchParams), [pathname, searchParams]);

  function requireLogin(): false {
    toast.show(REQUIRE_LOGIN_TOAST);
    authModal.open({ mode: "login", next });
    return false;
  }

  return { requireLogin, next };
}

