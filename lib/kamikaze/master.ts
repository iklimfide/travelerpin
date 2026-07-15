/** Master account for /kamikaze YP panel (arifguvenc2005@gmail.com). */
export const KAMIKAZE_MASTER_USER_ID = "0774d168-c74e-463b-8fc6-12e5ba22cb30";
export const KAMIKAZE_MASTER_EMAIL = "arifguvenc2005@gmail.com";
export const KAMIKAZE_MASTER_USERNAME = "arif";

export function isKamikazeMasterUser(user: {
  id: string;
  email?: string | null;
}): boolean {
  if (user.id === KAMIKAZE_MASTER_USER_ID) return true;
  const email = user.email?.trim().toLowerCase();
  return email === KAMIKAZE_MASTER_EMAIL;
}

export function isKamikazeMasterProfile(profile: {
  id?: string | null;
  username?: string | null;
}): boolean {
  if (profile.id && profile.id === KAMIKAZE_MASTER_USER_ID) return true;
  return profile.username?.trim().toLowerCase() === KAMIKAZE_MASTER_USERNAME;
}
