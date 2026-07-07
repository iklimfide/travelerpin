"use client";

import { useEffect, useRef, useState } from "react";
import { LIMITS } from "@/lib/constants";
import { translateAuth, translateCommon, translateSettings } from "@/lib/i18n/client-messages";
import { createClient } from "@/lib/supabase/client";
import { formatDisplayName } from "@/lib/utils/display-name";
import { formatAuthErrorMessage } from "@/lib/utils/auth-error-message";
import { resolveAuthenticatedHomePath } from "@/lib/client/authenticated-home";
import { useModal } from "@/components/ui/ModalProvider";
import { PasswordInput } from "@/components/auth/PasswordInput";
import {
  ResidenceCityPicker,
  type ResidenceCitySelection,
} from "@/components/dashboard/ResidenceCityPicker";
import {
  loginSchema,
  registerSchema,
  type LoginInput,
  type RegisterInput,
} from "@/lib/validations/auth";

type AuthFormProps = {
  mode: "login" | "register";
  next?: string;
};

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "reserved" | "invalid";

const USERNAME_CHECK_DEBOUNCE_MS = 400;

function sanitizeNext(next: string | undefined): string | null {
  if (!next) return null;
  if (next.startsWith("/")) return next;
  return null;
}

async function saveResidenceCity(residenceCity: ResidenceCitySelection): Promise<void> {
  await fetch("/api/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ residence_city: residenceCity }),
  }).catch(() => {
    // Non-blocking; user can set residence in profile settings later.
  });
}

export function AuthForm({ mode, next }: AuthFormProps) {
  const t = translateAuth;
  const tSettings = translateSettings;
  const tCommon = translateCommon;
  const supabase = createClient();
  const modal = useModal();
  const abortRef = useRef<AbortController | null>(null);

  const [form, setForm] = useState<LoginInput & Partial<RegisterInput>>({
    email: "",
    password: "",
    username: "",
    passwordConfirm: "",
  });
  const [residenceSelection, setResidenceSelection] = useState<ResidenceCitySelection | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");

  const trimmedUsername = (form.username ?? "").trim();

  useEffect(() => {
    if (mode !== "register") return;

    if (trimmedUsername.length < LIMITS.usernameMin) {
      setUsernameStatus("idle");
      return;
    }

    const timer = window.setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setUsernameStatus("checking");

      fetch(
        `/api/auth/username-available?username=${encodeURIComponent(trimmedUsername)}`,
        { signal: controller.signal }
      )
        .then(async (res) => {
          if (!res.ok) {
            setUsernameStatus("idle");
            return;
          }
          const data = (await res.json()) as {
            available: boolean;
            reason?: "invalid" | "reserved" | "taken";
          };

          if (controller.signal.aborted) return;

          if (data.available) {
            setUsernameStatus("available");
            return;
          }

          if (data.reason === "taken") setUsernameStatus("taken");
          else if (data.reason === "reserved") setUsernameStatus("reserved");
          else setUsernameStatus("invalid");
        })
        .catch(() => {
          if (!controller.signal.aborted) setUsernameStatus("idle");
        });
    }, USERNAME_CHECK_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [mode, trimmedUsername]);

  async function ensureUsernameAvailable(username: string): Promise<boolean> {
    const res = await fetch(
      `/api/auth/username-available?username=${encodeURIComponent(username)}`
    );
    if (!res.ok) return false;

    const data = (await res.json()) as {
      available: boolean;
      reason?: "invalid" | "reserved" | "taken";
    };

    if (data.available) {
      setUsernameStatus("available");
      return true;
    }

    if (data.reason === "taken") setUsernameStatus("taken");
    else if (data.reason === "reserved") setUsernameStatus("reserved");
    else setUsernameStatus("invalid");

    return false;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "register") {
        if (!residenceSelection) {
          await modal.alert(tSettings("residenceSelectRequired"), { variant: "error" });
          return;
        }

        const parsed = registerSchema.safeParse({
          ...form,
          residence_city: residenceSelection,
        });
        if (!parsed.success) {
          await modal.alert(parsed.error.issues[0]?.message ?? "Invalid input", {
            variant: "error",
          });
          return;
        }

        const available = await ensureUsernameAvailable(parsed.data.username);
        if (!available) {
          await modal.alert(
            usernameStatus === "taken"
              ? t("usernameTaken")
              : usernameStatus === "reserved"
                ? t("usernameReserved")
                : t("usernameInvalid"),
            { variant: "error" }
          );
          return;
        }

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            data: {
              username: parsed.data.username,
              display_name: formatDisplayName(parsed.data.username),
              residence_city: parsed.data.residence_city,
            },
          },
        });

        if (signUpError) {
          const message = signUpError.message.toLowerCase().includes("duplicate")
            ? t("usernameTaken")
            : formatAuthErrorMessage(signUpError.message, {
                loginInvalidCredentials: t("loginInvalidCredentials"),
                loginEmailNotConfirmed: t("loginEmailNotConfirmed"),
              });
          await modal.alert(message, { variant: "error", title: t("registerTitle") });
          return;
        }

        if (signUpData.session) {
          await saveResidenceCity(parsed.data.residence_city);
          const safeNext = sanitizeNext(next);
          window.location.assign(
            safeNext ?? (await resolveAuthenticatedHomePath(supabase))
          );
          return;
        }

        await modal.alert(t("registerConfirmEmail"), {
          variant: "info",
          title: t("registerTitle"),
        });
      } else {
        const parsed = loginSchema.safeParse(form);
        if (!parsed.success) {
          await modal.alert(parsed.error.issues[0]?.message ?? "Invalid input", {
            variant: "error",
          });
          return;
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });

        if (signInError) {
          await modal.alert(
            formatAuthErrorMessage(signInError.message, {
              loginInvalidCredentials: t("loginInvalidCredentials"),
              loginEmailNotConfirmed: t("loginEmailNotConfirmed"),
            }),
            { variant: "error", title: t("loginTitle") }
          );
          return;
        }

        const safeNext = sanitizeNext(next);
        window.location.assign(
          safeNext ?? (await resolveAuthenticatedHomePath(supabase))
        );
      }
    } finally {
      setLoading(false);
    }
  }

  const usernameStatusMessage =
    usernameStatus === "checking"
      ? t("usernameChecking")
      : usernameStatus === "available"
        ? t("usernameAvailable")
        : usernameStatus === "taken"
          ? t("usernameTaken")
          : usernameStatus === "reserved"
            ? t("usernameReserved")
            : usernameStatus === "invalid"
              ? t("usernameInvalid")
              : null;

  const usernameStatusClass =
    usernameStatus === "available"
      ? "text-emerald-400"
      : usernameStatus === "checking" || usernameStatus === "idle"
        ? "text-slate-500"
        : "text-red-400";

  const registerBlocked =
    mode === "register" &&
    (usernameStatus !== "available" ||
      trimmedUsername.length < LIMITS.usernameMin ||
      !residenceSelection);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {mode === "register" && (
        <div>
          <label htmlFor="username" className="mb-1 block text-sm font-medium text-wbs-blue">
            {t("username")}
          </label>
          <input
            id="username"
            type="text"
            value={form.username ?? ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, username: e.target.value.toLowerCase() }))
            }
            className={`w-full rounded-lg border bg-white px-4 py-2.5 text-slate-900 outline-none focus:ring-1 ${
              usernameStatus === "taken" ||
              usernameStatus === "reserved" ||
              usernameStatus === "invalid"
                ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                : usernameStatus === "available"
                  ? "border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500/20"
                  : "border-slate-200 focus:border-wbs-blue focus:ring-wbs-blue/20"
            }`}
            required
            autoComplete="username"
            maxLength={LIMITS.usernameMax}
          />
          <p className="mt-1 text-xs text-slate-500">
            {t("usernameHint", { username: form.username || "yourname" })}
          </p>
          {usernameStatusMessage ? (
            <p className={`mt-1 text-xs ${usernameStatusClass}`} role="status">
              {usernameStatusMessage}
            </p>
          ) : null}
        </div>
      )}

      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-wbs-blue">
          {t("email")}
        </label>
        <input
          id="email"
          type="email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none focus:border-wbs-blue focus:ring-1 focus:ring-wbs-blue/20"
          required
          autoComplete="email"
        />
      </div>

      {mode === "register" ? (
        <div>
          <p className="mb-1 text-sm font-medium text-wbs-blue">{tSettings("residence")}</p>
          <ResidenceCityPicker
            value={residenceSelection}
            onChange={setResidenceSelection}
            disabled={loading}
            searchPath="/api/public/cities/search"
            allowClear={false}
            tone="light"
          />
        </div>
      ) : null}

      <PasswordInput
        id="password"
        label={t("password")}
        value={form.password}
        onChange={(password) => setForm((f) => ({ ...f, password }))}
        autoComplete={mode === "register" ? "new-password" : "current-password"}
        minLength={LIMITS.passwordMin}
        showLabel={t("showPassword")}
        hideLabel={t("hidePassword")}
        tone="light"
      />

      {mode === "register" ? (
        <PasswordInput
          id="passwordConfirm"
          label={t("passwordConfirm")}
          value={form.passwordConfirm ?? ""}
          onChange={(passwordConfirm) => setForm((f) => ({ ...f, passwordConfirm }))}
          autoComplete="new-password"
          minLength={LIMITS.passwordMin}
          showLabel={t("showPassword")}
          hideLabel={t("hidePassword")}
          tone="light"
        />
      ) : null}

      <button
        type="submit"
        disabled={loading || registerBlocked}
        className="on-dark-surface mt-2 rounded-lg bg-wbs-blue py-2.5 font-medium text-white shadow-sm shadow-wbs-blue/20 transition hover:bg-wbs-blue-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? tCommon("loading") : mode === "register" ? tCommon("register") : tCommon("login")}
      </button>
    </form>
  );
}
