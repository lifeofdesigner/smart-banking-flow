import { useSiteSettings } from "@/hooks/useSiteSettings";

export default function LandingGeometric() {
  const siteSettings = useSiteSettings();
  const bankName = (siteSettings.site_name || "Your Bank").toUpperCase();
  const tagline = siteSettings.site_tagline || "Structured products for steady financial progress.";

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <nav className="border-b-[3px] border-[#1E40AF] bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <span className="h-7 w-7 bg-[#1E40AF]" />
            <span className="text-sm font-bold tracking-widest text-[#1E40AF]">{bankName}</span>
          </div>
          <button className="rounded-md bg-[#1E40AF] px-4 py-2 text-sm font-medium text-white">Get Started</button>
        </div>
      </nav>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-16 md:grid-cols-2 md:items-center">
        <div>
          <h1 className="text-5xl font-bold leading-tight text-[#1E3A8A]">Corporate banking with geometric precision.</h1>
          <p className="mt-5 max-w-xl text-lg text-slate-600">{tagline}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button className="rounded-md bg-[#1E40AF] px-6 py-3 font-medium text-white">Open Account</button>
            <button className="rounded-md border border-[#1E40AF] px-6 py-3 font-medium text-[#1E40AF]">Talk to Advisor</button>
          </div>
          <div className="mt-8 flex items-end gap-2">
            <span className="h-3 w-3 rounded-full bg-[#1E40AF]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#3B82F6]" />
            <span className="h-2 w-2 rounded-full bg-[#93C5FD]" />
          </div>
        </div>

        <div className="relative h-72">
          <div className="absolute left-10 top-8 h-44 w-44 rounded-full bg-[#1E40AF]/15" />
          <div className="absolute left-28 top-16 h-48 w-48 rounded-full bg-[#3B82F6]/20" />
          <div className="absolute left-52 top-4 h-40 w-40 rounded-full bg-[#60A5FA]/20" />
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-0 px-6 md:grid-cols-3">
        {["Liquidity", "Payments", "Growth"].map((panel, idx) => (
          <div
            key={panel}
            className="p-6 text-white"
            style={{
              background: idx === 0 ? "#1E40AF" : idx === 1 ? "#2563EB" : "#3B82F6",
            }}
          >
            <p className="text-xs uppercase tracking-wider text-white/80">{panel}</p>
            <p className="mt-2 text-2xl font-bold">{idx === 0 ? "99.9%" : idx === 1 ? "24/7" : "+32%"}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-6 py-10 md:grid-cols-3">
        {["Treasury Services", "Trade Finance", "Risk Advisory"].map((service) => (
          <div key={service} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm" style={{ borderLeft: "4px solid #1E40AF" }}>
            <h3 className="font-semibold text-[#1E3A8A]">{service}</h3>
            <p className="mt-2 text-sm text-slate-600">Solutions engineered for enterprise-scale banking operations.</p>
          </div>
        ))}
      </section>

      <section className="mx-auto grid max-w-7xl overflow-hidden rounded-xl border border-slate-200 md:grid-cols-2">
        <div className="p-8 text-white" style={{ backgroundColor: "#1E40AF" }}>
          <h3 className="text-2xl font-semibold">About {bankName}</h3>
          <p className="mt-3 text-sm text-white/85">Trusted by institutions worldwide for resilient infrastructure and reliable support.</p>
        </div>
        <div className="bg-white p-8">
          <p className="text-sm text-slate-600">From payment rails to advanced treasury visibility, every module is designed for control and clarity.</p>
        </div>
      </section>

      <footer className="mt-10 py-8" style={{ backgroundColor: "#1E40AF" }}>
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 text-sm text-white md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} {bankName}. All rights reserved.</p>
          <p>Enterprise Banking Platform</p>
        </div>
      </footer>
    </div>
  );
}

