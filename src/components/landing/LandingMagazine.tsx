import { useSiteSettings } from "@/hooks/useSiteSettings";

export default function LandingMagazine() {
  const siteSettings = useSiteSettings();
  const bankName = (siteSettings.site_name || "Your Bank").toUpperCase();
  const tagline = siteSettings.site_tagline || "Where finance meets editorial precision.";

  return (
    <div className="min-h-screen bg-white text-black">
      <nav className="border-b-4 border-black bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <p className="text-xl font-black tracking-widest">{bankName}</p>
          <button className="border-2 border-black px-4 py-2 text-sm font-bold uppercase">Sign In</button>
        </div>
      </nav>

      <section className="mx-auto max-w-7xl border-b-4 border-black px-6 py-16">
        <p className="text-sm font-bold uppercase tracking-wider text-[#E53E3E]">Issue 01 • Finance Forward</p>
        <h1 className="mt-6 text-[clamp(2.5rem,8vw,6rem)] font-black leading-[0.9]">
          THE FUTURE
          <br />
          OF DIGITAL
          <br />
          <span className="text-white" style={{ WebkitTextStroke: "2px #000" }}>
            BANKING
          </span>
        </h1>
        <p className="mt-6 max-w-3xl text-lg text-zinc-700">{tagline}</p>
      </section>

      <section className="mx-auto grid max-w-7xl border-b-4 border-black md:grid-cols-4">
        {[
          ["$2.4B", "Transactions"],
          ["320K", "Customers"],
          ["99.99%", "Uptime"],
          ["24/7", "Support"],
        ].map(([value, label]) => (
          <div key={label} className="border-r-4 border-black p-6 last:border-r-0">
            <p className="text-3xl font-black">{value}</p>
            <p className="mt-2 text-xs uppercase tracking-widest text-zinc-600">{label}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto grid max-w-7xl gap-0 px-0 md:grid-cols-3">
        {["Personal Banking", "Commercial Banking", "Investment Services"].map((item, idx) => (
          <article
            key={item}
            className={`border-b-4 border-t-8 border-black p-8 ${idx % 2 === 1 ? "bg-black text-white" : "bg-white text-black"}`}
          >
            <h3 className="text-2xl font-black uppercase">{item}</h3>
            <p className="mt-4 text-sm opacity-80">Deeply researched products for ambitious clients and institutions.</p>
          </article>
        ))}
      </section>

      <footer className="bg-black py-10 text-white">
        <div className="mx-auto max-w-7xl px-6">
          <p className="text-sm uppercase tracking-wider">{bankName} Financial Review</p>
          <p className="mt-2 text-xs text-zinc-400">© {new Date().getFullYear()} {bankName}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

