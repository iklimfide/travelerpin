"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useAuthModal } from "@/components/auth/AuthModalProvider";
import { DEMO_PERSONA } from "@/lib/data/demo-persona";
import { Link } from "@/lib/i18n/navigation";
import { useTranslateHome } from "@/lib/i18n/client-messages";
import { profilePath } from "@/lib/seo/site";

const SESSION_KEY = "tp:home-guest-nudge:v1";
const DELAY_MS = 7_000;
const SCROLL_PX = 240;
const nudgeActionClassName =
  "inline-flex w-full items-center justify-center rounded-full border border-[#d8e1ef] bg-white px-[22px] py-[13px] text-[15px] font-extrabold text-[#2563eb] transition hover:border-[#2563eb] hover:bg-[#2563eb] hover:!text-white hover:shadow-[0_12px_26px_rgba(37,99,235,0.28)]";

function wasDismissed(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function markDismissed(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    // Private mode / quota — skip.
  }
}

function anotherDialogOpen(): boolean {
  return Boolean(document.querySelector('[role="dialog"]'));
}

export function HomeGuestNudgeModal() {
  const t = useTranslateHome();
  const authModal = useAuthModal();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const shownRef = useRef(false);

  const close = useCallback(() => {
    markDismissed();
    setOpen(false);
  }, []);

  useEffect(() => {
    if (wasDismissed()) return;

    const show = () => {
      if (shownRef.current || wasDismissed()) return;
      if (anotherDialogOpen()) return;
      shownRef.current = true;
      markDismissed();
      setOpen(true);
    };

    const onScroll = () => {
      if (window.scrollY >= SCROLL_PX || document.documentElement.scrollTop >= SCROLL_PX) {
        show();
      }
    };

    const timeoutId = window.setTimeout(show, DELAY_MS);
    const pollId = window.setInterval(() => {
      if (shownRef.current || wasDismissed()) {
        window.clearInterval(pollId);
        return;
      }
      if (window.scrollY >= SCROLL_PX || document.documentElement.scrollTop >= SCROLL_PX) {
        show();
      }
    }, 1_000);

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(pollId);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  if (!open) return null;

  const name = DEMO_PERSONA.name;
  const sampleHref = profilePath(DEMO_PERSONA.username);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        aria-label={t("nudgeClose")}
        className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px]"
        onClick={close}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200/90 bg-white p-6 shadow-[0_24px_56px_rgba(15,23,42,0.14)]"
      >
        <div className="relative mb-4">
          <h2
            id={titleId}
            className="m-0 px-8 text-center text-lg font-bold tracking-tight text-[#071126]"
          >
            {t("nudgeTitle")}
          </h2>
          <button
            type="button"
            onClick={close}
            className="absolute top-0 right-0 rounded-lg px-2.5 py-1.5 text-lg leading-none text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            aria-label={t("nudgeClose")}
          >
            ✕
          </button>
        </div>
        <p className="m-0 mb-5 text-center text-[15px] leading-relaxed text-[#64748b]">
          {t("nudgeBody", { name })}
        </p>
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            className={nudgeActionClassName}
            onClick={() => {
              close();
              authModal.open({ mode: "register" });
            }}
          >
            {t("nudgeRegister")}
          </button>
          <Link href={sampleHref} className={nudgeActionClassName} onClick={close}>
            {t("nudgeExplore", { name })}
          </Link>
          <button type="button" className={nudgeActionClassName} onClick={close}>
            {t("nudgeClose")}
          </button>
        </div>
      </div>
    </div>
  );
}