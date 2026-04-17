import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Phone, Mail, Clock } from "lucide-react";

const contactItems = [
  {
    icon: MapPin,
    title: "Visit Us",
    details: ["123 Financial District, Downtown", "City Center, State 12345"],
  },
  {
    icon: Phone,
    title: "Call Us",
    details: ["+1 (555) 123-4567", "+1 (555) 765-4321"],
  },
  {
    icon: Mail,
    title: "Email Us",
    details: ["info@microfinancebank.com", "support@microfinancebank.com"],
  },
  {
    icon: Clock,
    title: "Business Hours",
    details: ["Monday - Friday: 8:00 AM - 6:00 PM", "Saturday: 9:00 AM - 2:00 PM"],
  },
];

const Contact = () => {
  return (
    <section id="contact" className="scroll-mt-20 bg-[var(--bank-navy)] py-12 text-white md:bg-background md:py-24 md:text-foreground">
      <div className="container mx-auto px-4">
        <div className="mb-8 max-w-2xl md:mx-auto md:mb-16 md:max-w-3xl md:text-center animate-fade-in">
          <h2 className="text-[18px] font-bold text-white md:text-4xl lg:text-5xl md:text-foreground">Get In Touch</h2>
          <p className="mt-2 text-[11px] leading-5 text-white/65 md:mt-6 md:text-xl md:text-muted-foreground">
            Have questions? We're here to help. Reach out to our team today.
          </p>
        </div>

        <div className="space-y-4 md:hidden">
          {contactItems.map((item) => (
            <div key={item.title} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--bank-gold)] text-[var(--bank-navy)]">
                <item.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                {item.details.map((detail) => (
                  <p key={detail} className="mt-1 text-[11px] leading-5 text-white/65">
                    {detail}
                  </p>
                ))}
              </div>
            </div>
          ))}

          <Card className="rounded-3xl border border-white/10 bg-white p-5 text-[var(--bank-navy)] shadow-sm">
            <form className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--bank-muted)]">Full Name</label>
                <Input placeholder="John Doe" className="h-12 rounded-lg border-slate-200 bg-white" />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--bank-muted)]">Email Address</label>
                <Input type="email" placeholder="john@example.com" className="h-12 rounded-lg border-slate-200 bg-white" />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--bank-muted)]">Phone Number</label>
                <Input type="tel" placeholder="+1 (555) 123-4567" className="h-12 rounded-lg border-slate-200 bg-white" />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--bank-muted)]">Message</label>
                <Textarea
                  placeholder="How can we help you today?"
                  className="min-h-[140px] rounded-lg border-slate-200 bg-white"
                />
              </div>

              <Button className="h-12 w-full rounded-lg bg-[var(--bank-gold)] text-[var(--bank-navy)] hover:bg-[#d7b663]">
                Send Message
              </Button>
            </form>
          </Card>
        </div>

        <div className="hidden md:grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          <div className="space-y-8 animate-slide-up">
            <Card className="p-6 flex items-start space-x-4 hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-2">Visit Us</h3>
                <p className="text-muted-foreground">
                  123 Financial District, Downtown<br />
                  City Center, State 12345
                </p>
              </div>
            </Card>

            <Card className="p-6 flex items-start space-x-4 hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                <Phone className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-2">Call Us</h3>
                <p className="text-muted-foreground">
                  +1 (555) 123-4567<br />
                  +1 (555) 765-4321
                </p>
              </div>
            </Card>

            <Card className="p-6 flex items-start space-x-4 hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-2">Email Us</h3>
                <p className="text-muted-foreground">
                  info@microfinancebank.com<br />
                  support@microfinancebank.com
                </p>
              </div>
            </Card>

            <Card className="p-6 flex items-start space-x-4 hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                <Clock className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-2">Business Hours</h3>
                <p className="text-muted-foreground">
                  Monday - Friday: 8:00 AM - 6:00 PM<br />
                  Saturday: 9:00 AM - 2:00 PM
                </p>
              </div>
            </Card>
          </div>

          <Card className="p-8 animate-slide-up" style={{ animationDelay: "100ms" }}>
            <form className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Full Name</label>
                <Input placeholder="John Doe" className="h-12" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Email Address</label>
                <Input type="email" placeholder="john@example.com" className="h-12" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Phone Number</label>
                <Input type="tel" placeholder="+1 (555) 123-4567" className="h-12" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Message</label>
                <Textarea
                  placeholder="How can we help you today?"
                  className="min-h-[150px]"
                />
              </div>

              <Button size="lg" className="w-full h-12">
                Send Message
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default Contact;
