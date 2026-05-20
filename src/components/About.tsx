import { Card } from "@/components/ui/card";
import { Target, Eye, Award, Users } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const About = () => {
  const siteSettings = useSiteSettings();

  return (
    <section id="about" className="scroll-mt-20 bg-[#f8f9fa] py-12 md:bg-secondary/30 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mb-8 max-w-2xl md:mx-auto md:mb-16 md:max-w-4xl md:text-center animate-fade-in">
          <h2 className="text-[18px] font-bold text-[var(--bank-navy)] md:text-4xl lg:text-5xl md:text-foreground">
            About {siteSettings["site_name"] || "Your Bank"}
          </h2>
          <p className="mt-3 text-[11px] leading-6 text-[var(--bank-muted)] md:text-xl md:text-muted-foreground md:leading-relaxed">
            Since 2010, we've been committed to providing accessible financial services to individuals
            and small businesses. As a fully licensed microfinance institution, we operate under strict
            regulatory oversight to ensure your financial security and trust.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:hidden">
          <Card className="rounded-2xl border-0 border-t-[3px] border-t-[var(--bank-navy)] bg-white p-4 shadow-sm">
            <Target className="h-5 w-5 text-[var(--bank-navy)]" />
            <h3 className="mt-3 text-sm font-semibold text-[var(--bank-navy)]">Mission</h3>
            <p className="mt-2 text-[10px] leading-5 text-[var(--bank-muted)]">
              To empower individuals and small businesses with accessible, innovative, and sustainable financial solutions.
            </p>
          </Card>

          <Card className="rounded-2xl border-0 border-t-[3px] border-t-[var(--bank-navy)] bg-white p-4 shadow-sm">
            <Eye className="h-5 w-5 text-[var(--bank-gold)]" />
            <h3 className="mt-3 text-sm font-semibold text-[var(--bank-navy)]">Vision</h3>
            <p className="mt-2 text-[10px] leading-5 text-[var(--bank-muted)]">
              To be the leading microfinance institution for inclusion, service, and long-term community impact.
            </p>
          </Card>
        </div>

        <div className="mt-4 space-y-3 md:hidden">
          {[
            {
              icon: Award,
              title: "Fully Licensed",
              description: "Regulated by the Central Bank and committed to the highest standards of financial governance.",
            },
            {
              icon: Users,
              title: "Community Focused",
              description: "Dedicated to serving underbanked communities with tailored financial products.",
            },
            {
              icon: Target,
              title: "Customer First",
              description: "Your financial success is our priority with personalized support at every stage.",
            },
          ].map((value) => (
            <Card key={value.title} className="rounded-2xl border-0 border-l-4 border-l-[var(--bank-gold)] bg-white p-4 shadow-sm">
              <value.icon className="h-5 w-5 text-[var(--bank-navy)]" />
              <h4 className="mt-3 text-sm font-semibold text-[var(--bank-navy)]">{value.title}</h4>
              <p className="mt-2 text-[10px] leading-5 text-[var(--bank-muted)]">{value.description}</p>
            </Card>
          ))}
        </div>

        <div className="hidden md:grid md:grid-cols-2 gap-8 mb-16">
          <Card className="p-10 space-y-6 hover:shadow-xl transition-all duration-300 animate-slide-up">
            <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
              <Target className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-3xl font-bold">Our Mission</h3>
            <p className="text-lg text-muted-foreground leading-relaxed">
              To empower individuals and small businesses by providing accessible, innovative, and
              sustainable financial solutions that drive economic growth and improve livelihoods
              in our communities.
            </p>
          </Card>

          <Card className="p-10 space-y-6 hover:shadow-xl transition-all duration-300 animate-slide-up" style={{ animationDelay: "100ms" }}>
            <div className="w-16 h-16 rounded-xl bg-accent/10 flex items-center justify-center">
              <Eye className="w-8 h-8 text-accent" />
            </div>
            <h3 className="text-3xl font-bold">Our Vision</h3>
            <p className="text-lg text-muted-foreground leading-relaxed">
              To be the leading microfinance institution recognized for financial inclusion,
              exceptional customer service, and creating lasting positive impact in the lives of
              our clients and communities.
            </p>
          </Card>
        </div>

        <div className="hidden md:grid md:grid-cols-3 gap-8">
          <Card className="p-8 text-center hover:shadow-xl transition-all duration-300 animate-scale-in">
            <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Award className="w-8 h-8 text-primary" />
            </div>
            <h4 className="text-2xl font-bold mb-4">Fully Licensed</h4>
            <p className="text-muted-foreground">
              Regulated by the Central Bank and committed to the highest standards of financial governance
            </p>
          </Card>

          <Card className="p-8 text-center hover:shadow-xl transition-all duration-300 animate-scale-in" style={{ animationDelay: "100ms" }}>
            <div className="w-16 h-16 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-6">
              <Users className="w-8 h-8 text-accent" />
            </div>
            <h4 className="text-2xl font-bold mb-4">Community Focused</h4>
            <p className="text-muted-foreground">
              Dedicated to serving underbanked communities with tailored financial products
            </p>
          </Card>

          <Card className="p-8 text-center hover:shadow-xl transition-all duration-300 animate-scale-in" style={{ animationDelay: "200ms" }}>
            <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Target className="w-8 h-8 text-primary" />
            </div>
            <h4 className="text-2xl font-bold mb-4">Customer First</h4>
            <p className="text-muted-foreground">
              Your financial success is our priority with personalized service and support
            </p>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default About;
