/** @guvencgiller — travel pin source for Jennifer demo (not public homepage embed). */
export const SHOWCASE_PROFILE_USERNAME = "guvencgiller";

export const DEMO_PROFILE_USERNAME = "jennifer";

export function isDemoProfileUsername(username: string): boolean {
  return username.trim().toLowerCase() === DEMO_PROFILE_USERNAME;
}

export function isShowcaseProfileUsername(username: string): boolean {
  return isDemoProfileUsername(username);
}
