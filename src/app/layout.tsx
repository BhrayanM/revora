import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";

import { ThemeProvider } from "@/components/theme/theme-provider";
import { THEME_INIT_SCRIPT } from "@/components/theme/theme-script";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "Revora | AI Revenue Automation Platform",
    template: "%s | Revora",
  },
  description:
    "Revora is an AI revenue automation platform for qualifying leads, coordinating revenue workflows, and giving teams a clearer path from signal to action.",
  keywords: [
    "AI revenue automation",
    "revenue operations",
    "lead qualification",
    "revenue workflows",
    "AI platform",
  ],
  applicationName: "Revora",
  authors: [{ name: "Revora" }],
  openGraph: {
    title: "Revora — AI Revenue Automation Platform",
    description:
      "Turn every qualified signal into a repeatable revenue workflow.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Revora — AI Revenue Automation Platform",
    description:
      "Turn every qualified signal into a repeatable revenue workflow.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full scroll-smooth antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg"
        >
          Skip to content
        </a>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
