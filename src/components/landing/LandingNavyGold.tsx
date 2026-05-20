import Navbar from "@/components/Navbar";
import DynamicHero from "@/components/DynamicHero";
import Footer from "@/components/Footer";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import MarketTicker from "@/components/MarketTicker";
import DynamicHomepageSections from "@/components/DynamicHomepageSections";

export default function LandingNavyGold() {
  const siteSettings = useSiteSettings();
  const bankName = siteSettings.site_name || "Your Bank";
  const tagline = siteSettings.site_tagline || "Smarter banking for modern life.";

  return (
    <div className="min-h-screen overflow-x-hidden bg-background pb-20 md:pb-0">
      <div className="sr-only">{bankName} - {tagline}</div>
      <AnnouncementBanner />
      <Navbar />
      <DynamicHero />
      <MarketTicker />
      <DynamicHomepageSections />
      <Footer />
    </div>
  );
}
