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
    <section id="services" className="py-24 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16 animate-fade-in">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            Our Financial Services
          </h2>
          <p className="text-xl text-muted-foreground">
            Comprehensive banking solutions designed to meet your unique financial needs
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
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
