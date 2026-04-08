import Navbar from "@/components/Navbar";
import DynamicHero from "@/components/DynamicHero";
import Services from "@/components/Services";
import DynamicProducts from "@/components/DynamicProducts";
import About from "@/components/About";
import Testimonials from "@/components/Testimonials";
import FAQ from "@/components/FAQ";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export default function LandingNavyGold() {
  const siteSettings = useSiteSettings();
  const bankName = siteSettings.site_name || "Your Bank";
  const tagline = siteSettings.site_tagline || "Smarter banking for modern life.";

  return (
    <div className="min-h-screen bg-background">
      <div className="sr-only">{bankName} — {tagline}</div>
      <Navbar />
      <DynamicHero />
      <Services />
      <DynamicProducts />
      <About />
      <Testimonials />
      <FAQ />
      <Contact />
      <Footer />
    </div>
  );
}

