"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LIMITS } from "@/lib/constants";
import { footerMessages, translateAuth, translateCommon } from "@/lib/i18n/client-messages";
import { createClient } from "@/lib/supabase/client";
import { formatDisplayName } from "@/lib/utils/display-name";
import { formatAuthErrorMessage } from "@/lib/utils/auth-error-message";
import { resolveAuthenticatedHomePath } from "@/lib/client/authenticated-home";
import { useModal } from "@/components/ui/ModalProvider";
import { PasswordInput } from "@/components/auth/PasswordInput";
import {
  loginSchema,
  registerSchema,
  type LoginInput,
  type RegisterInput,
} from "@/lib/validations/auth";

type AuthFormProps = {
  mode: "login" | "register";
  next?: string;
  /** Called after a successful sign-up that still needs email confirmation. */
  onRegisteredPendingConfirmation?: () => void;
};

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "reserved" | "invalid";

const USERNAME_CHECK_DEBOUNCE_MS = 400;

function sanitizeNext(next: string | undefined): string | null {
  if (!next) return null;
  if (next.startsWith("/")) return next;
  return null;
}

export function AuthForm({ mode, next, onRegisteredPendingConfirmation }: AuthFormProps) {
  const t = translateAuth;
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
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [passwordsVisible, setPasswordsVisible] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(true);

  const trimmedUsername = (form.username ?? "").trim();

  useEffect(() => {
    setSubmitError(null);
  }, [mode]);

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
    setSubmitError(null);
    setLoading(true);

    try {
      if (mode === "register") {
        if (!acceptedTerms) {
          setSubmitError(t("acceptTermsRequired"));
          return;
        }

        if (form.password !== (form.passwordConfirm ?? "")) {
          setSubmitError(t("passwordMismatch"));
          return;
        }

        const parsed = registerSchema.safeParse(form);
        if (!parsed.success) {
          const issue = parsed.error.issues[0];
          const message =
            issue?.path.includes("passwordConfirm") && issue.message.toLowerCase().includes("match")
              ? t("passwordMismatch")
              : (issue?.message ?? "Invalid input");
          setSubmitError(message);
          return;
        }

        const available = await ensureUsernameAvailable(parsed.data.username);
        if (!available) {
          setSubmitError(
            usernameStatus === "taken"
              ? t("usernameTaken")
              : usernameStatus === "reserved"
                ? t("usernameReserved")
                : t("usernameInvalid")
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
            },
          },
        });

        if (signUpError) {
          const message = signUpError.message.toLowerCase().includes("duplicate")
            ? t("usernameTaken")
            : formatAuthErrorMessage(
                signUpError.message,
                {
                  loginInvalidCredentials: t("loginInvalidCredentials"),
                  loginEmailNotConfirmed: t("loginEmailNotConfirmed"),
                },
                signUpError.code
              );
          setSubmitError(message);
          return;
        }

        if (signUpData.session) {
          const safeNext = sanitizeNext(next);
          window.location.assign(
            safeNext ?? (await resolveAuthenticatedHomePath(supabase))
          );
          return;
        }

        // Close the auth sheet first so the centered confirmation dialog is not covered.
        onRegisteredPendingConfirmation?.();
        await new Promise<void>((resolve) => {
          window.setTimeout(() => {
            void modal
              .alert(t("registerConfirmEmail"), {
                variant: "success",
                title: t("registerConfirmEmailTitle"),
              })
              .then(resolve);
          }, 0);
        });
      } else {
        const parsed = loginSchema.safeParse(form);
        if (!parsed.success) {
          setSubmitError(parsed.error.issues[0]?.message ?? "Invalid input");
          return;
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });

        if (signInError) {
          setSubmitError(
            formatAuthErrorMessage(
              signInError.message,
              {
                loginInvalidCredentials: t("loginInvalidCredentials"),
                loginEmailNotConfirmed: t("loginEmailNotConfirmed"),
              },
              signInError.code
            )
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
    (!acceptedTerms ||
      usernameStatus !== "available" ||
      trimmedUsername.length < LIMITS.usernameMin);

  const passwordsMismatch =
    mode === "register" &&
    Boolean(form.password) &&
    Boolean(form.passwordConfirm) &&
    form.password !== form.passwordConfirm;

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
            onChange={(e) => {
              setSubmitError(null);
              setForm((f) => ({ ...f, username: e.target.value }));
            }}
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
          onChange={(e) => {
            setSubmitError(null);
            setForm((f) => ({ ...f, email: e.target.value }));
          }}
          className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none focus:border-wbs-blue focus:ring-1 focus:ring-wbs-blue/20"
          required
          autoComplete="email"
        />
      </div>

      <PasswordInput
        id="password"
        label={t("password")}
        value={form.password}
        onChange={(password) => {
          setSubmitError(null);
          setForm((f) => ({ ...f, password }));
        }}
        autoComplete={mode === "register" ? "new-password" : "current-password"}
        minLength={LIMITS.passwordMin}
        showLabel={t("showPassword")}
        hideLabel={t("hidePassword")}
        tone="light"
        {...(mode === "register"
          ? { visible: passwordsVisible, onVisibleChange: setPasswordsVisible }
          : {})}
      />

      {mode === "register" ? (
        <div>
          <PasswordInput
            id="passwordConfirm"
            label={t("passwordConfirm")}
            value={form.passwordConfirm ?? ""}
            onChange={(passwordConfirm) => {
              setSubmitError(null);
              setForm((f) => ({ ...f, passwordConfirm }));
            }}
            autoComplete="new-password"
            minLength={LIMITS.passwordMin}
            showLabel={t("showPassword")}
            hideLabel={t("hidePassword")}
            tone="light"
            visible={passwordsVisible}
            onVisibleChange={setPasswordsVisible}
          />
          {passwordsMismatch ? (
            <p className="mt-1 text-xs text-red-500" role="alert">
              {t("passwordMismatch")}
            </p>
          ) : null}
        </div>
      ) : null}

      {mode === "register" ? (
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-wbs-blue focus:ring-wbs-blue/20"
          />
          <span className="text-sm leading-snug text-slate-600">
            {t("acceptTermsPrefix")}{" "}
            <Link
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-wbs-blue hover:text-wbs-blue-hover"
            >
              {footerMessages.terms}
            </Link>{" "}
            {t("acceptTermsAnd")}{" "}
            <Link
              href="/policy"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-wbs-blue hover:text-wbs-blue-hover"
            >
              {footerMessages.privacy}
            </Link>
            .
          </span>
        </label>
      ) : null}

      {submitError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {submitError}
        </p>
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
