import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATIC_PAGES = [
  { value: "/", label: "Home" },
  { value: "/auth?tab=signup", label: "Sign Up / Open an Account" },
  { value: "/auth", label: "Log In" },
  { value: "/about", label: "About Us" },
  { value: "/contact", label: "Contact Us" },
  { value: "/help", label: "Help Center" },
  { value: "/#products", label: "Homepage section: Banking Products" },
  { value: "/#services", label: "Homepage section: Why Choose Us" },
  { value: "/#about", label: "Homepage section: About Us" },
  { value: "/#trust_bar", label: "Homepage section: Trust Bar" },
  { value: "/#banking_made_simple", label: "Homepage section: Banking Made Simple" },
  { value: "/#statistics", label: "Homepage section: Statistics" },
  { value: "/#financial_tools", label: "Homepage section: Financial Tools" },
  { value: "/#testimonials", label: "Homepage section: Testimonials" },
  { value: "/#security", label: "Homepage section: Security" },
  { value: "/#mobile_banking", label: "Homepage section: Mobile Banking" },
  { value: "/#financial_education", label: "Homepage section: Financial Education" },
  { value: "/#faq", label: "Homepage section: FAQ" },
  { value: "/#final_cta", label: "Homepage section: Final CTA" },
  { value: "/#contact", label: "Homepage section: Contact" },
];

const CUSTOM_VALUE = "__custom__";

/**
 * No-code CTA destination field: pick from real site pages, homepage
 * sections (jumps to that section's anchor), or published products —
 * or drop into "Custom URL" for anything else (another internal route not
 * in this list yet, or a full external URL). Replaces raw "type a path and
 * hope it's right" text inputs for every CTA across the CMS.
 */
export function PageLinkPicker({
  label,
  value,
  onChange,
  helperText,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  helperText?: string;
}) {
  const [products, setProducts] = useState<{ slug: string; product_name: string }[]>([]);

  useEffect(() => {
    let isMounted = true;

    supabase
      .from("product_pages")
      .select("slug, product_name")
      .eq("status", "published")
      .order("display_order")
      .then(({ data }) => {
        if (isMounted && data) setProducts(data);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const allOptions = [
    ...STATIC_PAGES,
    ...products.map((p) => ({ value: `/products/${p.slug}`, label: `Product page: ${p.product_name}` })),
  ];
  const matchedOption = allOptions.find((option) => option.value === value);
  const [customMode, setCustomMode] = useState(() => Boolean(value) && !matchedOption);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {helperText ? <p className="text-xs text-muted-foreground">{helperText}</p> : null}

      <Select
        value={customMode ? CUSTOM_VALUE : matchedOption?.value || ""}
        onValueChange={(selected) => {
          if (selected === CUSTOM_VALUE) {
            setCustomMode(true);
            return;
          }
          setCustomMode(false);
          onChange(selected);
        }}
      >
        <SelectTrigger><SelectValue placeholder="Choose a page" /></SelectTrigger>
        <SelectContent>
          {allOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
          ))}
          <SelectItem value={CUSTOM_VALUE}>Custom URL…</SelectItem>
        </SelectContent>
      </Select>

      {customMode ? (
        <Input
          placeholder="/some-page or https://example.com"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : null}
    </div>
  );
}
