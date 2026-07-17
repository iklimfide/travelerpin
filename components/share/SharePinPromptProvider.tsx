"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ShareTravelUpdateModal } from "@/components/share/ShareTravelUpdateModal";
import { useToast } from "@/components/ui/ToastProvider";
import {
  clearDelayedSharePrompt,
  fetchSharePromptEligibility,
  getDueDelayedSharePrompt,
  registerSharePinPromptHandler,
  scheduleDelayedSharePrompt,
  setSharePromptMode,
  type SharePinOffer,
  type SharePromptPayload,
} from "@/lib/client/share-pin-prompt";
import { formatMessage, shareMessages, useAppMessages } from "@/lib/i18n/client-messages";

function pinLabel(offer: SharePinOffer): string {
  switch (offer.kind) {
    case "country":
      return formatMessage(shareMessages.pinPromptCountry, { name: offer.name });
    case "city":
      return formatMessage(shareMessages.pinPromptCity, { name: offer.name });
    case "national_park":
      return formatMessage(shareMessages.pinPromptNationalPark, { name: offer.name });
    case "theme_park":
      return formatMessage(shareMessages.pinPromptThemePark, { name: offer.name });
    case "park":
      return formatMessage(shareMessages.pinPromptPark, { name: offer.name });
    case "places":
      return shareMessages.pinPromptPlaces;
  }
}

export function SharePinPromptProvider({ children }: { children: ReactNode }) {
  const { share: shareMessages } = useAppMessages();
  const toast = useToast();
  const [sharePayload, setSharePayload] = useState<SharePromptPayload | null>(null);
  const showingRef = useRef(false);

  const presentPrompt = useCallback(
    (offer: SharePinOffer, payload: SharePromptPayload) => {
      if (showingRef.current) return;

      showingRef.current = true;
      clearDelayedSharePrompt();

      toast.showAction({
        message: formatMessage(shareMessages.pinPromptMessage, {
          place: pinLabel(offer),
        }),
        actionLabel: shareMessages.pinPromptShareCard,
        dismissLabel: shareMessages.pinPromptNotNow,
        secondaryActionLabel: shareMessages.pinPromptNever,
        accent: "emerald",
        onAction: () => {
          showingRef.current = false;
          setSharePayload(payload);
        },
        onDismiss: () => {
          showingRef.current = false;
        },
        onSecondaryAction: async () => {
          showingRef.current = false;
          clearDelayedSharePrompt();
          await setSharePromptMode("never");
        },
      });
    },
    [toast]
  );

  useEffect(() => {
    let cancelled = false;
    let inFlight = false;

    async function handleOffer(offer: SharePinOffer) {
      if (cancelled || inFlight || showingRef.current) return;

      inFlight = true;
      try {
        const result = await fetchSharePromptEligibility();
        if (cancelled || !result.ok || result.mode === "never" || !result.shouldOffer) {
          return;
        }

        if (result.mode === "after_30m") {
          scheduleDelayedSharePrompt(offer);
          return;
        }

        presentPrompt(offer, result.payload);
      } finally {
        inFlight = false;
      }
    }

    async function checkDelayedPrompt() {
      if (cancelled || showingRef.current || inFlight) return;
      const offer = getDueDelayedSharePrompt();
      if (!offer) return;

      inFlight = true;
      try {
        const result = await fetchSharePromptEligibility();
        if (cancelled || !result.ok || result.mode !== "after_30m" || !result.shouldOffer) {
          if (result.ok && result.mode === "never") {
            clearDelayedSharePrompt();
          }
          return;
        }
        presentPrompt(offer, result.payload);
      } finally {
        inFlight = false;
      }
    }

    registerSharePinPromptHandler(handleOffer);
    void checkDelayedPrompt();

    const intervalId = window.setInterval(() => {
      void checkDelayedPrompt();
    }, 30_000);

    function onFocus() {
      void checkDelayedPrompt();
    }

    function onVisibility() {
      if (document.visibilityState === "visible") {
        void checkDelayedPrompt();
      }
    }

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      registerSharePinPromptHandler(null);
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [presentPrompt]);

  return (
    <>
      {children}
      {sharePayload ? (
        <ShareTravelUpdateModal
          open
          onClose={() => setSharePayload(null)}
          username={sharePayload.username}
          displayName={sharePayload.displayName}
          delta={sharePayload.delta}
        />
      ) : null}
    </>
  );
}
