import { useSiteSettings } from "@/hooks/useSiteSettings";

export default function LandingCinematic() {
  const siteSettings = useSiteSettings();
  const bankName = siteSettings.site_name || "Your Bank";
  const tagline = siteSettings.site_tagline || "Designed for timeless financial confidence.";

  return (
    <div className="min-h-screen overflow-hidden" style={{ backgroundColor: "#1a1a2e", color: "#f3f3f1" }}>
      <section className="relative border-b border-white/10">
        <div className="pointer-events-none absolute -left-24 top-16 h-64 w-64 rounded-full border border-[#D4AF37]/30" />
        <div className="pointer-events-none absolute right-10 top-24 h-40 w-40 rounded-full border border-[#D4AF37]/20" />
        <div className="pointer-events-none absolute bottom-8 left-1/3 h-24 w-24 rounded-full border border-[#D4AF37]/20" />

        <nav className="relative z-10 bg-transparent">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
            <p className="font-serif text-2xl tracking-wide">{bankName}</p>
            <button className="rounded px-4 py-2 text-sm font-medium" style={{ backgroundColor: "#D4AF37", color: "#1a1a2e" }}>
              Private Access
            </button>
          </div>
        </nav>

        <div className="relative z-10 mx-auto max-w-6xl px-6 pb-20 pt-12 md:pt-20">
          <h1 className="max-w-4xl font-serif text-5xl font-light leading-tight md:text-7xl">
            Premium digital banking,
            <span className="ml-3 italic" style={{ color: "#D4AF37" }}>
              reimagined
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-white/80">{tagline}</p>
          <button className="mt-8 rounded-md px-6 py-3 font-semibold" style={{ backgroundColor: "#D4AF37", color: "#1a1a2e" }}>
            Start Your Journey
          </button>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl divide-x divide-white/10 px-6 py-10 md:grid-cols-4">
        {[["$5.8B", "Assets managed"], ["120+", "Global offices"], ["4.9/5", "Client rating"], ["24/7", "Concierge"]].map(([v, l]) => (
          <div key={l} className="px-4 py-3">
            <p className="text-3xl font-semibold" style={{ color: "#D4AF37" }}>{v}</p>
            <p className="mt-1 text-sm text-white/70">{l}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-6 py-10 md:grid-cols-3">
        {["Wealth Planning", "Corporate Treasury", "International Banking"].map((item) => (
          <div key={item} className="rounded-lg border border-white/10 bg-[#20203a] p-6" style={{ borderLeft: "4px solid #D4AF37" }}>
            <h3 className="font-serif text-2xl">{item}</h3>
            <p className="mt-3 text-sm text-white/70">Tailored strategies and premium support for complex financial needs.</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="rounded-xl border border-white/10 bg-[#20203a] p-8 text-center">
          <p className="text-4xl" style={{ color: "#D4AF37" }}>“</p>
          <p className="mt-2 text-lg text-white/85">{bankName} consistently delivers world-class service and discretion.</p>
        </div>
      </section>

      <footer className="py-8" style={{ backgroundColor: "#0F0F1A" }}>
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 text-sm md:flex-row md:items-center md:justify-between">
          <p className="text-white/70">© {new Date().getFullYear()} {bankName}. All rights reserved.</p>
          <p style={{ color: "#D4AF37" }}>Luxury • Legacy • Security</p>
        </div>
      </footer>
    </div>
  );
}

