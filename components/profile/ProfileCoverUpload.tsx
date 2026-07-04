"use client";

import { useRef } from "react";
import Image from "next/image";
import { LIMITS } from "@/lib/constants";

export function ProfileCoverUpload({
  coverUrl,
  onChange,
  onError,
  disabled,
  labels,
  compact = false,
}: {
  coverUrl: string | null;
  onChange: (url: string | null) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
  compact?: boolean;
  labels: {
    changePhoto: string;
    removePhoto: string;
    hint?: string;
  };
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      onError?.("File must be an image");
      return;
    }
    if (file.size > LIMITS.coverMaxBytes) {
      onError?.("Image must be 5 MB or smaller");
      return;
    }

    const formData = new FormData();
    formData.set("file", file);

    let res: Response;
    try {
      res = await fetch("/api/profile/cover", {
        method: "POST",
        body: formData,
      });
    } catch {
      throw new Error("Could not upload cover photo. Check your connection and try again.");
    }

    const data = (await res.json().catch(() => null)) as { error?: string; url?: string } | null;
    if (!res.ok) {
      throw new Error(data?.error ?? "Could not upload cover photo");
    }
    if (!data?.url) {
      throw new Error("Could not upload cover photo");
    }

    onChange(data.url);
  }

  async function handleRemove() {
    let res: Response;
    try {
      res = await fetch("/api/profile/cover", { method: "DELETE" });
    } catch {
      throw new Error("Could not remove cover photo. Check your connection and try again.");
    }

    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) {
      throw new Error(data?.error ?? "Could not remove cover photo");
    }
    onChange(null);
  }

  const controls = (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          handleFile(file).catch((err) => {
            onError?.(err instanceof Error ? err.message : "Could not upload cover photo");
          });
        }}
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
          className={
            compact
              ? "rounded-md border border-slate-600 px-2.5 py-1 text-xs font-medium text-white hover:border-slate-500 disabled:opacity-50"
              : "rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-white hover:border-slate-500 disabled:opacity-50"
          }
        >
          {labels.changePhoto}
        </button>
        {coverUrl ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              handleRemove().catch((err) => {
                onError?.(err instanceof Error ? err.message : "Could not remove cover photo");
              });
            }}
            className={`text-red-400 hover:text-red-300 disabled:opacity-50 ${compact ? "text-xs" : "text-sm"}`}
          >
            {labels.removePhoto}
          </button>
        ) : null}
      </div>

      {labels.hint ? (
        <p className={`text-slate-500 ${compact ? "text-[11px] leading-snug" : "text-xs"}`}>
          {labels.hint}
        </p>
      ) : null}
    </>
  );

  return (
    <div className={compact ? "flex items-start gap-2.5" : "flex flex-col gap-3"}>
      <div
        className={`profile-cover-upload-preview shrink-0${compact ? " profile-cover-upload-preview--compact" : ""}`}
      >
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt=""
            fill
            sizes={compact ? "80px" : "(max-width: 640px) 100vw, 640px"}
            className="object-cover"
          />
        ) : null}
      </div>

      {compact ? (
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">{controls}</div>
      ) : (
        controls
      )}
    </div>
  );
}
