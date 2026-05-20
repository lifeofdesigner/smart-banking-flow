import Navbar from "@/components/Navbar";
import DynamicHero from "@/components/DynamicHero";
import DynamicHomepageSections from "@/components/DynamicHomepageSections";
import Footer from "@/components/Footer";

export default function LandingCinematic() {
  return (
    <div className="theme-cinematic min-h-screen overflow-x-hidden bg-background pb-20 text-foreground md:pb-0">
      <Navbar />
      <DynamicHero />
      <DynamicHomepageSections />
      <Footer />
    </div>
  );
}

