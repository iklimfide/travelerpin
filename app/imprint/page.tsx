import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@/lib/constants";
import { getSiteUrl } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "Imprint",
  description: `Legal imprint and operator information for ${BRAND.name}.`,
  alternates: { canonical: "/imprint" },
  openGraph: {
    title: `Imprint | ${BRAND.name}`,
    description: `Who operates ${BRAND.name}.`,
    url: `${getSiteUrl()}/imprint`,
  },
};

const CONTACT_EMAIL = `hello@${BRAND.domain}`;

type Field = {
  label: string;
  value: string;
  href?: string;
};

const FIELDS: Field[] = [
  { label: "Service", value: BRAND.name },
  { label: "Website", value: BRAND.domain, href: `https://${BRAND.domain}` },
  { label: "Operator", value: "Arif Güvenç" },
  { label: "Country", value: "Türkiye" },
  { label: "Contact", value: CONTACT_EMAIL, href: `mailto:${CONTACT_EMAIL}` },
];

export default function ImprintPage() {
  return (
    <main className="mx-auto max-w-2xl flex-1 px-4 py-10 text-center text-slate-200">
      <div className="mb-8">
        <p className="text-sm font-medium text-blue-400">
          <Link href="/" className="hover:text-blue-300">
            {BRAND.name}
          </Link>
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Imprint</h1>
        <p className="mt-2 text-sm text-slate-400">
          Legal notice and operator information for {BRAND.name}.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <dl className="space-y-5">
          {FIELDS.map((field) => (
            <div key={field.label}>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {field.label}
              </dt>
              <dd className="mt-1 text-[15px] text-slate-200">
                {field.href ? (
                  <a
                    href={field.href}
                    className="text-blue-400 hover:text-blue-300"
                    {...(field.href.startsWith("http")
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                  >
                    {field.value}
                  </a>
                ) : (
                  field.value
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-8 space-y-3 text-[15px] leading-relaxed text-slate-300">
        <h2 className="text-lg font-semibold text-white">About the service</h2>
        <p>
          {BRAND.name} is a travel map product that lets people pin countries, cities, and parks
          they have visited and share a public profile link.
        </p>
        <p>
          For product rules and data practices, see our{" "}
          <Link href="/terms" className="text-blue-400 hover:text-blue-300">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-blue-400 hover:text-blue-300">
            Privacy Policy
          </Link>
          .
        </p>
      </section>

      <p className="mt-12 flex flex-wrap justify-center gap-x-4 gap-y-2 border-t border-slate-800 pt-6 text-sm text-slate-500">
        <Link href="/contact" className="text-blue-400 hover:text-blue-300">
          Contact
        </Link>
        <Link href="/terms" className="text-blue-400 hover:text-blue-300">
          Terms of Service
        </Link>
        <Link href="/privacy" className="text-blue-400 hover:text-blue-300">
          Privacy Policy
        </Link>
        <Link href="/" className="text-blue-400 hover:text-blue-300">
          Back to {BRAND.name}
        </Link>
      </p>
    </main>
  );
}
