import enMessages from "@/messages/en.json";

/** Static copy for client map components (English-only; avoids NextIntl provider edge cases). */
export const commonMessages = enMessages.common;
export const mapMessages = enMessages.map;
export const countryMessages = enMessages.country;
export const countryHubMessages = enMessages.countryHub;
export const cityMessages = enMessages.city;
export const wishlistMessages = enMessages.wishlist;
export const popupMessages = enMessages.popup;
export const homeMessages = enMessages.home;
export const shareMessages = enMessages.share;
export const destinationMessages = enMessages.destinations;
export const parkMessages = enMessages.park;
export const parkHubMessages = enMessages.parkHub;
export const profileMessages = enMessages.profile;
export const modalMessages = enMessages.modal;
export const authMessages = enMessages.auth;
export const settingsMessages = enMessages.settings;
export const badgeMessages = enMessages.badge;
export const dashboardNavMessages = enMessages.dashboardNav;
export const notificationMessages = enMessages.notifications;
export const saveDestinationMessages = enMessages.saveDestination;
export const nextRouteMessages = enMessages.nextRoute;

export function formatMessage(
  template: string,
  values: Record<string, string | number>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    key in values ? String(values[key]) : `{${key}}`
  );
}

type MessageNamespace = Record<string, unknown>;

export function createMessageTranslator<T extends MessageNamespace>(messages: T) {
  return function translate<K extends keyof T>(
    key: K,
    values?: Record<string, string | number>
  ): string {
    const value = messages[key];
    if (typeof value !== "string") return String(key);
    return values ? formatMessage(value, values) : value;
  };
}

export const translateCommon = createMessageTranslator(commonMessages);
export const translateCountry = createMessageTranslator(countryMessages);
export const translateCity = createMessageTranslator(cityMessages);
export const translatePark = createMessageTranslator(parkMessages);
export const translateWishlist = createMessageTranslator(wishlistMessages);
export const translateAuth = createMessageTranslator(authMessages);
export const translateSettings = createMessageTranslator(settingsMessages);
export const translateProfile = createMessageTranslator(profileMessages);
export const translateHome = createMessageTranslator(homeMessages);
export const translateBadge = createMessageTranslator(badgeMessages);

export function profileVisitCountLabel(count: number): string {
  return count === 1 ? "1 visit" : `${count} visits`;
}

export function profileDestinationCityCountLabel(count: number): string {
  return count === 1 ? "1 city" : `${count} cities`;
}

export function profileDestinationParkCountLabel(count: number): string {
  return count === 1 ? "1 park" : `${count} parks`;
}
