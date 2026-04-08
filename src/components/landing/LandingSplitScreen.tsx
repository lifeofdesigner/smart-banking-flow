import { useSiteSettings } from "@/hooks/useSiteSettings";

export default function LandingSplitScreen() {
  const siteSettings = useSiteSettings();
  const bankName = siteSettings.site_name || "Your Bank";
  const tagline = siteSettings.site_tagline || "Secure wealth management for modern life.";

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F4F5F7" }}>
      <nav className="border-b border-[#dfe3e8] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="text-lg font-semibold tracking-wide" style={{ color: "#0A1628" }}>
            {bankName}
          </div>
          <button className="rounded-md px-4 py-2 text-sm font-medium text-white" style={{ backgroundColor: "#0A1628" }}>
            Open Account
          </button>
        </div>
      </nav>

      <section className="grid min-h-[calc(100vh-4rem)] md:grid-cols-2">
        <div className="flex flex-col justify-center px-8 py-12 md:px-16" style={{ backgroundColor: "#0A1628" }}>
          <p className="mb-4 text-sm uppercase tracking-[0.2em]" style={{ color: "#C9A84C" }}>
            Trusted Digital Banking
          </p>
          <h1 className="font-serif text-5xl leading-tight md:text-6xl" style={{ color: "#C9A84C" }}>
            {bankName}
          </h1>
          <p className="mt-6 max-w-xl text-xl text-white/90">{tagline}</p>
          <div className="mt-8 flex gap-4">
            <button className="rounded-md px-6 py-3 font-medium text-[#0A1628]" style={{ backgroundColor: "#C9A84C" }}>
              Get Started
            </button>
            <button className="rounded-md border border-white/30 px-6 py-3 font-medium text-white">Learn More</button>
          </div>
        </div>

        <div className="flex items-center justify-center px-8 py-12">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <p className="text-sm text-slate-500">Available Balance</p>
            <p className="mt-2 text-4xl font-bold text-slate-900">$84,920.22</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-slate-100 p-3">
                <p className="text-xs text-slate-500">Income</p>
                <p className="text-lg font-semibold text-emerald-600">+$12,400</p>
              </div>
              <div className="rounded-lg bg-slate-100 p-3">
                <p className="text-xs text-slate-500">Expenses</p>
                <p className="text-lg font-semibold text-rose-600">-$3,920</p>
              </div>
            </div>
            <div className="mt-5 rounded-lg border border-slate-200 p-3">
              <p className="text-xs text-slate-500">Quick Transfer</p>
              <input className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Enter amount" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-6 py-14 md:grid-cols-3">
        {["Savings Accounts", "Investments", "Business Banking"].map((title) => (
          <div key={title} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm" style={{ borderTop: "4px solid #0A1628" }}>
            <h3 className="text-lg font-semibold text-[#0A1628]">{title}</h3>
            <p className="mt-2 text-sm text-slate-600">Banking products built with speed, transparency, and security.</p>
          </div>
        ))}
      </section>

      <section className="py-14" style={{ backgroundColor: "#0A1628" }}>
        <div className="mx-auto max-w-5xl px-6 text-center">
          <p className="text-4xl" style={{ color: "#C9A84C" }}>“</p>
          <p className="mt-2 text-xl text-white/90">{bankName} made our financial operations seamless and secure.</p>
          <p className="mt-4 text-sm uppercase tracking-wider" style={{ color: "#C9A84C" }}>
            CFO, Meridian Group
          </p>
        </div>
      </section>

      <footer className="border-t border-[#1f2b40] py-8" style={{ backgroundColor: "#0A1628" }}>
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-3 px-6 md:flex-row md:items-center">
          <p className="text-sm text-white/80">© {new Date().getFullYear()} {bankName}. All rights reserved.</p>
          <p className="text-sm" style={{ color: "#C9A84C" }}>
            Private Banking • Security • Growth
          </p>
        </div>
      </footer>
    </div>
  );
}

