"use client";

import { useRef } from "react";
import Image from "next/image";
import { LIMITS } from "@/lib/constants";

type ProfileAvatarProps = {
  avatarUrl: string | null;
  displayName: string;
  username: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
};

const SIZES = {
  xs: { box: "h-9 w-9", text: "text-xs", px: 36 },
  sm: { box: "h-12 w-12", text: "text-lg", px: 48 },
  md: { box: "h-20 w-20", text: "text-2xl", px: 80 },
  lg: { box: "h-28 w-28", text: "text-3xl", px: 112 },
} as const;

function initials(displayName: string, username: string): string {
  const source = displayName.trim() || username;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function ProfileAvatar({
  avatarUrl,
  displayName,
  username,
  size = "md",
  className = "",
}: ProfileAvatarProps) {
  const dims = SIZES[size];
  const label = displayName || username;

  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={label}
        width={dims.px}
        height={dims.px}
        className={`${dims.box} shrink-0 rounded-full object-cover ring-2 ring-slate-700 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${dims.box} flex shrink-0 items-center justify-center rounded-full bg-blue-600 font-semibold text-white ring-2 ring-slate-700 ${dims.text} ${className}`}
      aria-hidden
    >
      {initials(displayName, username)}
    </div>
  );
}

export function ProfileAvatarUpload({
  avatarUrl,
  displayName,
  username,
  onChange,
  onError,
  disabled,
  labels,
  compact = false,
}: {
  avatarUrl: string | null;
  displayName: string;
  username: string;
  onChange: (url: string | null) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
  compact?: boolean;
  labels: {
    changePhoto: string;
    removePhoto: string;
    hint: string;
  };
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      onError?.("File must be an image");
      return;
    }
    if (file.size > LIMITS.avatarMaxBytes) {
      onError?.("Image must be 5 MB or smaller");
      return;
    }

    const formData = new FormData();
    formData.set("file", file);

    const res = await fetch("/api/profile/avatar", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "Could not upload photo");
    }

    const data = await res.json();
    onChange(data.url);
  }

  async function handleRemove() {
    const res = await fetch("/api/profile/avatar", { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "Could not remove photo");
    }
    onChange(null);
  }

  return (
    <div className={compact ? "flex items-start gap-2.5" : "flex flex-wrap items-center gap-4"}>
      <ProfileAvatar
        avatarUrl={avatarUrl}
        displayName={displayName}
        username={username}
        size={compact ? "md" : "lg"}
        className={compact ? "shrink-0" : ""}
      />
      <div className={compact ? "min-w-0 flex flex-1 flex-col gap-1.5" : "flex flex-col gap-2"}>
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
              onError?.(err instanceof Error ? err.message : "Could not upload photo");
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
          {avatarUrl ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                handleRemove().catch((err) => {
                  onError?.(err instanceof Error ? err.message : "Could not remove photo");
                });
              }}
              className={`text-red-400 hover:text-red-300 disabled:opacity-50 ${compact ? "text-xs" : "text-sm"}`}
            >
              {labels.removePhoto}
            </button>
          ) : null}
        </div>
        {labels.hint && !compact ? (
          <p className="text-xs text-slate-500">{labels.hint}</p>
        ) : null}
      </div>
    </div>
  );
}
