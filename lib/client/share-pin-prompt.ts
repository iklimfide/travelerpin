import type { TravelUpdateDelta } from "@/lib/utils/travel-update";
import type { SharePromptMode } from "@/types/database";

export type SharePinKind =
  | "country"
  | "city"
  | "national_park"
  | "theme_park"
  | "park"
  | "places";

export type SharePinOffer = {
  kind: SharePinKind;
  name: string;
};

export type SharePromptPayload = {
  username: string;
  displayName: string;
  delta: TravelUpdateDelta;
};

export type SharePromptEligibility =
  | { ok: true; mode: "never"; shouldOffer: false }
  | { ok: true; mode: "every_pin" | "after_30m"; shouldOffer: false }
  | {
      ok: true;
      mode: "every_pin" | "after_30m";
      shouldOffer: true;
      payload: SharePromptPayload;
    }
  | { ok: false };

type SharePinPromptHandler = (offer: SharePinOffer) => void;

type DelayedSharePrompt = {
  dueAt: number;
  offer: SharePinOffer;
};

export const SHARE_PROMPT_DELAY_MS = 30 * 60 * 1000;

const DELAYED_KEY = "tp.sharePrompt.delayed";

let handler: SharePinPromptHandler | null = null;

export function registerSharePinPromptHandler(next: SharePinPromptHandler | null): void {
  handler = next;
}

export function offerShareAfterPin(offer: SharePinOffer): void {
  handler?.(offer);
}

export function scheduleDelayedSharePrompt(offer: SharePinOffer, delayMs = SHARE_PROMPT_DELAY_MS): void {
  const pending: DelayedSharePrompt = {
    dueAt: Date.now() + delayMs,
    offer,
  };
  try {
    localStorage.setItem(DELAYED_KEY, JSON.stringify(pending));
  } catch {
    // ignore
  }
}

export function getDueDelayedSharePrompt(): SharePinOffer | null {
  try {
    const raw = localStorage.getItem(DELAYED_KEY);
    if (!raw) return null;
    const pending = JSON.parse(raw) as DelayedSharePrompt;
    if (!pending?.dueAt || !pending.offer?.kind || !pending.offer?.name) {
      localStorage.removeItem(DELAYED_KEY);
      return null;
    }
    if (Date.now() < pending.dueAt) return null;
    return pending.offer;
  } catch {
    return null;
  }
}

export function clearDelayedSharePrompt(): void {
  try {
    localStorage.removeItem(DELAYED_KEY);
  } catch {
    // ignore
  }
}

/** True when a delayed post-pin share prompt is stored (due or not yet). */
export function hasScheduledDelayedSharePrompt(): boolean {
  try {
    return Boolean(localStorage.getItem(DELAYED_KEY));
  } catch {
    return false;
  }
}

export function clearSharePromptThrottle(): void {
  clearDelayedSharePrompt();
}

function parseMode(value: unknown): SharePromptMode {
  if (value === "every_pin" || value === "after_30m" || value === "never") {
    return value;
  }
  return "every_pin";
}

export async function fetchSharePromptEligibility(): Promise<SharePromptEligibility> {
  try {
    const response = await fetch("/api/me/share-prompt", { method: "GET" });
    if (!response.ok) return { ok: false };

    const data = (await response.json()) as {
      mode?: SharePromptMode;
      shouldOffer?: boolean;
      username?: string;
      displayName?: string;
      delta?: TravelUpdateDelta | null;
    };

    const mode = parseMode(data.mode);
    if (mode === "never") {
      return { ok: true, mode: "never", shouldOffer: false };
    }

    if (!data.shouldOffer || !data.username || !data.displayName || !data.delta) {
      return { ok: true, mode, shouldOffer: false };
    }

    return {
      ok: true,
      mode,
      shouldOffer: true,
      payload: {
        username: data.username,
        displayName: data.displayName,
        delta: data.delta,
      },
    };
  } catch {
    return { ok: false };
  }
}

export async function setSharePromptMode(mode: SharePromptMode): Promise<boolean> {
  try {
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ share_prompt_mode: mode }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
