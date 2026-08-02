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
import DynamicProducts from "@/components/DynamicProducts";
import {
  Award,
  Briefcase,
  Building2,
  Clock,
  CreditCard,
  DollarSign,
  Eye,
  HelpCircle,
  Mail,
  MapPin,
  Phone,
  PiggyBank,
  Star,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type HomepageSection = {
  id: string;
  section_type: string;
  title: string | null;
  subtitle: string | null;
  content: string | null;
  image: string | null;
  display_order: number;
  status: string;
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

type ContactContent = {
  address?: string[];
  phone?: string[];
  email?: string[];
  hours?: string[];
};

const iconMap: Record<string, LucideIcon> = {
  award: Award,
  briefcase: Briefcase,
  building: Building2,
  card: CreditCard,
  credit: CreditCard,
  dollar: DollarSign,
  eye: Eye,
  help: HelpCircle,
  investment: TrendingUp,
  piggy: PiggyBank,
  savings: PiggyBank,
  target: Target,
  trending: TrendingUp,
  users: Users,
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

const parseJson = <T,>(value: string | null, fallback: T): T => {
  if (!value?.trim()) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const getIcon = (name?: string) => iconMap[(name || "").toLowerCase()] || Target;

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string | null }) {
  return (
    <div className="mb-8 max-w-xl md:mx-auto md:mb-14 md:max-w-3xl md:text-center">
      <h2 className="text-[18px] font-bold text-[var(--bank-navy)] md:text-4xl lg:text-5xl md:text-foreground">
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
  const items = parseJson<ServiceItem[]>(section.content, fallbackServices);

  return (
    <section id="services" className="scroll-mt-20 bg-[#f8f9fa] py-12 md:bg-secondary/30 md:py-24">
      <div className="container mx-auto px-4">
        <SectionHeader
          title={section.title || "Financial Services"}
          subtitle={section.subtitle || "Banking products and services tailored for your customers."}
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => {
            const Icon = getIcon(item.icon);
            return (
              <Card key={`${item.title}-${index}`} className="p-5 md:p-8">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold md:text-2xl">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground md:text-base">{item.description}</p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function AboutSection({ section }: { section: HomepageSection }) {
  const siteSettings = useSiteSettings();
  const bankName = siteSettings.site_name || "Your Bank";
  const content = parseJson<AboutContent>(section.content, fallbackAbout);

  return (
    <section id="about" className="scroll-mt-20 bg-[#f8f9fa] py-12 md:bg-secondary/30 md:py-24">
      <div className="container mx-auto px-4">
        <SectionHeader title={section.title || `About ${bankName}`} subtitle={section.subtitle || content.body} />
        {section.image ? (
          <img
            src={section.image}
            alt={section.title || `About ${bankName}`}
            className="mx-auto mb-8 max-h-[380px] w-full max-w-5xl rounded-lg object-cover"
          />
        ) : null}
        <div className="grid gap-4 md:grid-cols-3">
          {(content.cards || fallbackAbout.cards || []).map((item, index) => {
            const Icon = getIcon(item.icon);
            return (
              <Card key={`${item.title}-${index}`} className="p-5 md:p-8">
                <Icon className="h-6 w-6 text-primary" />
                <h3 className="mt-4 text-lg font-bold md:text-2xl">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection({ section }: { section: HomepageSection }) {
  const testimonials = parseJson<TestimonialItem[]>(section.content, fallbackTestimonials);

  return (
    <section className="bg-background py-12 md:py-24">
      <div className="container mx-auto px-4">
        <SectionHeader
          title={section.title || "Customer Stories"}
          subtitle={section.subtitle || "Real feedback from people who use our banking services."}
        />
        <div className="grid gap-4 md:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <Card key={`${testimonial.name}-${index}`} className="p-5 md:p-8">
              <div className="mb-4 flex gap-1">
                {Array.from({ length: Math.max(1, Math.min(5, testimonial.rating || 5)) }).map((_, starIndex) => (
                  <Star key={starIndex} className="h-4 w-4 fill-accent text-accent" />
                ))}
              </div>
              <p className="text-sm leading-6 text-muted-foreground md:text-base">"{testimonial.content}"</p>
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
  const faqs = parseJson<FaqItem[]>(section.content, fallbackFaqs);

  return (
    <section className="bg-[#f8f9fa] py-12 md:bg-secondary/30 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl">
          <SectionHeader
            title={section.title || "Frequently Asked Questions"}
            subtitle={section.subtitle || "Answers to common questions about our services."}
          />
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem key={`${faq.question}-${index}`} value={`item-${index}`} className="rounded-lg border border-border bg-card px-5">
                <AccordionTrigger className="text-left text-base font-semibold">{faq.question}</AccordionTrigger>
                <AccordionContent className="leading-7 text-muted-foreground">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}

function ContactSection({ section }: { section: HomepageSection }) {
  const siteSettings = useSiteSettings();
  const content = parseJson<ContactContent>(section.content, {});
  const address = content.address?.filter(Boolean) || [
    siteSettings.contact_address_line_1,
    siteSettings.contact_address_line_2,
  ].filter(Boolean);
  const phones = content.phone?.filter(Boolean) || [siteSettings.support_phone].filter(Boolean);
  const emails = content.email?.filter(Boolean) || [siteSettings.support_email].filter(Boolean);
  const hours = content.hours?.filter(Boolean) || [siteSettings.support_hours].filter(Boolean);
  const cards = [
    { icon: MapPin, title: "Visit", values: address },
    { icon: Phone, title: "Call", values: phones },
    { icon: Mail, title: "Email", values: emails },
    { icon: Clock, title: "Hours", values: hours },
  ].filter((card) => card.values.length > 0);

  return (
    <section id="contact" className="scroll-mt-20 bg-background py-12 md:py-24">
      <div className="container mx-auto px-4">
        <SectionHeader
          title={section.title || "Contact Us"}
          subtitle={section.subtitle || "Reach our team for account, product, or support questions."}
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <Card key={card.title} className="p-5">
              <card.icon className="h-6 w-6 text-primary" />
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
  return (
    <section className="bg-background py-12 md:py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl">
          <SectionHeader title={section.title || section.section_type} subtitle={section.subtitle} />
          {section.image ? (
            <img src={section.image} alt={section.title || section.section_type} className="mb-6 max-h-[420px] w-full rounded-lg object-cover" />
          ) : null}
          {section.content ? <p className="whitespace-pre-line text-base leading-8 text-muted-foreground">{section.content}</p> : null}
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
        .select("id, section_type, title, subtitle, content, image, display_order, status")
        .eq("status", "active")
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
            status: "active",
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
            status: "active",
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
            status: "active",
          }}
        />
      </>
    );
  }

  return <>{renderedSections}</>;
}
