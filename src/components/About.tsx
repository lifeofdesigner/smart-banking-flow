import { Card } from "@/components/ui/card";
import { Target, Eye, Award, Users } from "lucide-react";

const About = () => {
  return (
    <section id="about" className="py-24 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center mb-16 animate-fade-in">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">About MicroFinance Bank</h2>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Since 2010, we've been committed to providing accessible financial services to individuals 
            and small businesses. As a fully licensed microfinance institution, we operate under strict 
            regulatory oversight to ensure your financial security and trust.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
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

        <div className="grid md:grid-cols-3 gap-8">
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
