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
  image_alt?: string | null;
  content?: unknown;
};

const readContentField = (content: unknown, key: string) => {
  if (!content || typeof content !== "object") return "";
  const value = (content as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
};

type HeroSlide = { image: string; alt: string };

const readContentSlides = (content: unknown): HeroSlide[] => {
  if (!content || typeof content !== "object") return [];
  const value = (content as Record<string, unknown>).slides;
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      image: typeof item.image === "string" ? item.image : "",
      alt: typeof item.image_alt === "string" ? item.image_alt : "",
    }))
    .filter((slide) => slide.image);
};

type CachedHero = {
  title: string;
  subtitle: string;
  slides: HeroSlide[];
  ctaPrimary: string;
  ctaPrimaryLink: string;
  ctaSecondary: string;
  ctaSecondaryLink: string;
};

const HERO_CACHE_KEY = "cached-hero-content";

// Same first-paint problem as site_settings: the hero always starts from
// hardcoded English copy + no image while the DB fetch is in flight, so on
// every navigation the real headline/CTA/background image visibly pops in
// a moment later. Caching the last-fetched hero to localStorage lets the
// very first render already show the real content; the network fetch
// still always runs and silently corrects it if anything changed.
const readHeroCache = (): CachedHero | null => {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(HERO_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeHeroCache = (hero: CachedHero) => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(HERO_CACHE_KEY, JSON.stringify(hero));
  } catch {
    // First-paint optimization only -- ignore storage failures.
  }
};

const SLIDE_INTERVAL_MS = 6000;

/** Crossfades between one or more background images. A single slide (or
 * none yet, before the DB fetch resolves) just renders as a static image —
 * no timer, no visible transition. */
function HeroSlideshow({ slides }: { slides: HeroSlide[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const resolvedSlides = slides.length > 0 ? slides : [{ image: heroImage, alt: "" }];

  useEffect(() => {
    setActiveIndex(0);
    if (resolvedSlides.length < 2) return;

    const timer = setInterval(() => {
      setActiveIndex((current) => (current + 1) % resolvedSlides.length);
    }, SLIDE_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [resolvedSlides.length]);

  return (
    <>
      {resolvedSlides.map((slide, index) => (
        <img
          key={`${slide.image}-${index}`}
          src={slide.image}
          alt={slide.alt}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-in-out ${
            index === activeIndex ? "opacity-90" : "opacity-0"
          }`}
        />
      ))}
    </>
  );
}

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

      // Route through /auth rather than straight to /dashboard: that page's
      // own session-check decides whether this account still owes a
      // sign-in PIN and shows that step, instead of duplicating the check
      // here and risking it drifting out of sync.
      navigate("/auth", { replace: true });
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
  const [heroCache] = useState(() => readHeroCache());
  const [title, setTitle] = useState(heroCache?.title || "Your Partner in Financial Growth");
  const [subtitle, setSubtitle] = useState(
    heroCache?.subtitle
      || "Empowering individuals and businesses with accessible microfinance solutions — from everyday banking to loans, savings, and investing.",
  );
  const [slides, setSlides] = useState<HeroSlide[]>(heroCache?.slides || []);
  const [ctaPrimary, setCtaPrimary] = useState(heroCache?.ctaPrimary || "Open an Account");
  const [ctaPrimaryLink, setCtaPrimaryLink] = useState(heroCache?.ctaPrimaryLink || "/auth?tab=signup");
  const [ctaSecondary, setCtaSecondary] = useState(heroCache?.ctaSecondary || "Explore Banking Products");
  const [ctaSecondaryLink, setCtaSecondaryLink] = useState(heroCache?.ctaSecondaryLink || "/#products");

  useEffect(() => {
    const loadHero = async () => {
      let result = await supabase
        .from("homepage_sections")
        .select("title, subtitle, image, image_alt, content")
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
      // cta_primary_label/cta_primary_link are the current field names;
      // cta_primary/cta_secondary are kept as a fallback for any hero row
      // seeded before link targets became editable.
      const primaryLabel = readContentField(data?.content, "cta_primary_label") || readContentField(data?.content, "cta_primary");
      const primaryLink = readContentField(data?.content, "cta_primary_link");
      const secondaryLabel = readContentField(data?.content, "cta_secondary_label") || readContentField(data?.content, "cta_secondary");
      const secondaryLink = readContentField(data?.content, "cta_secondary_link");

      const resolvedTitle = headline || data?.title || title;
      const resolvedSubtitle = subheadline || data?.subtitle || subtitle;

      // content.slides is the current field for one-or-more fade slides;
      // the row's own image/image_alt columns are kept as a fallback for
      // any hero seeded before multi-image support existed.
      const contentSlides = readContentSlides(data?.content);
      const resolvedSlides = contentSlides.length > 0
        ? contentSlides
        : data?.image
          ? [{ image: data.image, alt: data.image_alt || "" }]
          : slides;

      const resolvedCtaPrimary = primaryLabel || ctaPrimary;
      const resolvedCtaPrimaryLink = primaryLink || ctaPrimaryLink;
      const resolvedCtaSecondary = secondaryLabel || ctaSecondary;
      const resolvedCtaSecondaryLink = secondaryLink || ctaSecondaryLink;

      setTitle(resolvedTitle);
      setSubtitle(resolvedSubtitle);
      setSlides(resolvedSlides);
      setCtaPrimary(resolvedCtaPrimary);
      setCtaPrimaryLink(resolvedCtaPrimaryLink);
      setCtaSecondary(resolvedCtaSecondary);
      setCtaSecondaryLink(resolvedCtaSecondaryLink);

      writeHeroCache({
        title: resolvedTitle,
        subtitle: resolvedSubtitle,
        slides: resolvedSlides,
        ctaPrimary: resolvedCtaPrimary,
        ctaPrimaryLink: resolvedCtaPrimaryLink,
        ctaSecondary: resolvedCtaSecondary,
        ctaSecondaryLink: resolvedCtaSecondaryLink,
      });
    };

    loadHero();
    // Mount-only fetch; title/subtitle/slides/cta* are read inside only as
    // "the fetch returned nothing for this field, keep what's already
    // there" fallbacks, not reactive inputs -- listing them here would
    // re-run this on every setState call it makes, looping forever.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const badgeText = siteSettings.hero_badge_text || "Trusted by our customers";

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section className="relative overflow-hidden bg-[var(--bank-public-navy)]">
        <HeroSlideshow slides={slides} />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--bank-public-navy)] via-[var(--bank-public-navy)]/90 to-[var(--bank-public-navy)]/40" />

        <div className="relative mx-auto max-w-[1180px] px-4 py-14 md:px-6 md:py-20 lg:py-24">
          <div className="md:grid md:grid-cols-[1fr_320px] md:items-center md:gap-10 lg:grid-cols-[1fr_360px] lg:gap-16">
            <div className="max-w-xl space-y-6 text-white">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-xs font-semibold backdrop-blur-sm">
                <ShieldCheck className="h-3.5 w-3.5" />
                {badgeText}
              </div>
              <h1 className="text-4xl font-bold leading-tight md:text-5xl lg:text-6xl">{title}</h1>
              <p className="max-w-lg text-base leading-7 text-white/85 md:text-lg">{subtitle}</p>
              <div className="flex flex-wrap gap-3 pt-2">
                <a
                  href={ctaPrimaryLink}
                  className="rounded-full bg-white px-7 py-3 text-sm font-semibold text-[var(--bank-public-navy)] shadow-sm transition hover:bg-white/90"
                >
                  {ctaPrimary}
                </a>
                <a
                  href={ctaSecondaryLink}
                  className="rounded-full border border-white/40 px-7 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  {ctaSecondary}
                </a>
              </div>
            </div>

            <div className="mt-10 md:mt-0 md:justify-self-end">
              <LoginPanel />
            </div>
          </div>
        </div>
      </section>

      <DynamicHomepageSections />

      <Footer />
    </div>
  );
}
