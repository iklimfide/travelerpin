import { Link } from "@/lib/i18n/navigation";
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

type LegalPageShellProps = {
  title: string;
  children: ReactNode;
};

export async function LegalPageShell({ title, children }: LegalPageShellProps) {
  const t = await getTranslations("legal");

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10 max-sm:px-4 max-sm:py-8">
      <p className="mb-6">
        <Link
          href="/"
          className="text-sm font-medium text-[#2563eb] hover:text-[#1d4ed8]"
        >
          {t("backToHome")}
        </Link>
      </p>
      <h1 className="mb-8 text-3xl font-bold tracking-tight text-foreground max-sm:text-2xl">
        {title}
      </h1>
      <div className="legal-page-content flex flex-col gap-6 text-[15px] leading-7 text-[#475569] dark:text-[#94a3b8]">
        {children}
      </div>
    </main>
  );
}
