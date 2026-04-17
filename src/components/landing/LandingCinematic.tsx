import Navbar from "@/components/Navbar";
import DynamicHero from "@/components/DynamicHero";
import Services from "@/components/Services";
import DynamicProducts from "@/components/DynamicProducts";
import About from "@/components/About";
import Testimonials from "@/components/Testimonials";
import FAQ from "@/components/FAQ";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

export default function LandingCinematic() {
  return (
    <div className="theme-cinematic min-h-screen overflow-x-hidden bg-background pb-20 text-foreground md:pb-0">
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

