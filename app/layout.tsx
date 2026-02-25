import type { Metadata } from "next";
import { DM_Serif_Display, DM_Sans } from "next/font/google";
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
    "Connect databases with millions of rows, ask your business questions, and get interactive dashboards in seconds. AI-powered analytics for modern teams.",
  keywords: [
    "dashboard",
    "analytics",
    "AI",
    "business intelligence",
    "data visualization",
    "database",
    "SQL",
  ],
  authors: [{ name: "DashBee" }],
  openGraph: {
    title: "DashBee | Transform Data into Decisions",
    description:
      "Connect databases with millions of rows, ask your business questions, and get interactive dashboards in seconds.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "DashBee | Transform Data into Decisions",
    description:
      "AI-powered analytics for modern teams. Get insights instantly from your data.",
  },
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
      </body>
    </html>
  );
}
