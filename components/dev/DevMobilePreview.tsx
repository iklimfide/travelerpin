"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const STORAGE_KEY = "tp-dev-mobile-preview";
const EMBED_PARAM = "__mobile_preview";

const DEVICES = [
  { id: "iphone-se", label: "iPhone SE", width: 375 },
  { id: "iphone-14", label: "iPhone 14", width: 390 },
  { id: "iphone-14-pro-max", label: "iPhone 14 Pro Max", width: 430 },
] as const;

type DeviceId = (typeof DEVICES)[number]["id"];

function readStoredState(): { open: boolean; deviceId: DeviceId } {
  if (typeof window === "undefined") {
    return { open: false, deviceId: "iphone-14" };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { open: false, deviceId: "iphone-14" };

    const parsed = JSON.parse(raw) as { open?: boolean; deviceId?: string };
    return {
      open: Boolean(parsed.open),
      deviceId: DEVICES.some((d) => d.id === parsed.deviceId)
        ? (parsed.deviceId as DeviceId)
        : "iphone-14",
    };
  } catch {
    return { open: false, deviceId: "iphone-14" };
  }
}

export function DevMobilePreview() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [deviceId, setDeviceId] = useState<DeviceId>("iphone-14");

  const isEmbed = searchParams.get(EMBED_PARAM) === "1";

  useEffect(() => {
    if (isEmbed) return;
    document.documentElement.classList.remove("tp-dev-mobile-preview-parent");
  }, [isEmbed]);

  useEffect(() => {
    const stored = readStoredState();
    setOpen(stored.open);
    setDeviceId(stored.deviceId);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ open, deviceId }));
  }, [open, deviceId, ready]);

  const device = useMemo(
    () => DEVICES.find((d) => d.id === deviceId) ?? DEVICES[1],
    [deviceId]
  );

  const iframeSrc = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    // Auth codes must only be exchanged once on the parent window, not in the iframe.
    params.delete("code");
    params.delete("next");
    params.set(EMBED_PARAM, "1");
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : `${pathname}?${EMBED_PARAM}=1`;
  }, [pathname, searchParams]);

  const toggle = useCallback(() => setOpen((value) => !value), []);

  if (process.env.NODE_ENV !== "development" || isEmbed) {
    return null;
  }

  return (
    <>
      {!open ? (
        <button
          type="button"
          onClick={toggle}
          className="fixed left-4 top-4 z-[10000] flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg ring-1 ring-white/10 transition hover:bg-slate-800"
          aria-expanded={open}
          aria-controls="tp-dev-mobile-preview-panel"
          title="Toggle mobile design preview"
        >
          <span aria-hidden>📱</span>
          Mobile preview
        </button>
      ) : null}

      {open ? (
        <aside
          id="tp-dev-mobile-preview-panel"
          className="fixed bottom-4 right-4 top-4 z-[9999] flex w-[min(100vw-2rem,28rem)] flex-col rounded-[2rem] border border-slate-300 bg-slate-100 p-3 shadow-2xl"
          aria-label="Mobile design preview"
        >
          <div className="mb-3 flex items-center justify-between gap-2 px-1">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Dev only</p>
              <p className="text-sm font-semibold text-slate-800">Mobile preview</p>
            </div>
            <button
              type="button"
              onClick={toggle}
              className="rounded-lg px-2 py-1 text-sm font-medium text-slate-600 hover:bg-white"
              aria-label="Close mobile preview"
            >
              ✕
            </button>
          </div>

          <label className="mb-3 px-1 text-xs font-medium text-slate-600">
            Device
            <select
              value={deviceId}
              onChange={(event) => setDeviceId(event.target.value as DeviceId)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
            >
              {DEVICES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label} ({item.width}px)
                </option>
              ))}
            </select>
          </label>

          <div className="flex min-h-0 flex-1 items-stretch justify-center overflow-hidden rounded-[1.5rem] border border-slate-300 bg-white p-2">
            <div
              className="h-full min-h-0 overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white shadow-inner"
              style={{ width: device.width, maxWidth: "100%" }}
            >
              <iframe
                key={`${iframeSrc}-${device.width}`}
                title={`Mobile preview - ${device.label}`}
                src={iframeSrc}
                className="block h-full w-full border-0 bg-white"
                style={{ width: device.width, maxWidth: "100%" }}
              />
            </div>
          </div>

          <p className="mt-3 px-1 text-center text-[11px] leading-snug text-slate-500">
            Uses an iframe for real mobile breakpoints. Preview stays in sync as you navigate.
          </p>
        </aside>
      ) : null}
    </>
  );
}
