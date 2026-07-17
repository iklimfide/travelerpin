"use client";

import { useEffect, type ReactNode } from "react";
import {
  CopyIcon,
  FacebookIcon,
  InstagramIcon,
  TelegramIcon,
  WhatsAppIcon,
  XIcon,
} from "@/components/share/SharePlatformIcons";
import { useAppMessages } from "@/lib/i18n/client-messages";

type ShareOption = {
  id: string;
  label: string;
  icon: ReactNode;
  iconClassName: string;
  onClick: () => void;
};

type ShareSheetModalProps = {
  open: boolean;
  onClose: () => void;
  onCopy: () => void;
  onShareComplete?: () => void | Promise<void>;
  shareLinks: {
    x: string;
    whatsapp: string;
    telegram: string;
    facebook: string;
  };
};

function ShareOptionButton({ label, icon, iconClassName, onClick }: Omit<ShareOption, "id">) {
  const { share: shareMessages } = useAppMessages();
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-2 rounded-lg p-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
    >
      <span
        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full shadow-sm ${iconClassName}`}
      >
        {icon}
      </span>
      <span className="max-w-[5.5rem] truncate text-center text-xs font-medium text-slate-700 dark:text-slate-200">
        {label}
      </span>
    </button>
  );
}

export function ShareSheetModal({
  open,
  onClose,
  onCopy,
  onShareComplete,
  shareLinks,
}: ShareSheetModalProps) {
  const { share: shareMessages } = useAppMessages();
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  function openLink(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
    onClose();
    void onShareComplete?.();
  }

  const options: ShareOption[] = [
    {
      id: "x",
      label: shareMessages.x,
      icon: <XIcon className="h-7 w-7" />,
      iconClassName: "bg-black",
      onClick: () => openLink(shareLinks.x),
    },
    {
      id: "whatsapp",
      label: shareMessages.whatsapp,
      icon: <WhatsAppIcon className="h-7 w-7" />,
      iconClassName: "bg-[#25D366]",
      onClick: () => openLink(shareLinks.whatsapp),
    },
    {
      id: "telegram",
      label: shareMessages.telegram,
      icon: <TelegramIcon className="h-6 w-6" />,
      iconClassName: "bg-[#26A5E4]",
      onClick: () => openLink(shareLinks.telegram),
    },
    {
      id: "facebook",
      label: shareMessages.facebook,
      icon: <FacebookIcon className="h-7 w-7" />,
      iconClassName: "bg-[#1877F2]",
      onClick: () => openLink(shareLinks.facebook),
    },
    {
      id: "instagram",
      label: shareMessages.instagram,
      icon: <InstagramIcon className="h-6 w-6" />,
      iconClassName: "bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]",
      onClick: () => {
        onCopy();
        onClose();
      },
    },
    {
      id: "copy",
      label: shareMessages.copy,
      icon: <CopyIcon className="h-6 w-6" />,
      iconClassName: "bg-slate-500",
      onClick: () => {
        onCopy();
        onClose();
      },
    },
  ];

  return (
    <div className="fixed inset-0 z-[105] flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        aria-label={shareMessages.close}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-sheet-title"
        className="relative z-10 w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl dark:bg-slate-900"
      >
        <div className="mb-5 flex items-center justify-center">
          <h2
            id="share-sheet-title"
            className="text-lg font-semibold text-slate-900 dark:text-white"
          >
            {shareMessages.modalTitle}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={shareMessages.close}
            className="absolute right-4 top-4 rounded-full p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {options.map((option) => (
            <ShareOptionButton
              key={option.id}
              label={option.label}
              icon={option.icon}
              iconClassName={option.iconClassName}
              onClick={option.onClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
