import { Card } from "@/components/ui/card";
import { DollarSign, PiggyBank, Briefcase, Building2, CreditCard, TrendingUp } from "lucide-react";

const services = [
  {
    icon: PiggyBank,
    title: "Savings Accounts",
    description: "Secure savings with competitive interest rates. Start building your financial future today with flexible deposit options.",
  },
  {
    icon: DollarSign,
    title: "Microloans",
    description: "Quick access to small loans for personal needs. Easy application process with minimal documentation required.",
  },
  {
    icon: Briefcase,
    title: "SME Support",
    description: "Tailored financial solutions for small businesses. Grow your enterprise with our business-focused products.",
  },
  {
    icon: Building2,
    title: "Agency Banking",
    description: "Banking services at your doorstep through our extensive agent network across the region.",
  },
  {
    icon: CreditCard,
    title: "Micro-Credit",
    description: "Flexible credit facilities designed for your needs. Build your credit history with responsible borrowing.",
  },
  {
    icon: TrendingUp,
    title: "Investment Plans",
    description: "Grow your wealth with our investment products. Expert guidance for your financial planning needs.",
  },
];

const Services = () => {
  return (
    <section id="services" className="scroll-mt-20 bg-[#f8f9fa] py-12 md:bg-secondary/30 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mb-8 max-w-xl md:mx-auto md:mb-16 md:max-w-3xl md:text-center animate-fade-in">
          <h2 className="text-[18px] font-bold text-[var(--bank-navy)] md:text-4xl lg:text-5xl md:text-foreground">
            Our Financial Services
          </h2>
          <p className="mt-2 text-[11px] leading-5 text-[var(--bank-muted)] md:mt-6 md:text-xl md:text-muted-foreground">
            Comprehensive banking solutions designed to meet your unique financial needs
          </p>
        </div>

        <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 md:hidden">
          {services.map((service, index) => (
            <div
              key={service.title}
              className="flex items-start gap-3 px-4 py-4"
              style={index < services.length - 1 ? { borderBottom: "1px solid rgba(148, 163, 184, 0.16)" } : undefined}
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--bank-navy)]">
                <service.icon className="h-[18px] w-[18px] text-[var(--bank-gold)]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-[12px] font-semibold text-[var(--bank-navy)]">{service.title}</h3>
                <p className="mt-1 text-[10px] leading-5 text-[var(--bank-muted)]">{service.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <Card
              key={service.title}
              className="p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 animate-slide-up border-border bg-card"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                <service.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-4">{service.title}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {service.description}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
