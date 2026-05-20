import Navbar from "@/components/Navbar";
import DynamicHero from "@/components/DynamicHero";
import DynamicHomepageSections from "@/components/DynamicHomepageSections";
import Footer from "@/components/Footer";

export default function LandingGeometric() {
  return (
    <div className="theme-geometric min-h-screen overflow-x-hidden bg-background pb-20 text-foreground md:pb-0">
      <Navbar />
      <DynamicHero />
      <DynamicHomepageSections />
      <Footer />
    </div>
  );
}

