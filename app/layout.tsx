import type { Metadata } from "next";
import { DM_Serif_Display, DM_Sans } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const dmSerifDisplay = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DashBee | Transform Data into Decisions",
  description:
    "Connect databases with millions of rows, ask your business questions, and get interactive dashboards in seconds. AI-powered analytics for modern teams. Self-host on your own infrastructure.",
  keywords: [
    "dashboard",
    "analytics",
    "AI",
    "business intelligence",
    "data visualization",
    "database",
    "SQL",
    "self-hosted",
    "open source",
  ],
  authors: [{ name: "DashBee" }],
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-icon.svg", type: "image/svg+xml" },
    ],
  },
  openGraph: {
    title: "DashBee | Transform Data into Decisions",
    description:
      "Connect databases with millions of rows, ask your business questions, and get interactive dashboards in seconds. Self-host on your own infrastructure.",
    type: "website",
    locale: "en_US",
    siteName: "DashBee",
    images: [
      {
        url: "/og-image.png",
        width: 1280,
        height: 640,
        alt: "DashBee - Transform Data into Decisions",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DashBee | Transform Data into Decisions",
    description:
      "AI-powered analytics for modern teams. Self-host anywhere, your data stays on your servers.",
    images: ["/og-image.png"],
  },
  metadataBase: new URL("https://dashbee.dev"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${dmSerifDisplay.variable} ${dmSans.variable}`}
    >
      <body>
        <ThemeProvider>{children}</ThemeProvider>
        <Script
          defer
          src="https://cloud.umami.is/script.js"
          data-website-id="e0daf884-1824-428d-b256-6af8ca331e13"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
