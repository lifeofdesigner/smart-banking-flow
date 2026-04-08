import Navbar from "@/components/Navbar";
import DynamicHero from "@/components/DynamicHero";
import Services from "@/components/Services";
import DynamicProducts from "@/components/DynamicProducts";
import About from "@/components/About";
import Testimonials from "@/components/Testimonials";
import FAQ from "@/components/FAQ";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

export default function LandingSoftModern() {
  return (
    <div className="theme-soft-modern min-h-screen bg-background text-foreground">
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

