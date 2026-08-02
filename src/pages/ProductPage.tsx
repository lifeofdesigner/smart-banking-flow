/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowRight, Check, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useSiteSettings } from "@/hooks/useSiteSettings";

interface ProductPage {
  id: string;
  product_name: string;
  slug: string;
  short_description: string | null;
  full_description: string | null;
  hero_image: string | null;
  meta_description: string | null;
  og_image: string | null;
  icon: string | null;
  status: string;
}

interface ProductSection {
  id: string;
  section_type: string;
  title: string | null;
  content: unknown;
  image: string | null;
  display_order: number;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  display_order: number;
}

/** product_sections.content is jsonb: either a plain string (description) or a string array (features/benefits/steps). */
function parseJsonArray(content: unknown): string[] {
  if (Array.isArray(content)) return content.filter((item): item is string => typeof item === "string");
  if (typeof content === "string" && content.trim()) return [content];
  return [];
}

function parseText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.filter((item): item is string => typeof item === "string").join("\n\n");
  return "";
}

export default function ProductPageView() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const siteSettings = useSiteSettings();
  const [product, setProduct] = useState<ProductPage | null>(null);
  const [sections, setSections] = useState<ProductSection[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) fetchProduct();
  }, [slug]);

  useEffect(() => {
    if (product) {
      document.title = `${product.product_name} | ${siteSettings["site_name"] || "Your Bank"}`;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute("content", product.meta_description || product.short_description || "");
    }
  }, [product, siteSettings]);

  const fetchProduct = async () => {
    setLoading(true);
    const { data: prod } = await supabase
      .from("product_pages")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .single();

    if (!prod) {
      navigate("/", { replace: true });
      return;
    }
    setProduct(prod);

    const [secRes, faqRes] = await Promise.all([
      supabase
        .from("product_sections")
        .select("*")
        .eq("product_id", prod.id)
        .order("display_order"),
      supabase
        .from("faqs")
        .select("*")
        .eq("product_id", prod.id)
        .order("display_order"),
    ]);

    setSections(secRes.data || []);
    setFaqs(faqRes.data || []);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-28 pb-16 container mx-auto px-4 space-y-8">
          <Skeleton className="h-12 w-2/3" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!product) return null;

  const descSection = sections.find((s) => s.section_type === "description");
  const featuresSection = sections.find((s) => s.section_type === "features");
  const benefitsSection = sections.find((s) => s.section_type === "benefits");
  const howItWorksSection = sections.find((s) => s.section_type === "how_it_works");

  const features = parseJsonArray(featuresSection?.content);
  const benefits = parseJsonArray(benefitsSection?.content);
  const steps = parseJsonArray(howItWorksSection?.content);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-28 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <a href="/" className="hover:text-primary transition-colors">Home</a>
            <ChevronRight className="w-4 h-4" />
            <span className="text-foreground font-medium">{product.product_name}</span>
          </div>
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 animate-fade-in">
              <h1 className="text-4xl lg:text-6xl font-bold leading-tight">{product.product_name}</h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                {product.short_description}
              </p>
              <div className="flex flex-wrap gap-4">
                <Button size="lg" className="h-14 px-8 text-lg group" onClick={() => navigate("/auth")}>
                  Get Started
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg" onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}>
                  Learn More
                </Button>
              </div>
            </div>
            {product.hero_image && (
              <div className="relative animate-scale-in">
                <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-accent/20 rounded-3xl blur-2xl" />
                <img src={product.hero_image} alt={product.product_name} className="relative rounded-3xl shadow-2xl w-full h-auto" />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Description Section */}
      {descSection && (
        <section className="py-20 bg-secondary/30">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <h2 className="text-3xl lg:text-4xl font-bold">{descSection.title}</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">{parseText(descSection.content)}</p>
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      {features.length > 0 && (
        <section id="features" className="py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl lg:text-4xl font-bold text-center mb-12">{featuresSection?.title || "Features"}</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {features.map((feature, i) => (
                <Card key={i} className="p-6 hover:shadow-lg transition-shadow border-border">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium">{feature}</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Benefits Section */}
      {benefits.length > 0 && (
        <section className="py-20 bg-secondary/30">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl lg:text-4xl font-bold text-center mb-12">{benefitsSection?.title || "Benefits"}</h2>
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {benefits.map((benefit, i) => (
                <div key={i} className="flex items-start gap-4 animate-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <Check className="w-5 h-5 text-accent" />
                  </div>
                  <p className="text-lg text-muted-foreground">{benefit}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How It Works */}
      {steps.length > 0 && (
        <section className="py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl lg:text-4xl font-bold text-center mb-12">{howItWorksSection?.title || "How It Works"}</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
              {steps.map((step, i) => (
                <div key={i} className="text-center space-y-4">
                  <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto">
                    {i + 1}
                  </div>
                  <p className="text-muted-foreground">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQs */}
      {faqs.length > 0 && (
        <section className="py-20 bg-secondary/30">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl lg:text-4xl font-bold text-center mb-12">Frequently Asked Questions</h2>
              <Accordion type="single" collapsible className="space-y-4">
                {faqs.map((faq, i) => (
                  <AccordionItem key={faq.id} value={`faq-${i}`} className="bg-card border border-border rounded-lg px-6">
                    <AccordionTrigger className="text-lg font-semibold hover:text-primary">{faq.question}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed">{faq.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-3xl lg:text-4xl font-bold">Ready to Get Started?</h2>
            <p className="text-lg text-muted-foreground">
              Open your account today and experience {product.product_name} with {siteSettings["site_name"] || "Your Bank"}.
            </p>
            <Button size="lg" className="h-14 px-10 text-lg" onClick={() => navigate("/auth")}>
              Open Account <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
