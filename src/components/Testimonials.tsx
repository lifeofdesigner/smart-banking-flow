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
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16 animate-fade-in">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            What Our Customers Say
          </h2>
          <p className="text-xl text-muted-foreground">
            Join thousands of satisfied customers who trust us with their financial future
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
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
