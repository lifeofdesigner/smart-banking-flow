import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import heroImage from "@/assets/hero-banking.jpg";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useToast } from "@/hooks/use-toast";
import { signInWithIdentifier } from "@/lib/loginIdentifier";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DynamicHomepageSections from "@/components/DynamicHomepageSections";

type HomepageHeroRow = {
  title?: string | null;
  subtitle?: string | null;
  image?: string | null;
  content?: unknown;
};

const readContentField = (content: unknown, key: string) => {
  if (!content || typeof content !== "object") return "";
  const value = (content as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
};

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
    <form
      onSubmit={handleSubmit}
      className="w-full rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-2xl md:w-[320px]"
    >
      <p className="mb-4 text-sm font-semibold text-[#111827]">Log in to Internet Banking</p>
      <div className="space-y-3">
        <label className="block text-xs font-medium text-[#374151]">
          Email or Account Number
          <input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-[#d1d5db] px-3 text-sm outline-none focus:border-[var(--bank-public-navy)] focus:ring-1 focus:ring-[var(--bank-public-navy)]"
          />
        </label>
        <label className="block text-xs font-medium text-[#374151]">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-[#d1d5db] px-3 text-sm outline-none focus:border-[var(--bank-public-navy)] focus:ring-1 focus:ring-[var(--bank-public-navy)]"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="h-11 w-full rounded-lg bg-[var(--bank-public-navy)] text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Logging in..." : "Log in"}
        </button>
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 pt-1 text-xs font-medium text-[var(--bank-public-navy)]">
          <a href="/auth" className="hover:underline">Forgot user ID/password</a>
          <a href="/auth?tab=signup" className="hover:underline">Enroll</a>
        </div>
      </div>
      <a
        href="/auth?tab=signup"
        className="mt-4 flex h-11 w-full items-center gap-2 rounded-lg border border-[#e5e7eb] bg-[#f9fafb] px-3 text-xs font-semibold text-[#1f2937] transition hover:border-[var(--bank-public-navy)]"
      >
        <CheckCircle2 className="h-4 w-4 text-[var(--bank-public-navy)]" />
        Open an account
      </a>
    </form>
  );
}

export default function LandingWhiteBank() {
  const siteSettings = useSiteSettings();
  const [title, setTitle] = useState("Your Partner in Financial Growth");
  const [subtitle, setSubtitle] = useState(
    "Empowering individuals and businesses with accessible microfinance solutions — from everyday banking to loans, savings, and investing.",
  );
  const [heroImg, setHeroImg] = useState<string | null>(null);

  useEffect(() => {
    const loadHero = async () => {
      let result = await supabase
        .from("homepage_sections")
        .select("title, subtitle, image, content")
        .eq("section_type", "hero")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (result.error) {
        result = await supabase
          .from("homepage_sections")
          .select("title, subtitle, content")
          .eq("section_type", "hero")
          .eq("is_active", true)
          .order("display_order", { ascending: true })
          .limit(1)
          .maybeSingle();
      }

      const data = result.data as HomepageHeroRow | null;
      const headline = readContentField(data?.content, "headline");
      const subheadline = readContentField(data?.content, "subheadline");

      if (headline || data?.title) setTitle(headline || data?.title || "");
      if (subheadline || data?.subtitle) setSubtitle(subheadline || data?.subtitle || "");
      if (data?.image) setHeroImg(data.image);
    };

    loadHero();
  }, []);

  const badgeText = siteSettings.hero_badge_text || "Trusted by our customers";

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section className="relative overflow-hidden bg-[var(--bank-public-navy)]">
        <img src={heroImg || heroImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--bank-public-navy)] via-[var(--bank-public-navy)]/90 to-[var(--bank-public-navy)]/40" />

        <div className="relative mx-auto max-w-[1180px] px-4 py-14 md:px-6 md:py-24">
          <div className="max-w-xl space-y-6 text-white">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-xs font-semibold backdrop-blur-sm">
              <ShieldCheck className="h-3.5 w-3.5" />
              {badgeText}
            </div>
            <h1 className="text-4xl font-bold leading-tight md:text-5xl lg:text-6xl">{title}</h1>
            <p className="max-w-lg text-base leading-7 text-white/85 md:text-lg">{subtitle}</p>
            <div className="flex flex-wrap gap-3 pt-2">
              <a
                href="/auth?tab=signup"
                className="rounded-full bg-white px-7 py-3 text-sm font-semibold text-[var(--bank-public-navy)] shadow-sm transition hover:bg-white/90"
              >
                Open an Account
              </a>
              <a
                href="/about"
                className="rounded-full border border-white/40 px-7 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Learn More
              </a>
            </div>
          </div>

          <div className="mt-10 md:mt-14 md:flex md:justify-end">
            <LoginPanel />
          </div>
        </div>
      </section>

      <DynamicHomepageSections />

      <Footer />
    </div>
  );
}
