const previewUrlByFile = new WeakMap<File, string>();

export function pinPhotoPreviewObjectUrl(file: File): string {
  const existing = previewUrlByFile.get(file);
  if (existing) return existing;
  const url = URL.createObjectURL(file);
  previewUrlByFile.set(file, url);
  return url;
}

export function revokePinPhotoPreviewObjectUrl(file: File): void {
  const url = previewUrlByFile.get(file);
  if (!url) return;
  URL.revokeObjectURL(url);
  previewUrlByFile.delete(file);
}

export function revokeAllPinPhotoPreviewObjectUrls(files: File[]): void {
  for (const file of files) revokePinPhotoPreviewObjectUrl(file);
}
