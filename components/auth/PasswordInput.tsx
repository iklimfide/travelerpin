"use client";

import { useState } from "react";

type PasswordInputProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  minLength?: number;
  showLabel: string;
  hideLabel: string;
  required?: boolean;
  tone?: "dark" | "light";
};

export function PasswordInput({
  id,
  label,
  value,
  onChange,
  autoComplete,
  minLength,
  showLabel,
  hideLabel,
  required = true,
  tone = "dark",
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const isLight = tone === "light";

  return (
    <div>
      <label
        htmlFor={id}
        className={`mb-1 block text-sm font-medium ${isLight ? "text-wbs-blue" : "text-slate-400"}`}
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={
            isLight
              ? "w-full rounded-lg border border-slate-200 bg-white py-2.5 pr-11 pl-4 text-slate-900 outline-none focus:border-wbs-blue focus:ring-1 focus:ring-wbs-blue/20"
              : "w-full rounded-lg border border-slate-700 bg-slate-900 py-2.5 pr-11 pl-4 text-white outline-none focus:border-blue-500"
          }
          required={required}
          autoComplete={autoComplete}
          minLength={minLength}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className={`absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1.5 ${
            isLight ? "text-slate-400 hover:text-slate-600" : "text-slate-400 hover:text-slate-200"
          }`}
          aria-label={visible ? hideLabel : showLabel}
          aria-pressed={visible}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
      <path d="M6.7 6.7C4.1 8.5 2.5 12 2.5 12s3.5 7 10 7c1.8 0 3.4-.5 4.8-1.3" />
      <path d="M17.3 17.3C19.9 15.5 21.5 12 21.5 12s-3.5-7-10-7c-1.8 0-3.4.5-4.8 1.3" />
    </svg>
  );
}
