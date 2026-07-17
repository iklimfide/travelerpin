import { commonMessages } from "@/lib/i18n/message-catalog";

export function formatPhotoUploadError(message: string | undefined | null): string {
  const raw = (message ?? "").trim();
  const lower = raw.toLowerCase();

  if (!raw) {
    return commonMessages.photoUploadFailed;
  }

  if (lower.includes("bucket not found") || lower.includes("r2 not configured")) {
    return commonMessages.photoUploadNotConfigured;
  }

  if (lower.includes("row-level security") || lower.includes("rls")) {
    return commonMessages.photoUploadRlsDenied;
  }

  return raw;
}
