import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic, Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Providers } from "@/components/providers";
import { dirOf, type Locale } from "@/i18n/config";
import "./globals.css";

const arabic = IBM_Plex_Sans_Arabic({ subsets: ["arabic"], weight: ["300", "400", "500", "600", "700"], variable: "--font-arabic", display: "swap" });
const latin = Inter({ subsets: ["latin"], variable: "--font-latin", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Qaswarah Ads Hub", template: "%s · Qaswarah Ads Hub" },
  description: "Central Team ads tracking for Qaswarah Holding",
  icons: { icon: "/brand/qaswarah-logo.svg" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F6F8" },
    { media: "(prefers-color-scheme: dark)", color: "#0A0F19" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = (await getLocale()) as Locale;
  const messages = await getMessages();
  const dir = dirOf(locale);
  return (
    <html lang={locale} dir={dir} suppressHydrationWarning className={`${arabic.variable} ${latin.variable}`}>
      <body className={locale === "en" ? "font-latin" : "font-sans"}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers dir={dir}>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
