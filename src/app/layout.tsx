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
  title: "AI Growth | End-to-End AI Business Automation",
  description:
    "Automate your business with AI-powered lead qualification, appointment booking, and multi-channel outreach. Integrates with GoHighLevel, HubSpot, Slack, Twilio, and n8n.",
  keywords: [
    "AI automation",
    "business automation",
    "lead qualification",
    "CRM",
    "GoHighLevel",
    "HubSpot",
    "n8n",
    "AI platform",
    "SaaS",
  ],
  authors: [{ name: "AI Growth" }],
  openGraph: {
    title: "AI Growth",
    description:
      "End-to-End AI Business Automation Platform. Qualify leads, book appointments, and automate outreach.",
    type: "website",
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
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg"
        >
          Skip to content
        </a>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
