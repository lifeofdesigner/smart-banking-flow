import { useSiteSettings } from "@/hooks/useSiteSettings";

export default function LandingDashboardApp() {
  const siteSettings = useSiteSettings();
  const bankName = siteSettings.site_name || "Your Bank";
  const tagline = siteSettings.site_tagline || "A powerful banking app for daily money flow.";

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#22C55E" }} />
            <span className="font-semibold">{bankName}</span>
          </div>
          <button className="rounded-md px-4 py-2 text-sm font-medium text-white" style={{ backgroundColor: "#22C55E" }}>
            Launch App
          </button>
        </div>
      </nav>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-16 md:grid-cols-2 md:items-center">
        <div>
          <h1 className="text-5xl font-bold leading-tight">Control your finances with one clean dashboard.</h1>
          <p className="mt-5 text-lg text-slate-600">{tagline}</p>
          <div className="mt-8 flex gap-3">
            <button className="rounded-md px-6 py-3 font-medium text-white" style={{ backgroundColor: "#22C55E" }}>Open Account</button>
            <button className="rounded-md border border-slate-300 px-6 py-3 font-medium">View Demo</button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-lg">
          <div className="rounded-xl bg-[#111827] p-5 text-white">
            <p className="text-xs text-slate-300">Current Balance</p>
            <p className="mt-2 text-3xl font-bold">$19,840.55</p>
            <div className="mt-4 rounded-lg p-3" style={{ backgroundColor: "#22C55E" }}>
              <p className="text-xs text-emerald-100">Income this month</p>
              <p className="text-xl font-semibold">+$3,400</p>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {['Send', 'Request', 'Cards'].map((action) => (
                <button key={action} className="rounded bg-white/10 px-2 py-2 text-xs hover:bg-white/20">{action}</button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-6 py-8 md:grid-cols-3">
        {["Instant Transfers", "Virtual Cards", "Spending Analytics"].map((s, i) => (
          <div key={s} className={`rounded-lg p-6 ${i % 2 === 0 ? "bg-[#111827] text-white" : "text-[#111827]"}`} style={i % 2 === 1 ? { backgroundColor: "#22C55E" } : undefined}>
            <h3 className="text-lg font-semibold">{s}</h3>
            <p className="mt-2 text-sm opacity-90">Built for fast-moving personal and business banking workflows.</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <h2 className="text-2xl font-bold">How it works</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {["Create account", "Connect funds", "Start transacting"].map((step, idx) => (
            <div key={step} className="rounded-lg border border-slate-200 p-5">
              <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full font-semibold text-white" style={{ backgroundColor: "#22C55E" }}>
                {idx + 1}
              </div>
              <p className="font-medium">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mt-8 py-8" style={{ backgroundColor: "#111827" }}>
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 text-sm text-white md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} {bankName}. All rights reserved.</p>
          <p style={{ color: "#22C55E" }}>Secure • Fast • Transparent</p>
        </div>
      </footer>
    </div>
  );
}

