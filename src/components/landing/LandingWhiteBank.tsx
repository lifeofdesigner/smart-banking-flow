import {
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Globe2,
  HelpCircle,
  Landmark,
  LocateFixed,
  LockKeyhole,
  Menu,
  Phone,
  PiggyBank,
  Search,
  ShieldCheck,
  Smartphone,
  WalletCards,
} from "lucide-react";
import heroImage from "@/assets/hero-banking.jpg";
import servicesImage from "@/assets/services-icon.jpg";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const primaryLinks = ["Checking", "Savings & CDs", "Credit Cards", "Home Loans", "Auto Loans", "Investing"];
const utilityLinks = ["Security", "About Us", "Contact Us", "Help"];

const educationCards = [
  "Money habits that help you save more and spend with confidence",
  "How to choose a checking account that fits your daily routine",
  "Savings accounts and CDs: compare options before you decide",
  "Simple ways to protect your account from online fraud",
];

const connectCards = [
  { icon: CalendarDays, label: "Schedule an appointment" },
  { icon: LocateFixed, label: "Find a location" },
  { icon: Phone, label: "Contact us" },
  { icon: HelpCircle, label: "Help center" },
];

function LogoMark({ logoUrl, siteName }: { logoUrl?: string; siteName: string }) {
  if (logoUrl) {
    return (
      <div className="flex min-w-0 items-center gap-3">
        <img src={logoUrl} alt={siteName} className="h-10 max-w-[92px] object-contain md:h-11 md:max-w-[120px]" />
        <span className="max-w-[190px] truncate text-lg font-extrabold leading-tight text-[#003478] md:max-w-[260px] md:text-2xl">
          {siteName}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="grid h-10 w-10 place-items-center rounded bg-[#003478] text-base font-extrabold text-white md:h-11 md:w-11">
        {siteName.slice(0, 1).toUpperCase()}
      </div>
      <span className="max-w-[220px] truncate text-lg font-extrabold leading-tight text-[#003478] md:max-w-[320px] md:text-2xl">
        {siteName}
      </span>
    </div>
  );
}

function LoginPanel() {
  return (
    <div className="border border-[#d6dce5] bg-white p-4 shadow-sm md:w-[280px]">
      <div className="space-y-3">
        <label className="block text-[11px] font-semibold text-[#1f2937]">
          User ID
          <input className="mt-1 h-9 w-full border border-[#aeb7c2] px-2 text-sm outline-none focus:border-[#003478]" />
        </label>
        <label className="block text-[11px] font-semibold text-[#1f2937]">
          Password
          <input type="password" className="mt-1 h-9 w-full border border-[#aeb7c2] px-2 text-sm outline-none focus:border-[#003478]" />
        </label>
        <label className="flex items-center gap-2 text-xs text-[#4b5563]">
          <input type="checkbox" className="h-4 w-4 border-[#aeb7c2]" />
          Save user ID
        </label>
        <button
          type="button"
          onClick={() => {
            window.location.href = "/auth";
          }}
          className="h-10 w-full rounded-full bg-[#003478] text-sm font-semibold text-white transition hover:bg-[#05285b]"
        >
          Log in
        </button>
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] font-semibold text-[#0057a8]">
          <a href="/auth">Forgot user ID/password</a>
          <a href="/auth">Enroll</a>
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          window.location.href = "/auth";
        }}
        className="mt-4 flex h-10 w-full items-center gap-2 border border-[#d6dce5] bg-white px-3 text-left text-xs font-semibold text-[#1f2937]"
      >
        <CheckCircle2 className="h-4 w-4 text-[#003478]" />
        Open an account
      </button>
    </div>
  );
}

function OfferTile({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof CreditCard;
  title: string;
  text: string;
}) {
  return (
    <article className="border-b border-[#d6dce5] bg-white p-5 md:border-b-0 md:border-r">
      <Icon className="mb-4 h-9 w-9 text-[#c41230]" strokeWidth={1.8} />
      <h3 className="text-sm font-semibold text-[#c41230]">{title}</h3>
      <p className="mt-2 min-h-[52px] text-xs leading-5 text-[#374151]">{text}</p>
      <a href="/auth" className="mt-3 inline-block text-xs font-semibold text-[#0057a8]">
        See details
      </a>
    </article>
  );
}

export default function LandingWhiteBank() {
  const siteSettings = useSiteSettings();
  const siteName = siteSettings.site_name || "MicroFinance Bank";
  const logoUrl = siteSettings.mobile_logo_url || siteSettings.site_logo_url;
  const tagline = siteSettings.site_tagline || "Your partner in financial growth";
  const supportPhone = siteSettings.support_phone || "Contact us";

  return (
    <div className="min-h-screen bg-white pb-20 text-[#1f2937] md:pb-0">
      <header className="sticky top-0 z-40 border-b border-[#d8dde6] bg-white">
        <div className="bg-[#f4f5f7] text-[10px] text-[#4b5563]">
          <div className="mx-auto flex max-w-[1180px] items-center justify-center gap-2 px-4 py-1.5 md:justify-start">
            <span>{siteName} deposit products:</span>
            <strong className="text-[#003478]">NDIC</strong>
            <span>insured and protected for eligible customers</span>
          </div>
        </div>

        <div className="mx-auto hidden max-w-[1180px] items-center justify-between px-4 py-2 text-xs md:flex">
          <nav className="flex gap-7 text-[#334155]">
            <a href="#home" className="font-semibold text-[#003478]">Personal</a>
            <a href="#services">Wealth Management</a>
            <a href="#products">Business</a>
            <a href="#about">Corporations & Institutions</a>
          </nav>
          <nav className="flex items-center gap-5 text-[#334155]">
            {utilityLinks.map((link) => (
              <a key={link} href={link === "Contact Us" ? "#contact" : "#about"}>{link}</a>
            ))}
            <span className="flex items-center gap-1"><Globe2 className="h-3.5 w-3.5" /> En espanol</span>
          </nav>
        </div>

        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button type="button" className="grid h-10 w-10 place-items-center border border-[#d8dde6] md:hidden" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </button>
            <LogoMark logoUrl={logoUrl} siteName={siteName} />
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <div className="flex h-9 w-[260px] items-center border border-[#aeb7c2] bg-white px-3">
              <input placeholder="Search" className="w-full text-sm outline-none" />
              <Search className="h-4 w-4 text-[#6b7280]" />
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              window.location.href = "/auth";
            }}
            className="rounded-full bg-[#003478] px-4 py-2 text-xs font-semibold text-white md:hidden"
          >
            Login
          </button>
        </div>

        <nav className="mx-auto hidden max-w-[1180px] items-center gap-8 border-t border-[#e6eaf0] px-4 py-3 text-sm text-[#334155] md:flex">
          {primaryLinks.map((link) => (
            <a key={link} href={link === "Investing" ? "#about" : "#services"} className="flex items-center gap-1">
              {link}
              <ChevronDown className="h-3.5 w-3.5" />
            </a>
          ))}
        </nav>
      </header>

      <main id="home" className="mx-auto max-w-[1180px] px-4 md:px-6">
        <section className="grid bg-[#07111e] md:grid-cols-[280px_1fr]">
          <div className="order-2 bg-white p-3 md:order-1 md:bg-[#07111e]">
            <LoginPanel />
          </div>
          <div className="relative order-1 min-h-[330px] overflow-hidden md:order-2 md:min-h-[390px]">
            <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#07111e] via-[#07111e]/78 to-transparent" />
            <div className="relative z-10 max-w-[460px] px-6 py-10 text-white md:px-10 md:py-14">
              <p className="text-[34px] font-semibold leading-none md:text-[52px]">
                {siteName}
                <span className="block text-[#f3f4f6]">Rewards</span>
              </p>
              <p className="mt-5 max-w-[360px] text-sm leading-6 text-white/88">
                {tagline}. Get rewarded for every ambition, from saving more to building a stronger business.
              </p>
              <button
                type="button"
                onClick={() => {
                  window.location.href = "/auth";
                }}
                className="mt-6 rounded-full bg-[#003478] px-6 py-3 text-sm font-semibold text-white hover:bg-[#05285b]"
              >
                Get started
              </button>
            </div>
          </div>
        </section>

        <section id="services" className="grid md:grid-cols-[1fr_1fr]">
          <div className="grid bg-[#eaf2ff] p-5 md:grid-cols-2 md:p-6">
            <div className="bg-white p-5">
              <p className="text-[11px] font-semibold uppercase text-[#4b5563]">New checking customers</p>
              <h2 className="mt-2 text-lg font-semibold text-[#c41230]">Cash offer up to $500</h2>
              <p className="mt-2 text-xs leading-5 text-[#374151]">Start by opening a new eligible checking account.</p>
              <a href="/auth" className="mt-4 inline-block text-xs font-semibold text-[#0057a8]">See details</a>
            </div>
            <div className="grid place-items-center py-6 text-center">
              <p className="text-3xl font-light text-[#406bd6]">$100</p>
              <p className="text-xs text-[#406bd6]">cash offer</p>
              <p className="mt-2 text-4xl font-light text-[#2856c9]">$300</p>
              <p className="text-xs text-[#406bd6]">cash offer</p>
              <p className="mt-2 text-6xl font-light text-[#003478]">$500</p>
              <p className="text-sm text-[#003478]">cash offer</p>
            </div>
          </div>
          <div className="relative min-h-[220px] overflow-hidden">
            <img src={servicesImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-white/25" />
            <div className="relative m-5 max-w-[270px] bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-[#c41230]">Community banking in motion</h2>
              <p className="mt-2 text-xs leading-5 text-[#374151]">Financial tools, support, and guidance for customers and local businesses.</p>
              <a href="#about" className="mt-3 inline-block text-xs font-semibold text-[#0057a8]">Get involved</a>
            </div>
          </div>
        </section>

        <section id="products" className="grid border-x border-b border-[#d6dce5] bg-white md:grid-cols-4">
          <OfferTile icon={CreditCard} title="Customized cash back offer" text="Earn rewards on everyday purchases with card options built around your needs." />
          <OfferTile icon={WalletCards} title="Cash offer up to $500" text="Open an eligible checking account and complete qualifying activities." />
          <OfferTile icon={Bell} title="Custom mobile alerts" text="Prioritize what you see based on the account moments that matter most." />
          <OfferTile icon={Landmark} title="Investment solutions" text="Tools and guidance that help you pursue long-term financial goals." />
        </section>

        <section id="about" className="py-10 text-center md:py-14">
          <h2 className="text-2xl font-normal text-[#374151] md:text-3xl">Your financial goals matter</h2>
          <p className="mx-auto mt-3 max-w-3xl text-sm leading-6 text-[#374151]">
            We can help you achieve them through education, digital tools, and banking programs that make communities stronger.
          </p>
          <div className="mt-8 grid gap-3 md:grid-cols-4">
            {educationCards.map((title, index) => (
              <article key={title} className="relative min-h-[170px] overflow-hidden text-left">
                <img src={index % 2 === 0 ? servicesImage : heroImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-white/35" />
                <div className="absolute bottom-4 left-4 right-4 border border-[#d6dce5] bg-white p-3 text-xs font-semibold leading-5 text-[#0057a8] shadow-sm">
                  {title}
                </div>
              </article>
            ))}
          </div>
          <p className="mt-8 text-sm text-[#374151]">Explore more topics and build your financial know-how.</p>
          <a href="#services" className="mt-4 inline-block rounded-full bg-[#003478] px-6 py-2 text-sm font-semibold text-white">
            Visit financial education
          </a>
        </section>

        <section className="py-8 md:py-12">
          <h2 className="text-center text-2xl font-normal text-[#374151] md:text-3xl">Your news and information</h2>
          <div className="mt-8 grid items-center gap-8 md:grid-cols-2">
            <div className="space-y-4 md:pl-8">
              <h3 className="text-xl font-normal text-[#374151]">Level up your account security</h3>
              <p className="max-w-lg text-sm leading-7 text-[#4b5563]">
                Watch your security meter rise as you take action to help protect against fraud from online and mobile banking.
              </p>
              <a href="/auth" className="inline-block rounded-full bg-[#c41230] px-6 py-2 text-sm font-semibold text-white">Check your level</a>
            </div>
            <div className="mx-auto grid h-[250px] w-[150px] place-items-center rounded-[2rem] border-[10px] border-[#111827] bg-white shadow-xl">
              <ShieldCheck className="h-16 w-16 text-[#3a8b2e]" />
              <p className="px-4 text-center text-xs font-semibold text-[#374151]">Advanced security preferences</p>
            </div>
          </div>
          <div className="mt-8 grid overflow-hidden bg-[#003478] text-white md:grid-cols-[1fr_300px]">
            <div className="p-8 md:p-12">
              <h3 className="text-xl font-normal">Convenient banking with our Mobile app</h3>
              <a href="/auth" className="mt-6 inline-block rounded-full bg-white px-6 py-2 text-sm font-semibold text-[#003478]">Explore our app</a>
            </div>
            <div className="hidden items-end justify-center bg-[#0b57b7] md:flex">
              <Smartphone className="mb-10 h-28 w-28 text-white/85" />
            </div>
          </div>
        </section>

        <section id="contact" className="py-10 text-center">
          <h2 className="text-3xl font-normal text-[#374151]">Connect with us</h2>
          <div className="mx-auto mt-7 grid max-w-[920px] gap-3 md:grid-cols-4">
            {connectCards.map((card) => {
              const Icon = card.icon;
              return (
                <a
                  key={card.label}
                  href={card.label === "Contact us" ? `tel:${supportPhone}` : "#contact"}
                  className="grid min-h-[120px] place-items-center border border-[#d6dce5] bg-white p-5 text-xs font-semibold text-[#0057a8] shadow-sm transition hover:border-[#0057a8]"
                >
                  <span className="grid gap-3 place-items-center">
                    <Icon className="h-6 w-6 text-[#6b7280]" />
                    {card.label}
                  </span>
                </a>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="bg-[#f4f5f7] text-[#4b5563]">
        <div className="mx-auto max-w-[1180px] px-4 py-6 text-[11px] leading-6">
          <p className="mb-3 font-semibold">Investment and insurance products:</p>
          <div className="grid border border-[#b8c0cc] bg-white text-center font-semibold md:grid-cols-3">
            {["Are Not NDIC Insured", "Are Not Bank Guaranteed", "May Lose Value", "Are Not Deposits", "Are Not Insured by Any Government Agency", "Are Not a Condition to Any Banking Service"].map((item) => (
              <div key={item} className="border-b border-r border-[#b8c0cc] p-4">{item}</div>
            ))}
          </div>
          <p className="mt-5">
            Banking, credit card, automobile loans, mortgage and home equity products are provided by {siteName}. Terms, conditions, and eligibility apply.
          </p>
          <p className="mt-3">
            This page is designed for public banking information and online service access. Review all product details before opening an account.
          </p>
        </div>
        <div className="bg-[#003478] px-4 py-8 text-center text-xs text-white">
          <div className="mx-auto flex max-w-[900px] flex-wrap justify-center gap-x-5 gap-y-2">
            {["Locations", "Contact Us", "Help & Support", "Privacy", "Security", "Online Banking Agreement", "Site Map"].map((link) => (
              <a key={link} href="#contact" className="hover:underline">{link}</a>
            ))}
          </div>
          <div className="mt-6 flex justify-center gap-4">
            {[Building2, Globe2, LockKeyhole, PiggyBank].map((Icon, index) => (
              <span key={index} className="grid h-8 w-8 place-items-center rounded-full border border-white/40">
                <Icon className="h-4 w-4" />
              </span>
            ))}
          </div>
          <p className="mt-5">{siteName}. Equal Housing Lender. Copyright {new Date().getFullYear()}.</p>
        </div>
      </footer>
    </div>
  );
}
