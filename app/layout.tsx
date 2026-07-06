import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { BRAND } from "@/lib/constants";
import { DEFAULT_DESCRIPTION, DEFAULT_KEYWORDS, getSiteUrl } from "@/lib/seo/site";
import {
  PIN_MAP_OG_DESCRIPTION,
  PIN_MAP_OG_TITLE,
  staticOpenGraphImages,
  staticTwitterImages,
} from "@/lib/seo/og";
import { defaultLocale, type Locale } from "@/lib/i18n/config";
import enMessages from "@/messages/en.json";
import { ModalProvider } from "@/components/ui/ModalProvider";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { AuthModalProvider } from "@/components/auth/AuthModalProvider";
import { SharePinPromptProvider } from "@/components/share/SharePinPromptProvider";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ClearPwaArtifacts } from "@/components/dev/ClearPwaArtifacts";
import { DevMobilePreview } from "@/components/dev/DevMobilePreview";
import { OwnProfileShellGate } from "@/components/dashboard/OwnProfileShellGate";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  title: {
    default: BRAND.name,
    template: `%s | ${BRAND.name}`,
  },
  description: DEFAULT_DESCRIPTION,
  keywords: DEFAULT_KEYWORDS,
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: BRAND.name,
    title: PIN_MAP_OG_TITLE,
    description: PIN_MAP_OG_DESCRIPTION,
    images: staticOpenGraphImages(),
  },
  twitter: {
    card: "summary_large_image",
    title: PIN_MAP_OG_TITLE,
    description: PIN_MAP_OG_DESCRIPTION,
    images: staticTwitterImages(),
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let locale: Locale = defaultLocale;
  let messages: Record<string, unknown> = enMessages;

  try {
    locale = (await getLocale()) as Locale;
    messages = await getMessages();
  } catch {
    // Fallback when request config is unavailable (e.g. during error recovery)
  }

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} light h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full min-w-0 flex-col overflow-x-hidden bg-background text-foreground">
        <DevMobilePreview>
          <OwnProfileShellGate>
            <NextIntlClientProvider locale={locale} messages={messages}>
              <ThemeProvider>
                <ClearPwaArtifacts />
                <ModalProvider>
                  <ToastProvider>
                    <SharePinPromptProvider>
                      <AuthModalProvider>{children}</AuthModalProvider>
                    </SharePinPromptProvider>
                  </ToastProvider>
                </ModalProvider>
              </ThemeProvider>
            </NextIntlClientProvider>
          </OwnProfileShellGate>
        </DevMobilePreview>
      </body>
    </html>
  );
}
