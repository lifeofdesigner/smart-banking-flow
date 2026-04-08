import Navbar from "@/components/Navbar";
import Services from "@/components/Services";
import DynamicProducts from "@/components/DynamicProducts";
import About from "@/components/About";
import Testimonials from "@/components/Testimonials";
import FAQ from "@/components/FAQ";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export default function LandingDashboardApp() {
  const siteSettings = useSiteSettings();
  const bankName = siteSettings.site_name || "Your Bank";
  const tagline = siteSettings.site_tagline || "A powerful banking app for daily money flow.";

  return (
    <div className="theme-dashboard-app min-h-screen bg-background text-foreground">
      <Navbar />

      <section className="mx-auto grid max-w-7xl gap-10 px-6 pb-16 pt-28 md:grid-cols-2 md:items-center">
        <div>
          <h1 className="text-5xl font-bold leading-tight">Control your finances with one clean dashboard.</h1>
          <p className="mt-5 text-lg text-muted-foreground">{tagline}</p>
          <div className="mt-8 flex gap-3">
            <button className="rounded-md bg-accent px-6 py-3 font-medium text-accent-foreground">Open Account</button>
            <button className="rounded-md border border-border px-6 py-3 font-medium">View Demo</button>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-lg">
          <div className="rounded-xl bg-primary p-5 text-primary-foreground">
            <p className="text-xs text-primary-foreground/70">Current Balance</p>
            <p className="mt-2 text-3xl font-bold">$19,840.55</p>
            <div className="mt-4 rounded-lg bg-accent p-3 text-accent-foreground">
              <p className="text-xs text-accent-foreground/80">Income this month</p>
              <p className="text-xl font-semibold">+$3,400</p>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {['Send', 'Request', 'Cards'].map((action) => (
                <button key={action} className="rounded bg-primary-foreground/10 px-2 py-2 text-xs hover:bg-primary-foreground/20">{action}</button>
              ))}
            </div>
          </div>
        </div>
      </section>

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

