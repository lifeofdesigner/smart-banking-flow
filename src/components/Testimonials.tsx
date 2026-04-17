import { Card } from "@/components/ui/card";
import { Star } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const Testimonials = () => {
  const siteSettings = useSiteSettings();

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Small Business Owner",
      content: `The business loan from ${siteSettings["site_name"] || "MicroFinance Bank"} helped me expand my grocery store. The process was quick, and the team was incredibly supportive throughout.`,
      rating: 5,
    },
    {
      name: "Michael Chen",
      role: "Entrepreneur",
      content: "Best decision I made was opening a savings account here. The interest rates are competitive, and the mobile banking app makes everything so convenient.",
      rating: 5,
    },
    {
      name: "Aisha Mohammed",
      role: "Fashion Designer",
      content: "I started with a small loan for my fashion business. Now I have multiple products with them. They truly care about their customers' success.",
      rating: 5,
    },
  ];

  return (
    <section className="bg-background py-12 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mb-8 max-w-xl md:mx-auto md:mb-16 md:max-w-3xl md:text-center animate-fade-in">
          <h2 className="text-[18px] font-bold text-[var(--bank-navy)] md:text-4xl lg:text-5xl md:text-foreground">
            What Our Customers Say
          </h2>
          <p className="mt-2 text-[11px] leading-5 text-[var(--bank-muted)] md:mt-6 md:text-xl md:text-muted-foreground">
            Join thousands of satisfied customers who trust us with their financial future
          </p>
        </div>

        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:hidden">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.name} className="w-[280px] flex-none snap-start rounded-3xl border-0 bg-[var(--bank-navy)] p-5 text-white shadow-lg">
              <div className="flex gap-1">
                {[...Array(testimonial.rating)].map((_, index) => (
                  <Star key={index} className="h-4 w-4 fill-[var(--bank-gold)] text-[var(--bank-gold)]" />
                ))}
              </div>
              <p className="mt-4 text-sm leading-6 text-white/85">"{testimonial.content}"</p>
              <div className="mt-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-[var(--bank-gold)]">
                  {testimonial.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-semibold">{testimonial.name}</p>
                  <p className="text-[11px] text-white/60">{testimonial.role}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="hidden md:grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <Card
              key={testimonial.name}
              className="p-8 hover:shadow-xl transition-all duration-300 animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-accent fill-accent" />
                ))}
              </div>

              <p className="text-muted-foreground mb-6 leading-relaxed text-lg">
                "{testimonial.content}"
              </p>

              <div className="border-t border-border pt-6">
                <div className="font-bold text-lg">{testimonial.name}</div>
                <div className="text-sm text-muted-foreground">{testimonial.role}</div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
