import { useSiteSettings } from "@/hooks/useSiteSettings";

export default function LandingSoftModern() {
  const siteSettings = useSiteSettings();
  const bankName = siteSettings.site_name || "Your Bank";
  const tagline = siteSettings.site_tagline || "Effortless money management for everyone.";

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F0F4FF", color: "#1f2a44" }}>
      <nav className="sticky top-0 z-10 border-b border-indigo-100 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: "#4F46E5" }}>
              {bankName.charAt(0).toUpperCase()}
            </span>
            <span className="font-semibold text-indigo-900">{bankName}</span>
          </div>
          <button className="rounded-full px-5 py-2 text-sm font-medium text-white" style={{ backgroundColor: "#4F46E5" }}>
            Get Started
          </button>
        </div>
      </nav>

      <section className="mx-auto max-w-5xl px-6 py-16 text-center">
        <span className="rounded-full bg-white px-4 py-1 text-sm font-medium text-indigo-700 shadow-sm">Next-gen fintech platform</span>
        <h1 className="mt-6 text-5xl font-bold leading-tight md:text-6xl" style={{ color: "#4F46E5" }}>
          Banking that feels
          <br />
          beautifully simple.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-indigo-900/80">{tagline}</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button className="rounded-full px-6 py-3 font-semibold text-white" style={{ backgroundColor: "#4F46E5" }}>Open an account</button>
          <button className="rounded-full border border-indigo-200 bg-white px-6 py-3 font-semibold text-indigo-700">Explore features</button>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-14 md:grid-cols-3">
        <div className="rounded-2xl p-6 text-white shadow-md" style={{ backgroundColor: "#4F46E5" }}>
          <p className="text-sm text-indigo-100">Total Balance</p>
          <p className="mt-2 text-3xl font-bold">$56,230.00</p>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-md">
          <p className="text-sm text-indigo-500">Monthly Spend</p>
          <p className="mt-2 text-3xl font-bold text-indigo-900">$4,820</p>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-md">
          <p className="text-sm text-indigo-500">Savings Goal</p>
          <p className="mt-2 text-3xl font-bold text-indigo-900">78%</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-14">
        <div className="overflow-x-auto">
          <div className="flex min-w-max gap-4 pb-2">
            {["Global transfers", "Smart budgeting", "Virtual cards", "Round-up savings"].map((service) => (
              <div key={service} className="rounded-full bg-white px-5 py-3 text-sm font-medium text-indigo-700 shadow-sm">
                {service}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-14 md:grid-cols-3">
        {["Fast onboarding", "Love the card controls", "Best mobile experience"].map((quote, i) => (
          <div key={quote} className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-3 h-10 w-10 rounded-full bg-indigo-100" />
            <p className="text-sm text-indigo-900/80">“{quote}”</p>
            <p className="mt-3 text-xs text-indigo-500">Customer #{i + 1}</p>
          </div>
        ))}
      </section>

      <footer className="py-8" style={{ backgroundColor: "#EEF2FF", color: "#3730A3" }}>
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 text-sm md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} {bankName}. All rights reserved.</p>
          <p>Security • Simplicity • Speed</p>
        </div>
      </footer>
    </div>
  );
}

