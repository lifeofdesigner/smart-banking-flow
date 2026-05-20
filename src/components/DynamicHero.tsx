import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, TrendingUp, Users } from "lucide-react";
import heroImage from "@/assets/hero-banking.jpg";
import { useSiteSettings } from "@/hooks/useSiteSettings";

type HomepageHeroRow = {
  title?: string | null;
  subtitle?: string | null;
  image?: string | null;
  content?: unknown;
};

const readContentField = (content: unknown, key: string) => {
  if (!content) return "";
  const parsedContent =
    typeof content === "string"
      ? (() => {
          try {
            return JSON.parse(content);
          } catch {
            return null;
          }
        })()
      : content;

  if (!parsedContent || typeof parsedContent !== "object") return "";
  const value = (parsedContent as Record<string, unknown>)[key];

  return typeof value === "string" ? value : "";
};

export default function DynamicHero() {
  const siteSettings = useSiteSettings();
  const [title, setTitle] = useState("Your Digital Banking Partner");
  const [subtitle, setSubtitle] = useState(
    "Empowering individuals and businesses with accessible microfinance solutions. From savings to loans, we're here to help you achieve your financial dreams.",
  );
  const [image, setImage] = useState<string | null>(null);

  useEffect(() => {
    const loadHero = async () => {
      let result = await supabase
        .from("homepage_sections")
        .select("title, subtitle, image, content")
        .eq("section_type", "hero")
        .eq("status", "active")
        .order("display_order", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (result.error?.message.includes("status") || result.error?.message.includes("image")) {
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
      if (data?.image) setImage(data.image);
    };

    loadHero();
  }, []);

  const mobileHeading = useMemo(() => {
    const words = title.trim().split(/\s+/);
    if (words.length <= 1) {
      return { lead: title, accent: "" };
    }

    return {
      lead: words.slice(0, -1).join(" "),
      accent: words[words.length - 1],
    };
  }, [title]);

  const badgeText = siteSettings.hero_badge_text || "Trusted by our customers";
  const primaryCta = siteSettings.hero_primary_cta_label || "Open Account";
  const secondaryCta = siteSettings.hero_secondary_cta_label || "Learn More";
  const statOneValue = siteSettings.hero_stat_1_value || "4.5%";
  const statOneLabel = siteSettings.hero_stat_1_label || "Interest Rate";
  const statTwoValue = siteSettings.hero_stat_2_value || "50K+";
  const statTwoLabel = siteSettings.hero_stat_2_label || "Active Users";
  const statThreeValue = siteSettings.hero_stat_3_value || "100%";
  const statThreeLabel = siteSettings.hero_stat_3_label || "Secure";

  return (
    <section id="home" className="relative overflow-hidden scroll-mt-20">
      <div className="md:hidden bg-[var(--bank-navy)] px-4 pb-10 pt-6 text-white">
        <div className="mx-auto max-w-md space-y-6">
          <div className="inline-flex min-h-[36px] items-center gap-2 rounded-full border border-[var(--bank-gold)]/60 px-3 py-2 text-[12px] font-medium text-[var(--bank-gold)]">
            <Shield className="h-4 w-4" />
            <span>{badgeText}</span>
          </div>

          <div className="space-y-3">
            <h1
              className="text-[28px] font-semibold leading-[1.2] text-white"
              style={{ fontFamily: "Georgia, serif" }}
            >
              {mobileHeading.lead}
              {mobileHeading.accent ? (
                <>
                  {" "}
                  <span className="text-[var(--bank-gold)]">{mobileHeading.accent}</span>
                </>
              ) : null}
            </h1>
            <p className="text-[12px] leading-6 text-white/65">{subtitle}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              size="lg"
              className="h-11 rounded-full bg-[var(--bank-gold)] px-4 text-sm font-semibold text-[var(--bank-navy)] hover:bg-[#d7b663]"
              onClick={() => {
                window.location.href = "/auth";
              }}
            >
              {primaryCta}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-11 rounded-full border-white/40 bg-transparent px-4 text-sm font-semibold text-white hover:bg-white/10 hover:text-white"
              onClick={() => document.getElementById("about")?.scrollIntoView({ behavior: "smooth" })}
            >
              {secondaryCta}
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-white/5 px-3 py-4">
              <div className="flex items-center gap-1.5 text-[var(--bank-gold)]">
                <TrendingUp className="h-4 w-4" />
                <span className="text-lg font-semibold">{statOneValue}</span>
              </div>
              <p className="mt-1 text-[11px] text-white/55">{statOneLabel}</p>
            </div>
            <div className="rounded-2xl bg-white/5 px-3 py-4">
              <div className="flex items-center gap-1.5 text-[var(--bank-gold)]">
                <Users className="h-4 w-4" />
                <span className="text-lg font-semibold">{statTwoValue}</span>
              </div>
              <p className="mt-1 text-[11px] text-white/55">{statTwoLabel}</p>
            </div>
            <div className="rounded-2xl bg-white/5 px-3 py-4">
              <div className="flex items-center gap-1.5 text-[var(--bank-gold)]">
                <Shield className="h-4 w-4" />
                <span className="text-lg font-semibold">{statThreeValue}</span>
              </div>
              <p className="mt-1 text-[11px] text-white/55">{statThreeLabel}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden md:block">
        <section className="relative min-h-screen flex items-center pt-20">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-8 animate-fade-in">
                <div className="inline-flex items-center space-x-2 bg-accent/10 rounded-full px-4 py-2">
                  <Shield className="w-4 h-4 text-accent" />
                  <span className="text-sm font-medium text-accent">{badgeText}</span>
                </div>
                <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
                  {title}
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed">{subtitle}</p>
                <div className="flex flex-wrap gap-4">
                  <Button size="lg" className="text-lg h-14 px-8 group" onClick={() => (window.location.href = "/auth")}>
                    {primaryCta}
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="text-lg h-14 px-8"
                    onClick={() => document.getElementById("about")?.scrollIntoView({ behavior: "smooth" })}
                  >
                    {secondaryCta}
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-8 pt-8 border-t border-border">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-accent">
                      <TrendingUp className="w-5 h-5" />
                      <span className="text-2xl font-bold">{statOneValue}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{statOneLabel}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-accent">
                      <Users className="w-5 h-5" />
                      <span className="text-2xl font-bold">{statTwoValue}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{statTwoLabel}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-accent">
                      <Shield className="w-5 h-5" />
                      <span className="text-2xl font-bold">{statThreeValue}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{statThreeLabel}</p>
                  </div>
                </div>
              </div>
              <div className="relative animate-scale-in">
                <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-accent/20 rounded-3xl blur-2xl" />
                <img src={image || heroImage} alt={siteSettings.hero_image_alt || title} className="relative rounded-3xl shadow-2xl w-full h-auto" />
              </div>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
