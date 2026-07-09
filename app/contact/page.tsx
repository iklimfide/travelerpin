import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@/lib/constants";
import { getSiteUrl } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `Contact ${BRAND.name} — support, privacy requests, and general questions.`,
  alternates: { canonical: "/contact" },
  openGraph: {
    title: `Contact | ${BRAND.name}`,
    description: `Get in touch with ${BRAND.name}.`,
    url: `${getSiteUrl()}/contact`,
  },
};

const CONTACT_EMAIL = `hello@${BRAND.domain}`;

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-2xl flex-1 px-4 py-10 text-center text-slate-200">
      <div className="mb-8">
        <p className="text-sm font-medium text-blue-400">
          <Link href="/" className="hover:text-blue-300">
            {BRAND.name}
          </Link>
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Contact</h1>
        <p className="mt-2 text-sm text-slate-400">
          We read every message. Email is the best way to reach us.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 px-6 py-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</p>
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="mt-2 inline-block text-xl font-semibold text-blue-400 hover:text-blue-300"
        >
          {CONTACT_EMAIL}
        </a>
        <p className="mt-4 text-sm leading-relaxed text-slate-400">
          Please include your TravelerPin username when the message is about your account.
        </p>
      </section>

      <p className="mt-12 flex flex-wrap justify-center gap-x-4 gap-y-2 border-t border-slate-800 pt-6 text-sm text-slate-500">
        <Link href="/imprint" className="text-blue-400 hover:text-blue-300">
          Imprint
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
