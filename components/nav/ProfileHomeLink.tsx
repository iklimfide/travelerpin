import { Link } from "@/lib/i18n/navigation";

type ProfileHomeLinkProps = {
  className?: string;
  "aria-label": string;
  children: React.ReactNode;
};

export function ProfileHomeLink({ className, "aria-label": ariaLabel, children }: ProfileHomeLinkProps) {
  return (
    <Link href="/" className={className} aria-label={ariaLabel}>
      {children}
    </Link>
  );
}
