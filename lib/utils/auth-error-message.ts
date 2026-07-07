type AuthErrorMessages = {
  loginInvalidCredentials: string;
  loginEmailNotConfirmed: string;
};

export function formatAuthErrorMessage(
  message: string,
  messages: AuthErrorMessages
): string {
  const lower = message.toLowerCase();

  if (
    lower.includes("invalid login credentials") ||
    lower.includes("invalid_credentials")
  ) {
    return messages.loginInvalidCredentials;
  }

  if (
    lower.includes("email not confirmed") ||
    lower.includes("email_not_confirmed")
  ) {
    return messages.loginEmailNotConfirmed;
  }

  return message;
}
