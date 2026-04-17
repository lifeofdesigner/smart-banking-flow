import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface Product {
  id: string;
  product_name: string;
  slug: string;
  short_description: string | null;
  display_order: number;
}

export default function DynamicProducts() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [sectionTitle, setSectionTitle] = useState("Banking Products");
  const [sectionSubtitle, setSectionSubtitle] = useState("Choose the perfect financial product for your needs");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [prodRes, secRes] = await Promise.all([
      supabase
        .from("product_pages")
        .select("id, product_name, slug, short_description, display_order")
        .in("status", ["published", "active"])
        .order("display_order"),
      supabase
        .from("homepage_sections")
        .select("title, subtitle")
        .eq("section_type", "products")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);

    if (prodRes.error) {
      toast.error(prodRes.error.message);
    }
    if (secRes.error) {
      toast.error(secRes.error.message);
    }

    if (prodRes.data) setProducts(prodRes.data);
    if (secRes.data) {
      if (secRes.data.title) setSectionTitle(secRes.data.title);
      if (secRes.data.subtitle) setSectionSubtitle(secRes.data.subtitle);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <section id="products" className="scroll-mt-20 bg-background py-12 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mb-8 md:mb-16 md:text-center">
            <Skeleton className="h-8 w-48 md:h-10 md:w-64 md:mx-auto mb-4" />
            <Skeleton className="h-4 w-48 md:h-6 md:w-96 md:mx-auto" />
          </div>
          <div className="flex gap-4 overflow-hidden md:grid md:grid-cols-2 lg:grid-cols-4 md:gap-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-44 w-40 flex-none rounded-2xl md:h-48 md:w-auto md:rounded-lg" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="products" className="scroll-mt-20 bg-background py-12 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mb-8 max-w-xl md:mx-auto md:mb-16 md:max-w-3xl md:text-center animate-fade-in">
          <h2 className="text-[18px] font-bold text-[var(--bank-navy)] md:text-4xl lg:text-5xl md:text-foreground">{sectionTitle}</h2>
          <p className="mt-2 text-[11px] leading-5 text-[var(--bank-muted)] md:mt-6 md:text-xl md:text-muted-foreground">{sectionSubtitle}</p>
        </div>

        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:hidden">
          {products.map((product) => (
            <Card
              key={product.id}
              className="w-40 flex-none snap-start rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              onClick={() => navigate(`/products/${product.slug}`)}
            >
              <div className="flex h-full flex-col">
                <h3 className="text-sm font-semibold text-[var(--bank-navy)]">{product.product_name}</h3>
                <p className="mt-2 line-clamp-3 text-[10px] leading-5 text-[var(--bank-muted)]">
                  {product.short_description}
                </p>
                <button
                  type="button"
                  className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[var(--bank-slate)]"
                >
                  Learn More <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </Card>
          ))}
        </div>

        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {products.map((product, index) => (
            <Card
              key={product.id}
              className="p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 cursor-pointer border-border animate-slide-up group"
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => navigate(`/products/${product.slug}`)}
            >
              <div className="space-y-4">
                <h3 className="text-xl font-bold group-hover:text-primary transition-colors">
                  {product.product_name}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                  {product.short_description}
                </p>
                <Button variant="ghost" size="sm" className="p-0 h-auto text-primary hover:text-primary/80">
                  Learn More <ArrowRight className="ml-1 w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
