"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuthModal } from "@/components/auth/AuthModalProvider";

type Props = {
  mode: "login" | "register";
};

function AuthModalRouteInner({ mode }: Props) {
  const authModal = useAuthModal();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Keep modal open while user is on these routes.
    if (pathname !== "/login" && pathname !== "/register") return;
    const next = searchParams?.get("next") ?? undefined;
    authModal.open({ mode, next });
  }, [authModal, mode, pathname, searchParams]);

  return null;
}

export function AuthModalRoute({ mode }: Props) {
  return (
    <Suspense fallback={null}>
      <AuthModalRouteInner mode={mode} />
    </Suspense>
  );
}
