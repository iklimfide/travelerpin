type AuthErrorMessages = {
  loginInvalidCredentials: string;
  loginEmailNotConfirmed: string;
};

export function formatAuthErrorMessage(
  message: string,
  messages: AuthErrorMessages,
  code?: string | null
): string {
  const normalizedCode = code?.toLowerCase();
  const lower = message.toLowerCase();

  if (
    normalizedCode === "email_not_confirmed" ||
    lower.includes("email not confirmed") ||
    lower.includes("email_not_confirmed")
  ) {
    return messages.loginEmailNotConfirmed;
  }

  if (
    normalizedCode === "invalid_credentials" ||
    lower.includes("invalid login credentials") ||
    lower.includes("invalid_credentials")
  ) {
    return messages.loginInvalidCredentials;
  }

  return message;
}
