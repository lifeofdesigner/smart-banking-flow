import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, TrendingUp, Users } from "lucide-react";
import heroImage from "@/assets/hero-banking.jpg";

const Hero = () => {
  return (
    <section id="home" className="relative min-h-screen flex items-center pt-20">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 animate-fade-in">
            <div className="inline-flex items-center space-x-2 bg-accent/10 rounded-full px-4 py-2">
              <Shield className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-accent">Trusted by 50,000+ Customers</span>
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
              Your Partner in{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Financial Growth
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground leading-relaxed">
              Empowering individuals and businesses with accessible microfinance solutions. 
              From savings to loans, we're here to help you achieve your financial dreams.
            </p>
            
            <div className="flex flex-wrap gap-4">
              <Button size="lg" className="text-lg h-14 px-8 group">
                Open Account
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button size="lg" variant="outline" className="text-lg h-14 px-8">
                Learn More
              </Button>
            </div>
            
            <div className="grid grid-cols-3 gap-8 pt-8 border-t border-border">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-accent">
                  <TrendingUp className="w-5 h-5" />
                  <span className="text-2xl font-bold">4.5%</span>
                </div>
                <p className="text-sm text-muted-foreground">Interest Rate</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-accent">
                  <Users className="w-5 h-5" />
                  <span className="text-2xl font-bold">50K+</span>
                </div>
                <p className="text-sm text-muted-foreground">Active Users</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-accent">
                  <Shield className="w-5 h-5" />
                  <span className="text-2xl font-bold">100%</span>
                </div>
                <p className="text-sm text-muted-foreground">Secure</p>
              </div>
            </div>
          </div>
          
          <div className="relative animate-scale-in">
            <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-accent/20 rounded-3xl blur-2xl" />
            <img
              src={heroImage}
              alt="Banking Services"
              className="relative rounded-3xl shadow-2xl w-full h-auto"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
