import Navbar from "@/components/Navbar";
import DynamicHero from "@/components/DynamicHero";
import DynamicHomepageSections from "@/components/DynamicHomepageSections";
import Footer from "@/components/Footer";

export default function LandingMagazine() {
  return (
    <div className="theme-magazine min-h-screen overflow-x-hidden bg-background pb-20 text-foreground md:pb-0">
      <Navbar />
      <div className="md:border-b-4 md:border-t-4 md:border-[hsl(var(--primary))]">
        <DynamicHero />
      </div>
      <DynamicHomepageSections />
      <Footer />
    </div>
  );
}

