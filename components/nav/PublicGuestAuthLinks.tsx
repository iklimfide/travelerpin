import { Link } from "@/lib/i18n/navigation";

type PublicGuestAuthLinksProps = {
  loginHref: string;
  registerHref: string;
  loginLabel: string;
  registerLabel: string;
  className?: string;
  linkClassName?: string;
  primaryClassName?: string;
};

export function PublicGuestAuthLinks({
  loginHref,
  registerHref,
  loginLabel,
  registerLabel,
  className = "",
  linkClassName = "city-page__auth-link",
  primaryClassName = "city-page__auth-link city-page__auth-link--primary",
}: PublicGuestAuthLinksProps) {
  return (
    <div className={className}>
      <Link href={loginHref} className={linkClassName} prefetch={false}>
        {loginLabel}
      </Link>
      <Link href={registerHref} className={primaryClassName} prefetch={false}>
        {registerLabel}
      </Link>
    </div>
  );
}
