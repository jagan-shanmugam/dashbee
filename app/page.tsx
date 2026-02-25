import { getLandingPageData } from "@/lib/landing-data";
import { LandingPageClient } from "./landing-client";

// Revalidate every hour (ISR)
export const revalidate = 3600;

export default async function LandingPage() {
  // Fetch data at build time / during ISR
  const data = await getLandingPageData();

  return <LandingPageClient data={data} />;
}
