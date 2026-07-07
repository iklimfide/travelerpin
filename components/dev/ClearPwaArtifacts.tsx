"use client";

import { useEffect } from "react";

/** Drops stale service workers and caches that can break Turbopack chunk loading in dev. */
export function ClearPwaArtifacts() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    void (async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));

      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
    })();
  }, []);

  return null;
}
