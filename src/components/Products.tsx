import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const products = [
  {
    name: "Savings Account",
    description: "Build your savings with competitive interest rates",
    rate: "4.5% APY",
    features: [
      "No monthly maintenance fees",
      "Free online and mobile banking",
      "ATM access nationwide",
      "24/7 customer support",
      "Automatic savings plans",
    ],
  },
  {
    name: "Business Loan",
    description: "Fuel your business growth with flexible financing",
    rate: "From 8.5% APR",
    features: [
      "Up to $50,000 loan amount",
      "Flexible repayment terms",
      "Quick approval process",
      "No collateral for qualified borrowers",
      "Business advisory support",
    ],
    featured: true,
  },
  {
    name: "Term Deposits",
    description: "Secure your future with guaranteed returns",
    rate: "Up to 6% APY",
    features: [
      "Fixed interest rates",
      "Multiple term options",
      "Minimum deposit $1,000",
      "Automatic renewal options",
      "Early withdrawal options",
    ],
  },
];

const Products = () => {
  return (
    <section id="products" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16 animate-fade-in">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            Banking Products
          </h2>
          <p className="text-xl text-muted-foreground">
            Choose the perfect financial product for your needs
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {products.map((product, index) => (
            <Card
              key={product.name}
              className={`p-8 relative hover:shadow-2xl transition-all duration-300 animate-slide-up ${
                product.featured
                  ? "border-2 border-primary scale-105"
                  : "border-border"
              }`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {product.featured && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-accent text-accent-foreground px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}
              
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold mb-2">{product.name}</h3>
                <p className="text-muted-foreground mb-4">{product.description}</p>
                <div className="text-4xl font-bold text-primary">{product.rate}</div>
              </div>
              
              <ul className="space-y-4 mb-8">
                {product.features.map((feature) => (
                  <li key={feature} className="flex items-start space-x-3">
                    <Check className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Button
                className="w-full"
                variant={product.featured ? "default" : "outline"}
                size="lg"
              >
                Apply Now
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Products;
