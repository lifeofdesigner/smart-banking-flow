import { useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { applySiteName } from "@/lib/siteNameTemplate";
import DynamicProducts from "@/components/DynamicProducts";
import {
  Award,
  Briefcase,
  Building2,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Eye,
  HelpCircle,
  Lock,
  Mail,
  MapPin,
  Phone,
  PiggyBank,
  Shield,
  Smartphone,
  Star,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type HomepageSection = {
  id: string;
  section_type: string;
  title: string | null;
  subtitle: string | null;
  description?: string | null;
  content: unknown;
  image: string | null;
  image_alt?: string | null;
  display_order: number;
  is_active: boolean;
};

type ServiceItem = {
  icon?: string;
  title: string;
  description: string;
};

type AboutContent = {
  body?: string;
  cards?: ServiceItem[];
};

type TestimonialItem = {
  name: string;
  role?: string;
  content: string;
  rating?: number;
};

type FaqItem = {
  question: string;
  answer: string;
};

const iconMap: Record<string, LucideIcon> = {
  award: Award,
  briefcase: Briefcase,
  building: Building2,
  card: CreditCard,
  check: CheckCircle2,
  credit: CreditCard,
  dollar: DollarSign,
  eye: Eye,
  help: HelpCircle,
  investment: TrendingUp,
  lock: Lock,
  piggy: PiggyBank,
  savings: PiggyBank,
  shield: Shield,
  smartphone: Smartphone,
  target: Target,
  trending: TrendingUp,
  users: Users,
  zap: Zap,
};

const fallbackServices: ServiceItem[] = [
  {
    icon: "savings",
    title: "Savings Accounts",
    description: "Flexible savings products for individuals, families, and businesses.",
  },
  {
    icon: "dollar",
    title: "Personal Loans",
    description: "Simple loan products with clear terms and quick decisions.",
  },
  {
    icon: "briefcase",
    title: "Business Banking",
    description: "Accounts, payments, and working capital tools for growing companies.",
  },
  {
    icon: "card",
    title: "Cards",
    description: "Secure debit and virtual card services for everyday spending.",
  },
];

const fallbackAbout: AboutContent = {
  body: "A customer-focused financial institution delivering secure, accessible, and modern banking services.",
  cards: [
    { icon: "target", title: "Mission", description: "Deliver accessible financial services with clarity and care." },
    { icon: "eye", title: "Vision", description: "Build lasting trust through reliable digital banking experiences." },
    { icon: "award", title: "Licensed", description: "Operate with disciplined governance and customer-first standards." },
  ],
};

const fallbackTestimonials: TestimonialItem[] = [
  {
    name: "Business Customer",
    role: "Account Holder",
    content: "The online banking tools make it easier to manage daily payments and business cash flow.",
    rating: 5,
  },
  {
    name: "Savings Customer",
    role: "Personal Banking",
    content: "The account setup was straightforward, and support has been responsive whenever I need help.",
    rating: 5,
  },
  {
    name: "Loan Customer",
    role: "Small Business",
    content: "The loan process was clear, practical, and helpful for expanding my business.",
    rating: 5,
  },
];

const fallbackFaqs: FaqItem[] = [
  {
    question: "What do I need to open an account?",
    answer: "You need a valid identity document, contact information, and any extra documents required for the selected account type.",
  },
  {
    question: "Can I access my account online?",
    answer: "Yes. Customers can access eligible accounts through the internet banking portal.",
  },
  {
    question: "How do I contact support?",
    answer: "Use the contact details on this page or the live chat widget when available.",
  },
];

/**
 * homepage_sections.content is a jsonb column, so Supabase returns it already
 * parsed (object/array), not a JSON string — except for CustomSection which
 * still stores plain text. Handle both.
 */
const parseContent = (value: unknown): unknown => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    if (!value.trim()) return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
};

/** Real seeded content sometimes wraps its array under a named key (e.g. { services: [...] }); the admin CMS editor writes a raw array. Accept both. */
const extractArray = <T,>(parsed: unknown, wrapperKeys: string[]): T[] | null => {
  if (Array.isArray(parsed)) return parsed as T[];

  if (parsed && typeof parsed === "object") {
    for (const key of wrapperKeys) {
      const value = (parsed as Record<string, unknown>)[key];
      if (Array.isArray(value)) return value as T[];
    }
  }

  return null;
};

const getIcon = (name?: string) => iconMap[(name || "").toLowerCase()] || Target;

type CtaContent = {
  cta_primary_label?: string;
  cta_primary_link?: string;
  cta_secondary_label?: string;
  cta_secondary_link?: string;
};

const readCta = (parsed: unknown): CtaContent => {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  const record = parsed as Record<string, unknown>;
  const asString = (key: string) => (typeof record[key] === "string" ? (record[key] as string) : undefined);
  return {
    cta_primary_label: asString("cta_primary_label"),
    cta_primary_link: asString("cta_primary_link"),
    cta_secondary_label: asString("cta_secondary_label"),
    cta_secondary_link: asString("cta_secondary_link"),
  };
};

function CtaButtons({ cta, align = "start" }: { cta: CtaContent; align?: "start" | "center" }) {
  if (!cta.cta_primary_label && !cta.cta_secondary_label) return null;

  return (
    <div className={`flex flex-wrap gap-3 pt-2 ${align === "center" ? "justify-center" : ""}`}>
      {cta.cta_primary_label ? (
        <a
          href={cta.cta_primary_link || "#"}
          className="rounded-full bg-[var(--bank-public-navy)] px-7 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
        >
          {cta.cta_primary_label}
        </a>
      ) : null}
      {cta.cta_secondary_label ? (
        <a
          href={cta.cta_secondary_link || "#"}
          className="rounded-full border border-[var(--bank-public-navy)]/30 px-7 py-3 text-sm font-semibold text-[var(--bank-public-navy)] transition hover:bg-[var(--bank-public-navy)]/5"
        >
          {cta.cta_secondary_label}
        </a>
      ) : null}
    </div>
  );
}

type ChecklistItem = { icon?: string; label: string };

function ChecklistSection({
  section,
  fallbackTitle,
  columns = "md:grid-cols-2 lg:grid-cols-4",
}: {
  section: HomepageSection;
  fallbackTitle: string;
  columns?: string;
}) {
  const siteSettings = useSiteSettings();
  const bankName = siteSettings.site_name || "Your Bank";
  const parsed = parseContent(section.content);
  const items = extractArray<ChecklistItem>(parsed, ["items"]) || [];
  const cta = readCta(parsed);

  return (
    <section id={section.section_type} className="scroll-mt-20 bg-[#f8f9fa] py-12 md:bg-secondary/30 md:py-24">
      <div className="container mx-auto px-4">
        <SectionHeader
          title={applySiteName(section.title || fallbackTitle, bankName)}
          subtitle={section.subtitle ? applySiteName(section.subtitle, bankName) : undefined}
        />
        {section.description ? (
          <p className="mx-auto -mt-6 mb-8 max-w-2xl text-center text-sm leading-6 text-muted-foreground md:text-base">
            {applySiteName(section.description, bankName)}
          </p>
        ) : null}
        <div className={`grid gap-4 ${columns}`}>
          {items.map((item, index) => {
            const Icon = getIcon(item.icon);
            return (
              <div key={`${item.label}-${index}`} className="flex items-center gap-3 rounded-lg bg-card p-4 shadow-sm">
                <Icon className="h-5 w-5 shrink-0 text-[var(--bank-public-navy)]" />
                <span className="text-sm font-medium md:text-base">{applySiteName(item.label, bankName)}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-8 flex justify-center">
          <CtaButtons cta={cta} align="center" />
        </div>
      </div>
    </section>
  );
}

type StatItem = { value: string; label: string };

function StatisticsSection({ section }: { section: HomepageSection }) {
  const siteSettings = useSiteSettings();
  const bankName = siteSettings.site_name || "Your Bank";
  const items = extractArray<StatItem>(parseContent(section.content), ["items"]) || [];

  return (
    <section id="statistics" className="scroll-mt-20 bg-[var(--bank-public-navy)] py-12 md:py-20">
      <div className="container mx-auto px-4">
        <h2 className="mb-8 text-center text-[18px] font-bold text-white md:mb-14 md:text-4xl">
          {applySiteName(section.title || "Banking You Can Trust", bankName)}
        </h2>
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-8">
          {items.map((item, index) => (
            <div key={`${item.label}-${index}`} className="text-center">
              <p className="text-3xl font-bold text-[var(--bank-public-accent)] md:text-5xl">{item.value}</p>
              <p className="mt-2 text-xs text-white/80 md:text-base">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Shared by mobile_banking / financial_education / final_cta — a title, an
 * optional paragraph, and up to two CTA buttons, no repeatable items.
 * `variant="banner"` gives the closing final_cta section a distinct, more
 * prominent dark banner treatment instead of blending in with the plain
 * mid-page sections around it. */
function SimpleCtaSection({
  section,
  center = false,
  variant = "plain",
}: {
  section: HomepageSection;
  center?: boolean;
  variant?: "plain" | "banner";
}) {
  const siteSettings = useSiteSettings();
  const bankName = siteSettings.site_name || "Your Bank";
  const parsed = parseContent(section.content);
  const cta = readCta(parsed);
  const isBanner = variant === "banner";

  return (
    <section
      id={section.section_type}
      className={`scroll-mt-20 ${isBanner ? "bg-[var(--bank-public-navy)] py-14 md:py-24" : "bg-background py-12 md:py-24"}`}
    >
      <div className="container mx-auto px-4">
        <div className={`mx-auto max-w-3xl ${center ? "text-center" : ""}`}>
          <h2 className={`text-[18px] font-bold md:text-4xl ${isBanner ? "text-white" : "text-[var(--bank-public-navy)]"}`}>
            {applySiteName(section.title || "", bankName)}
          </h2>
          {section.description ? (
            <p className={`mt-4 text-sm leading-6 md:text-lg ${isBanner ? "text-white/85" : "text-muted-foreground"}`}>
              {applySiteName(section.description, bankName)}
            </p>
          ) : null}
          <div className={center ? "flex justify-center" : ""}>
            {isBanner ? (
              <div className={`flex flex-wrap gap-3 pt-6 ${center ? "justify-center" : ""}`}>
                {cta.cta_primary_label ? (
                  <a
                    href={cta.cta_primary_link || "#"}
                    className="rounded-full bg-white px-7 py-3 text-sm font-semibold text-[var(--bank-public-navy)] shadow-sm transition hover:bg-white/90"
                  >
                    {cta.cta_primary_label}
                  </a>
                ) : null}
                {cta.cta_secondary_label ? (
                  <a
                    href={cta.cta_secondary_link || "#"}
                    className="rounded-full border border-white/40 px-7 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    {cta.cta_secondary_label}
                  </a>
                ) : null}
              </div>
            ) : (
              <CtaButtons cta={cta} align={center ? "center" : "start"} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string | null }) {
  return (
    <div className="mb-8 max-w-xl md:mx-auto md:mb-14 md:max-w-3xl md:text-center">
      <h2 className="text-[18px] font-bold text-[var(--bank-public-navy)] md:text-4xl lg:text-5xl md:text-foreground">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-2 text-[11px] leading-5 text-[var(--bank-muted)] md:mt-5 md:text-xl md:text-muted-foreground">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

function ServicesSection({ section }: { section: HomepageSection }) {
  const siteSettings = useSiteSettings();
  const bankName = siteSettings.site_name || "Your Bank";
  const items = extractArray<ServiceItem>(parseContent(section.content), ["services"]) || fallbackServices;

  return (
    <section id="services" className="scroll-mt-20 bg-[#f8f9fa] py-12 md:bg-secondary/30 md:py-24">
      <div className="container mx-auto px-4">
        <SectionHeader
          title={applySiteName(section.title || "Financial Services", bankName)}
          subtitle={applySiteName(section.subtitle || "Banking products and services tailored for your customers.", bankName)}
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => {
            const Icon = getIcon(item.icon);
            return (
              <Card key={`${item.title}-${index}`} className="p-5 md:p-8">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--bank-public-navy)]/10">
                  <Icon className="h-6 w-6 text-[var(--bank-public-navy)]" />
                </div>
                <h3 className="text-lg font-bold md:text-2xl">{applySiteName(item.title, bankName)}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground md:text-base">{applySiteName(item.description, bankName)}</p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function AboutSection({ section }: { section: HomepageSection }) {
  const siteSettings = useSiteSettings();
  const bankName = siteSettings.site_name || "Your Bank";
  const parsed = parseContent(section.content);
  const record = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  // No `|| fallbackAbout.cards` here: an admin-authored row with zero cards
  // means zero cards, not "show the hardcoded Mission/Vision/Licensed
  // placeholder." The true no-data-at-all scenario is handled separately
  // below, where fallbackAbout's own cards are injected directly.
  const cards = extractArray<ServiceItem>(parsed, ["cards", "values"]) || [];
  const body = section.description || (typeof record.body === "string" ? record.body : typeof record.description === "string" ? record.description : undefined);
  const mission = typeof record.mission === "string" ? record.mission : undefined;
  const vision = typeof record.vision === "string" ? record.vision : undefined;
  const cta = readCta(parsed);

  const title = section.title ? applySiteName(section.title, bankName) : `About ${bankName}`;

  return (
    <section id="about" className="scroll-mt-20 bg-[#f8f9fa] py-12 md:bg-secondary/30 md:py-24">
      <div className="container mx-auto px-4">
        <SectionHeader title={title} subtitle={section.subtitle ? applySiteName(section.subtitle, bankName) : undefined} />
        {body ? (
          <div className="mx-auto mb-8 max-w-3xl space-y-4 text-center text-sm leading-7 text-muted-foreground md:text-base">
            {applySiteName(body, bankName)
              .split(/\n\n+/)
              .map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
          </div>
        ) : null}
        {section.image ? (
          <img
            src={section.image}
            alt={section.image_alt || title}
            className="mx-auto mb-8 max-h-[380px] w-full max-w-5xl rounded-lg object-cover"
          />
        ) : null}
        <div className="mb-8 flex justify-center">
          <CtaButtons cta={cta} align="center" />
        </div>
        {mission || vision ? (
          <div className="mb-8 grid gap-4 md:grid-cols-2">
            {mission ? (
              <Card className="p-5 md:p-8">
                <h3 className="text-lg font-bold md:text-2xl">Our Mission</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground md:text-base">{applySiteName(mission, bankName)}</p>
              </Card>
            ) : null}
            {vision ? (
              <Card className="p-5 md:p-8">
                <h3 className="text-lg font-bold md:text-2xl">Our Vision</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground md:text-base">{applySiteName(vision, bankName)}</p>
              </Card>
            ) : null}
          </div>
        ) : null}
        {cards.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-3">
            {cards.map((item, index) => {
              const Icon = getIcon(item.icon);
              return (
                <Card key={`${item.title}-${index}`} className="p-5 md:p-8">
                  <Icon className="h-6 w-6 text-[var(--bank-public-navy)]" />
                  <h3 className="mt-4 text-lg font-bold md:text-2xl">{applySiteName(item.title, bankName)}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{applySiteName(item.description, bankName)}</p>
                </Card>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function TestimonialsSection({ section }: { section: HomepageSection }) {
  const siteSettings = useSiteSettings();
  const bankName = siteSettings.site_name || "Your Bank";
  const testimonials = extractArray<TestimonialItem>(parseContent(section.content), ["testimonials"]) || fallbackTestimonials;

  return (
    <section id="testimonials" className="scroll-mt-20 bg-background py-12 md:py-24">
      <div className="container mx-auto px-4">
        <SectionHeader
          title={applySiteName(section.title || "Customer Stories", bankName)}
          subtitle={applySiteName(section.subtitle || "Real feedback from people who use our banking services.", bankName)}
        />
        <div className="grid gap-4 md:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <Card key={`${testimonial.name}-${index}`} className="p-5 md:p-8">
              <div className="mb-4 flex gap-1">
                {Array.from({ length: Math.max(1, Math.min(5, testimonial.rating || 5)) }).map((_, starIndex) => (
                  <Star key={starIndex} className="h-4 w-4 fill-[var(--bank-public-accent)] text-[var(--bank-public-accent)]" />
                ))}
              </div>
              <p className="text-sm leading-6 text-muted-foreground md:text-base">"{applySiteName(testimonial.content, bankName)}"</p>
              <div className="mt-5 border-t border-border pt-4">
                <p className="font-bold">{testimonial.name}</p>
                {testimonial.role ? <p className="text-sm text-muted-foreground">{testimonial.role}</p> : null}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqSection({ section }: { section: HomepageSection }) {
  const siteSettings = useSiteSettings();
  const bankName = siteSettings.site_name || "Your Bank";
  const faqs = extractArray<FaqItem>(parseContent(section.content), ["faqs"]) || fallbackFaqs;

  return (
    <section id="faq" className="scroll-mt-20 bg-[#f8f9fa] py-12 md:bg-secondary/30 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl">
          <SectionHeader
            title={applySiteName(section.title || "Frequently Asked Questions", bankName)}
            subtitle={applySiteName(section.subtitle || "Answers to common questions about our services.", bankName)}
          />
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem key={`${faq.question}-${index}`} value={`item-${index}`} className="rounded-lg border border-border bg-card px-5">
                <AccordionTrigger className="text-left text-base font-semibold">{applySiteName(faq.question, bankName)}</AccordionTrigger>
                <AccordionContent className="leading-7 text-muted-foreground">{applySiteName(faq.answer, bankName)}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}

/** Real seeded contact content stores these as plain strings; the admin CMS editor writes string arrays. Accept both. */
const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  if (typeof value === "string" && value.trim()) return [value];
  return [];
};

export function ContactSection({ section }: { section: HomepageSection }) {
  const siteSettings = useSiteSettings();
  const parsed = parseContent(section.content);
  const record = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  const address = toStringArray(record.address).length
    ? toStringArray(record.address)
    : [siteSettings.contact_address_line_1, siteSettings.contact_address_line_2].filter(Boolean);
  const phones = toStringArray(record.phone).length ? toStringArray(record.phone) : [siteSettings.support_phone].filter(Boolean);
  const emails = toStringArray(record.email).length ? toStringArray(record.email) : [siteSettings.support_email].filter(Boolean);
  const hours = toStringArray(record.hours).length ? toStringArray(record.hours) : [siteSettings.support_hours].filter(Boolean);
  const cards = [
    { icon: MapPin, title: "Visit", values: address },
    { icon: Phone, title: "Call", values: phones },
    { icon: Mail, title: "Email", values: emails },
    { icon: Clock, title: "Hours", values: hours },
  ].filter((card) => card.values.length > 0);

  const bankName = siteSettings.site_name || "Your Bank";

  return (
    <section id="contact" className="scroll-mt-20 bg-background py-12 md:py-24">
      <div className="container mx-auto px-4">
        <SectionHeader
          title={applySiteName(section.title || "Contact Us", bankName)}
          subtitle={applySiteName(section.subtitle || "Reach our team for account, product, or support questions.", bankName)}
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <Card key={card.title} className="p-5">
              <card.icon className="h-6 w-6 text-[var(--bank-public-navy)]" />
              <h3 className="mt-4 font-bold">{card.title}</h3>
              <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                {card.values.map((value) => (
                  <p key={value}>{value}</p>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function CustomSection({ section }: { section: HomepageSection }) {
  const siteSettings = useSiteSettings();
  const bankName = siteSettings.site_name || "Your Bank";
  const title = applySiteName(section.title || section.section_type, bankName);
  const parsedContent = parseContent(section.content);
  const bodyText = typeof parsedContent === "string" ? parsedContent : "";

  return (
    <section className="bg-background py-12 md:py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl">
          <SectionHeader title={title} subtitle={section.subtitle ? applySiteName(section.subtitle, bankName) : undefined} />
          {section.image ? (
            <img src={section.image} alt={section.image_alt || title} className="mb-6 max-h-[420px] w-full rounded-lg object-cover" />
          ) : null}
          {bodyText ? <p className="whitespace-pre-line text-base leading-8 text-muted-foreground">{applySiteName(bodyText, bankName)}</p> : null}
        </div>
      </div>
    </section>
  );
}

const renderSection = (section: HomepageSection) => {
  switch (section.section_type) {
    case "products":
      return <DynamicProducts key={section.id} />;
    case "services":
    case "banking_made_simple":
      return <ServicesSection key={section.id} section={section} />;
    case "about":
      return <AboutSection key={section.id} section={section} />;
    case "testimonials":
      return <TestimonialsSection key={section.id} section={section} />;
    case "faq":
    case "faqs":
      return <FaqSection key={section.id} section={section} />;
    case "contact":
      return <ContactSection key={section.id} section={section} />;
    case "trust_bar":
      return <ChecklistSection key={section.id} section={section} fallbackTitle="Trusted Every Day" columns="md:grid-cols-2 lg:grid-cols-4" />;
    case "financial_tools":
      return <ChecklistSection key={section.id} section={section} fallbackTitle="Financial Tools" columns="md:grid-cols-2 lg:grid-cols-3" />;
    case "security":
      return <ChecklistSection key={section.id} section={section} fallbackTitle="Your Security Is Our Priority" columns="md:grid-cols-2" />;
    case "statistics":
      return <StatisticsSection key={section.id} section={section} />;
    case "mobile_banking":
    case "financial_education":
      return <SimpleCtaSection key={section.id} section={section} center />;
    case "final_cta":
      return <SimpleCtaSection key={section.id} section={section} center variant="banner" />;
    case "hero":
      return null;
    default:
      return <CustomSection key={section.id} section={section} />;
  }
};

export default function DynamicHomepageSections() {
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchSections = async () => {
      const { data, error } = await supabase
        .from("homepage_sections")
        .select("id, section_type, title, subtitle, description, content, image, image_alt, display_order, is_active")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (!isMounted) return;

      if (!error && data) {
        setSections(data as HomepageSection[]);
      }
      setHasLoaded(true);
    };

    fetchSections();

    return () => {
      isMounted = false;
    };
  }, []);

  const renderedSections = useMemo(() => sections.map(renderSection).filter(Boolean), [sections]);

  if (!hasLoaded) return null;

  if (renderedSections.length === 0) {
    return (
      <>
        <DynamicProducts />
        <AboutSection
          section={{
            id: "fallback-about",
            section_type: "about",
            title: null,
            subtitle: null,
            content: JSON.stringify(fallbackAbout),
            image: null,
            display_order: 0,
            is_active: true,
          }}
        />
        <TestimonialsSection
          section={{
            id: "fallback-testimonials",
            section_type: "testimonials",
            title: null,
            subtitle: null,
            content: JSON.stringify(fallbackTestimonials),
            image: null,
            display_order: 0,
            is_active: true,
          }}
        />
        <FaqSection
          section={{
            id: "fallback-faq",
            section_type: "faq",
            title: null,
            subtitle: null,
            content: JSON.stringify(fallbackFaqs),
            image: null,
            display_order: 0,
            is_active: true,
          }}
        />
      </>
    );
  }

  return <>{renderedSections}</>;
}
