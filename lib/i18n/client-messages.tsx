"use client";

import { useMemo } from "react";
import { useLocale } from "next-intl";
import {
  createMessageTranslator,
  formatMessage,
  type AppMessages,
} from "@/lib/i18n/message-catalog";
import { useAppMessagesContext } from "@/lib/i18n/ClientMessagesProvider";

export type { AppMessages };
export { formatMessage, createMessageTranslator };

/** Re-export static EN catalog for gradual migration / non-hook call sites. */
export {
  commonMessages,
  mapMessages,
  countryMessages,
  countryHubMessages,
  cityMessages,
  wishlistMessages,
  popupMessages,
  homeMessages,
  shareMessages,
  destinationMessages,
  parkMessages,
  parkHubMessages,
  profileMessages,
  modalMessages,
  authMessages,
  settingsMessages,
  badgeMessages,
  dashboardNavMessages,
  notificationMessages,
  saveDestinationMessages,
  nextRouteMessages,
  nextRouteDestinationMessages,
  addDestinationMessages,
  wishlistDestinationMessages,
  footerMessages,
  translateCommon,
  translateCountry,
  translateCity,
  translatePark,
  translateWishlist,
  translateAuth,
  translateSettings,
  translateProfile,
  translateHome,
  translateBadge,
  profileVisitCountLabel,
  profileDestinationCityCountLabel,
  profileDestinationParkCountLabel,
} from "@/lib/i18n/message-catalog";

export function useAppMessages(): AppMessages {
  return useAppMessagesContext();
}

function useNsTranslator<NS extends keyof AppMessages>(namespace: NS) {
  const messages = useAppMessages();
  const slice = messages[namespace];
  return useMemo(
    () =>
      createMessageTranslator(
        slice as Extract<AppMessages[NS], Record<string, unknown>>
      ),
    [slice]
  );
}

export function useTranslateCommon() {
  return useNsTranslator("common");
}
export function useTranslateCountry() {
  return useNsTranslator("country");
}
export function useTranslateCity() {
  return useNsTranslator("city");
}
export function useTranslatePark() {
  return useNsTranslator("park");
}
export function useTranslateWishlist() {
  return useNsTranslator("wishlist");
}
export function useTranslateAuth() {
  return useNsTranslator("auth");
}
export function useTranslateSettings() {
  return useNsTranslator("settings");
}
export function useTranslateProfile() {
  return useNsTranslator("profile");
}
export function useTranslateHome() {
  return useNsTranslator("home");
}
export function useTranslateBadge() {
  return useNsTranslator("badge");
}

export function useProfileVisitCountLabel() {
  const city = useAppMessages().city;
  return (count: number) =>
    count === 1
      ? city.visitCountOne
      : formatMessage(city.visitCount, { count });
}

export function useProfileDestinationCityCountLabel() {
  const locale = useLocale();
  return (count: number) => {
    if (locale === "tr") {
      return count === 1 ? "1 şehir" : `${count} şehir`;
    }
    return count === 1 ? "1 city" : `${count} cities`;
  };
}

export function useProfileDestinationParkCountLabel() {
  const locale = useLocale();
  return (count: number) => {
    if (locale === "tr") {
      return count === 1 ? "1 park" : `${count} park`;
    }
    return count === 1 ? "1 park" : `${count} parks`;
  };
}
