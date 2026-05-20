import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const Contact = () => {
  const siteSettings = useSiteSettings();
  const contactItems = [
    {
      icon: MapPin,
      title: siteSettings.contact_address_title || "Visit Us",
      details: [
        siteSettings.contact_address_line_1 || "Add your main office address",
        siteSettings.contact_address_line_2 || "",
      ].filter(Boolean),
    },
    {
      icon: Phone,
      title: siteSettings.contact_phone_title || "Call Us",
      details: [
        siteSettings.contact_phone_primary || siteSettings.support_phone || "Add support phone",
        siteSettings.contact_phone_secondary || "",
      ].filter(Boolean),
    },
    {
      icon: Mail,
      title: siteSettings.contact_email_title || "Email Us",
      details: [
        siteSettings.contact_email_primary || siteSettings.support_email || "support@example.com",
        siteSettings.contact_email_secondary || "",
      ].filter(Boolean),
    },
    {
      icon: Clock,
      title: siteSettings.contact_hours_title || "Business Hours",
      details: [
        siteSettings.contact_hours_line_1 || "Add opening hours",
        siteSettings.contact_hours_line_2 || "",
      ].filter(Boolean),
    },
  ];

  return (
    <section id="contact" className="scroll-mt-20 bg-[var(--bank-navy)] py-12 text-white md:bg-background md:py-24 md:text-foreground">
      <div className="container mx-auto px-4">
        <div className="mb-8 max-w-2xl md:mx-auto md:mb-16 md:max-w-3xl md:text-center animate-fade-in">
          <h2 className="text-[18px] font-bold text-white md:text-4xl lg:text-5xl md:text-foreground">
            {siteSettings.contact_section_title || "Get In Touch"}
          </h2>
          <p className="mt-2 text-[11px] leading-5 text-white/65 md:mt-6 md:text-xl md:text-muted-foreground">
            {siteSettings.contact_section_subtitle || "Have questions? We're here to help. Reach out to our team today."}
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
                  {contactItems[0].details.map((detail) => (
                    <span key={detail}>
                      {detail}
                      <br />
                    </span>
                  ))}
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
                  {contactItems[1].details.map((detail) => (
                    <span key={detail}>
                      {detail}
                      <br />
                    </span>
                  ))}
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
                  {contactItems[2].details.map((detail) => (
                    <span key={detail}>
                      {detail}
                      <br />
                    </span>
                  ))}
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
                  {contactItems[3].details.map((detail) => (
                    <span key={detail}>
                      {detail}
                      <br />
                    </span>
                  ))}
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
