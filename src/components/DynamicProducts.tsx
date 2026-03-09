import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Product {
  id: string;
  product_name: string;
  slug: string;
  short_description: string | null;
  icon: string | null;
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
        .select("id, product_name, slug, short_description, icon, display_order")
        .eq("status", "active")
        .order("display_order"),
      supabase
        .from("homepage_sections")
        .select("title, subtitle")
        .eq("section_name", "products")
        .eq("status", "active")
        .single(),
    ]);

    if (prodRes.data) setProducts(prodRes.data);
    if (secRes.data) {
      if (secRes.data.title) setSectionTitle(secRes.data.title);
      if (secRes.data.subtitle) setSectionSubtitle(secRes.data.subtitle);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Skeleton className="h-10 w-64 mx-auto mb-4" />
            <Skeleton className="h-6 w-96 mx-auto" />
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-lg" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="products" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16 animate-fade-in">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">{sectionTitle}</h2>
          <p className="text-xl text-muted-foreground">{sectionSubtitle}</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
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
