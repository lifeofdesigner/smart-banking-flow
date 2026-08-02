import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Globe2,
  HelpCircle,
  Landmark,
  LocateFixed,
  LockKeyhole,
  Phone,
  PiggyBank,
  ShieldCheck,
  Smartphone,
  WalletCards,
} from "lucide-react";
import heroImage from "@/assets/hero-banking.jpg";
import servicesImage from "@/assets/services-icon.jpg";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useToast } from "@/hooks/use-toast";
import { signInWithIdentifier } from "@/lib/loginIdentifier";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const educationCards = [
  "Money habits that help you save more and spend with confidence",
  "How to choose a checking account that fits your daily routine",
  "Savings accounts and CDs: compare options before you decide",
  "Simple ways to protect your account from online fraud",
];

const connectCards = [
  { icon: CalendarDays, label: "Schedule an appointment", href: "/contact" },
  { icon: LocateFixed, label: "Find a location", href: "/contact" },
  { icon: Phone, label: "Contact us", href: "/contact" },
  { icon: HelpCircle, label: "Help center", href: "/contact" },
];

function LoginPanel() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) return;

    setLoading(true);
    try {
      const { error } = await signInWithIdentifier(identifier, password);
      if (error) {
        toast({
          title: "Login failed",
          description: "Please check your email/account number and password.",
          variant: "destructive",
        });
        return;
      }

      navigate("/dashboard", { replace: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border border-[#d6dce5] bg-white p-4 shadow-sm md:w-[280px]">
      <div className="space-y-3">
        <label className="block text-[11px] font-semibold text-[#1f2937]">
          Email or Account Number
          <input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="mt-1 h-9 w-full border border-[#aeb7c2] px-2 text-sm outline-none focus:border-[var(--bank-public-navy)]"
          />
        </label>
        <label className="block text-[11px] font-semibold text-[#1f2937]">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 h-9 w-full border border-[#aeb7c2] px-2 text-sm outline-none focus:border-[var(--bank-public-navy)]"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="h-10 w-full rounded-full bg-[var(--bank-public-navy)] text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Logging in..." : "Log in"}
        </button>
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] font-semibold text-[#0057a8]">
          <a href="/auth">Forgot user ID/password</a>
          <a href="/auth?tab=signup">Enroll</a>
        </div>
      </div>
      <a
        href="/auth?tab=signup"
        className="mt-4 flex h-10 w-full items-center gap-2 border border-[#d6dce5] bg-white px-3 text-left text-xs font-semibold text-[#1f2937]"
      >
        <CheckCircle2 className="h-4 w-4 text-[var(--bank-public-navy)]" />
        Open an account
      </a>
    </form>
  );
}

function OfferTile({
  icon: Icon,
  title,
  text,
  href,
}: {
  icon: typeof CreditCard;
  title: string;
  text: string;
  href: string;
}) {
  return (
    <article className="border-b border-[#d6dce5] bg-white p-5 md:border-b-0 md:border-r">
      <Icon className="mb-4 h-9 w-9 text-[var(--bank-public-accent)]" strokeWidth={1.8} />
      <h3 className="text-sm font-semibold text-[var(--bank-public-accent)]">{title}</h3>
      <p className="mt-2 min-h-[52px] text-xs leading-5 text-[#374151]">{text}</p>
      <a href={href} className="mt-3 inline-block text-xs font-semibold text-[#0057a8]">
        See details
      </a>
    </article>
  );
}

export default function LandingWhiteBank() {
  const siteSettings = useSiteSettings();
  const siteName = siteSettings.site_name || "MicroFinance Bank";
  const tagline = siteSettings.site_tagline || "Your partner in financial growth";
  const supportPhone = siteSettings.support_phone || "Contact us";

  return (
    <div className="min-h-screen bg-white text-[#1f2937]">
      <Navbar />

      <main className="mx-auto max-w-[1180px] px-4 md:px-6">
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
              <a
                href="/auth?tab=signup"
                className="mt-6 inline-block rounded-full bg-[var(--bank-public-navy)] px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
              >
                Get started
              </a>
            </div>
          </div>
        </section>

        <section className="grid md:grid-cols-[1fr_1fr]">
          <div className="grid bg-[#eaf2ff] p-5 md:grid-cols-2 md:p-6">
            <div className="bg-white p-5">
              <p className="text-[11px] font-semibold uppercase text-[#4b5563]">New checking customers</p>
              <h2 className="mt-2 text-lg font-semibold text-[var(--bank-public-accent)]">Cash offer up to $500</h2>
              <p className="mt-2 text-xs leading-5 text-[#374151]">Start by opening a new eligible checking account.</p>
              <a href="/products/checking" className="mt-4 inline-block text-xs font-semibold text-[#0057a8]">See details</a>
            </div>
            <div className="grid place-items-center py-6 text-center">
              <p className="text-3xl font-light text-[#406bd6]">$100</p>
              <p className="text-xs text-[#406bd6]">cash offer</p>
              <p className="mt-2 text-4xl font-light text-[#2856c9]">$300</p>
              <p className="text-xs text-[#406bd6]">cash offer</p>
              <p className="mt-2 text-6xl font-light text-[var(--bank-public-navy)]">$500</p>
              <p className="text-sm text-[var(--bank-public-navy)]">cash offer</p>
            </div>
          </div>
          <div className="relative min-h-[220px] overflow-hidden">
            <img src={servicesImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-white/25" />
            <div className="relative m-5 max-w-[270px] bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-[var(--bank-public-accent)]">Community banking in motion</h2>
              <p className="mt-2 text-xs leading-5 text-[#374151]">Financial tools, support, and guidance for customers and local businesses.</p>
              <a href="/about" className="mt-3 inline-block text-xs font-semibold text-[#0057a8]">Get involved</a>
            </div>
          </div>
        </section>

        <section className="grid border-x border-b border-[#d6dce5] bg-white md:grid-cols-4">
          <OfferTile icon={CreditCard} title="Customized cash back offer" text="Earn rewards on everyday purchases with card options built around your needs." href="/products/cards" />
          <OfferTile icon={WalletCards} title="Cash offer up to $500" text="Open an eligible checking account and complete qualifying activities." href="/products/checking" />
          <OfferTile icon={Bell} title="Custom mobile alerts" text="Prioritize what you see based on the account moments that matter most." href="/auth" />
          <OfferTile icon={Landmark} title="Investment solutions" text="Tools and guidance that help you pursue long-term financial goals." href="/products/investments" />
        </section>

        <section className="py-10 text-center md:py-14">
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
          <a href="/about" className="mt-4 inline-block rounded-full bg-[var(--bank-public-navy)] px-6 py-2 text-sm font-semibold text-white">
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
              <a href="/auth" className="inline-block rounded-full bg-[var(--bank-public-accent)] px-6 py-2 text-sm font-semibold text-white">Check your level</a>
            </div>
            <div className="mx-auto grid h-[250px] w-[150px] place-items-center rounded-[2rem] border-[10px] border-[#111827] bg-white shadow-xl">
              <ShieldCheck className="h-16 w-16 text-[#3a8b2e]" />
              <p className="px-4 text-center text-xs font-semibold text-[#374151]">Advanced security preferences</p>
            </div>
          </div>
          <div className="mt-8 grid overflow-hidden bg-[var(--bank-public-navy)] text-white md:grid-cols-[1fr_300px]">
            <div className="p-8 md:p-12">
              <h3 className="text-xl font-normal">Convenient banking with our Mobile app</h3>
              <a href="/auth" className="mt-6 inline-block rounded-full bg-white px-6 py-2 text-sm font-semibold text-[var(--bank-public-navy)]">Explore our app</a>
            </div>
            <div className="hidden items-end justify-center bg-[#0b57b7] md:flex">
              <Smartphone className="mb-10 h-28 w-28 text-white/85" />
            </div>
          </div>
        </section>

        <section className="py-10 text-center">
          <h2 className="text-3xl font-normal text-[#374151]">Connect with us</h2>
          <div className="mx-auto mt-7 grid max-w-[920px] gap-3 md:grid-cols-4">
            {connectCards.map((card) => {
              const Icon = card.icon;
              return (
                <a
                  key={card.label}
                  href={card.label === "Contact us" ? `tel:${supportPhone}` : card.href}
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

      <div className="bg-[#f4f5f7] text-[#4b5563]">
        <div className="mx-auto max-w-[1180px] px-4 py-6 text-[11px] leading-6">
          <p className="mb-3 font-semibold">Investment and insurance products:</p>
          <div className="grid border border-[#b8c0cc] bg-white text-center font-semibold md:grid-cols-3">
            {["Not Insured by Deposit Insurance", "Not Bank Guaranteed", "May Lose Value", "Not Deposits", "Not Insured by Any Government Agency", "Not a Condition to Any Banking Service"].map((item) => (
              <div key={item} className="border-b border-r border-[#b8c0cc] p-4">{item}</div>
            ))}
          </div>
          <p className="mt-5">
            Banking, credit card, automobile loans, mortgage and home equity products are provided by {siteName}. Terms, conditions, and eligibility apply.
          </p>
        </div>
        <div className="bg-[var(--bank-public-navy)] px-4 py-6 text-center text-xs text-white">
          <div className="flex justify-center gap-4">
            {[Building2, Globe2, LockKeyhole, PiggyBank].map((Icon, index) => (
              <span key={index} className="grid h-8 w-8 place-items-center rounded-full border border-white/40">
                <Icon className="h-4 w-4" />
              </span>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
