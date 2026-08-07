import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "AI Growth Platform | End-to-End AI Business Automation",
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
  authors: [{ name: "AI Growth Platform" }],
  openGraph: {
    title: "AI Growth Platform",
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
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
