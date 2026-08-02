import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { cn } from "@/lib/utils";

const Navbar = () => {
  const siteSettings = useSiteSettings();
  const logoUrl = siteSettings["site_logo_url"];
  const mobileLogoUrl = siteSettings.mobile_logo_url || logoUrl;
  const siteName = siteSettings["site_name"] || "Your Bank";
  const showBrandNameBesideLogo = siteSettings.show_brand_name_beside_logo !== "false";
  const showMobileBrandNameBesideLogo = siteSettings.show_mobile_brand_name_beside_logo !== "false";
  const [isScrolled, setIsScrolled] = useState(false);

  const navItems = useMemo(
    () => [
      { id: "home", label: "Home", href: "#home" },
      { id: "services", label: "Services", href: "#services" },
      { id: "products", label: "Products", href: "#products" },
      { id: "about", label: "About", href: "#about" },
      { id: "contact", label: "Contact", href: "#contact" },
    ],
    [],
  );

  useEffect(() => {
    const updateNavbarState = () => setIsScrolled(window.scrollY > 20);

    updateNavbarState();
    window.addEventListener("scroll", updateNavbarState, { passive: true });

    return () => {
      window.removeEventListener("scroll", updateNavbarState);
    };
  }, []);

  return (
    <>
      <nav
        className={cn(
          "sticky top-0 z-50 md:fixed md:left-0 md:right-0 md:transition-all md:duration-300",
          isScrolled ? "md:bg-background/95 md:backdrop-blur-md md:shadow-md" : "md:bg-transparent",
        )}
      >
        <div className="md:container md:mx-auto md:px-4">
          <div className="flex h-14 items-center justify-between bg-[var(--bank-navy)] px-4 md:h-20 md:bg-transparent">
            <div className="flex items-center gap-2.5 md:hidden">
              {mobileLogoUrl ? (
                <img
                  src={mobileLogoUrl}
                  alt={siteName}
                  className="h-8 w-auto object-contain"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bank-gold)] text-[11px] font-bold text-[var(--bank-navy)]">
                  HB
                </div>
              )}
              {showMobileBrandNameBesideLogo ? (
                <span className="max-w-[150px] truncate text-[14px] font-semibold text-white">
                  {siteName}
                </span>
              ) : null}
            </div>

            <div className="hidden md:flex items-center space-x-2">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={siteSettings["site_name"] || "Bank Logo"}
                  style={{ height: "40px", width: "auto", objectFit: "contain" }}
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-xl">M</span>
                </div>
              )}
              {showBrandNameBesideLogo ? (
                <span className={cn("text-xl font-bold", isScrolled ? "text-foreground" : "text-white")}>
                  {siteName}
                </span>
              ) : null}
            </div>

            <div className="hidden md:flex items-center space-x-8">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "font-medium transition-colors duration-200",
                    isScrolled
                      ? "text-foreground hover:text-primary"
                      : "text-white/85 hover:text-[var(--bank-gold)]",
                  )}
                >
                  {item.label}
                </a>
              ))}
              <Button
                variant="default"
                size="lg"
                className="ml-4"
                onClick={() => {
                  window.location.href = "/auth";
                }}
              >
                Internet Banking
              </Button>
            </div>

            <div className="flex items-center gap-2 md:hidden">
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-full border-[var(--bank-gold)] bg-transparent px-4 text-xs font-semibold text-[var(--bank-gold)] hover:bg-[var(--bank-gold)]/10 hover:text-[var(--bank-gold)]"
                onClick={() => {
                  window.location.href = "/auth";
                }}
              >
                Login
              </Button>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navbar;
