import Navbar from "@/components/Navbar";
import Services from "@/components/Services";
import DynamicProducts from "@/components/DynamicProducts";
import About from "@/components/About";
import Testimonials from "@/components/Testimonials";
import FAQ from "@/components/FAQ";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export default function LandingSplitScreen() {
  const siteSettings = useSiteSettings();
  const bankName = siteSettings.site_name || "Your Bank";
  const tagline = siteSettings.site_tagline || "Secure wealth management for modern life.";

  return (
    <div className="theme-split-screen min-h-screen overflow-x-hidden bg-background pb-20 text-foreground md:pb-0">
      <Navbar />

      <section id="home" className="scroll-mt-20">
        <div className="bg-[var(--bank-navy)] px-4 pb-10 pt-6 text-white md:hidden">
          <div className="mx-auto max-w-md space-y-6">
            <div className="inline-flex min-h-[36px] items-center gap-2 rounded-full border border-[var(--bank-gold)]/60 px-3 py-2 text-[12px] font-medium text-[var(--bank-gold)]">
              <span>Trusted Digital Banking</span>
            </div>
            <div className="space-y-3">
              <h1 className="text-[28px] font-semibold leading-[1.2] text-white" style={{ fontFamily: "Georgia, serif" }}>
                Bank smarter with <span className="text-[var(--bank-gold)]">{bankName}</span>
              </h1>
              <p className="text-[12px] leading-6 text-white/65">{tagline}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                className="min-h-[44px] rounded-full bg-[var(--bank-gold)] px-4 py-3 text-sm font-semibold text-[var(--bank-navy)]"
                onClick={() => {
                  window.location.href = "/auth";
                }}
              >
                Get Started
              </button>
              <button
                className="min-h-[44px] rounded-full border border-white/35 px-4 py-3 text-sm font-semibold text-white"
                onClick={() => document.getElementById("about")?.scrollIntoView({ behavior: "smooth" })}
              >
                Learn More
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-2xl bg-white/5 px-3 py-4">
                <p className="text-lg font-semibold text-[var(--bank-gold)]">50K+</p>
                <p className="mt-1 text-[11px] text-white/55">Customers</p>
              </div>
              <div className="rounded-2xl bg-white/5 px-3 py-4">
                <p className="text-lg font-semibold text-[var(--bank-gold)]">$84K</p>
                <p className="mt-1 text-[11px] text-white/55">Daily volume</p>
              </div>
              <div className="rounded-2xl bg-white/5 px-3 py-4">
                <p className="text-lg font-semibold text-[var(--bank-gold)]">24/7</p>
                <p className="mt-1 text-[11px] text-white/55">Access</p>
              </div>
            </div>
          </div>
        </div>

        <div className="hidden min-h-[calc(100vh-4rem)] md:grid md:grid-cols-2">
          <div className="theme-split-screen-hero-left flex flex-col justify-center px-8 py-12 md:px-16">
            <p className="mb-4 text-sm uppercase tracking-[0.2em] text-accent">
              Trusted Digital Banking
            </p>
            <h1 className="font-serif text-5xl leading-tight text-accent md:text-6xl">
              {bankName}
            </h1>
            <p className="mt-6 max-w-xl text-xl text-primary-foreground/90">{tagline}</p>
            <div className="mt-8 flex gap-4">
              <button className="rounded-md bg-accent px-6 py-3 font-medium text-primary">
                Get Started
              </button>
              <button className="rounded-md border border-primary-foreground/30 px-6 py-3 font-medium text-primary-foreground">
                Learn More
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center px-8 py-12">
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
              <p className="text-sm text-muted-foreground">Available Balance</p>
              <p className="mt-2 text-4xl font-bold text-card-foreground">$84,920.22</p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground">Income</p>
                  <p className="text-lg font-semibold text-emerald-600">+$12,400</p>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground">Expenses</p>
                  <p className="text-lg font-semibold text-rose-600">-$3,920</p>
                </div>
              </div>
              <div className="mt-5 rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Quick Transfer</p>
                <input className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Enter amount" />
              </div>
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

