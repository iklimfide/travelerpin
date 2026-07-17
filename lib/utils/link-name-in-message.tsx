import type { ReactNode } from "react";
import { Link } from "@/lib/i18n/navigation";
import { formatMessage } from "@/lib/i18n/message-catalog";

/** Splits a `{name}` template and wraps the name in a profile link. */
export function linkNameInMessage(
  template: string,
  name: string,
  href: string,
  values?: Record<string, string | number>,
  className = "home-profile-name-link"
): ReactNode {
  const parts = template.split("{name}");
  if (parts.length !== 2) {
    return formatMessage(template, { name, ...values });
  }

  const tail = values
    ? formatMessage(parts[1], values)
    : parts[1];

  return (
    <>
      {parts[0]}
      <Link href={href} className={className}>
        {name}
      </Link>
      {tail}
    </>
  );
}
