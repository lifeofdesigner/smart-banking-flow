import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("home");

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
    const updateNavbarState = () => {
      setIsScrolled(window.scrollY > 20);

      const currentSection = navItems.reduce((activeId, item) => {
        const section = document.getElementById(item.id);
        if (!section) {
          return activeId;
        }

        const threshold = window.scrollY + 140;
        return section.offsetTop <= threshold ? item.id : activeId;
      }, navItems[0]?.id || "home");

      setActiveSection(window.location.hash.replace("#", "") || currentSection);
    };

    updateNavbarState();
    window.addEventListener("scroll", updateNavbarState, { passive: true });
    window.addEventListener("hashchange", updateNavbarState);

    return () => {
      window.removeEventListener("scroll", updateNavbarState);
      window.removeEventListener("hashchange", updateNavbarState);
    };
  }, [navItems]);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isMobileMenuOpen]);

  const navigateToSection = (href: string) => {
    const nextSectionId = href.replace("#", "");
    const targetSection = document.getElementById(nextSectionId);

    if (targetSection) {
      targetSection.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.replaceState(null, "", href);
      setActiveSection(nextSectionId);
    }

    setIsMobileMenuOpen(false);
  };

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
                <span className="text-xl font-bold text-foreground">{siteName}</span>
              ) : null}
            </div>

            <div className="hidden md:flex items-center space-x-8">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="text-foreground hover:text-primary transition-colors duration-200 font-medium"
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

              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--bank-gold)]/25 bg-white/5 text-[var(--bank-gold)]"
                onClick={() => setIsMobileMenuOpen(true)}
                aria-label="Open navigation menu"
              >
                <span className="flex flex-col items-center gap-1.5">
                  <span className="block h-[1.5px] w-5 rounded-full bg-[var(--bank-gold)]" />
                  <span className="block h-[1.5px] w-5 rounded-full bg-[var(--bank-gold)]" />
                  <span className="block h-[1.5px] w-5 rounded-full bg-[var(--bank-gold)]" />
                </span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div
        className={cn(
          "fixed inset-0 z-[100] md:hidden",
          isMobileMenuOpen ? "pointer-events-auto" : "pointer-events-none",
        )}
      >
        <div
          className={cn(
            "absolute inset-0 bg-[var(--bank-navy)]/60 backdrop-blur-sm transition-opacity duration-300",
            isMobileMenuOpen ? "opacity-100" : "opacity-0",
          )}
          onClick={() => setIsMobileMenuOpen(false)}
        />

        <div
          className={cn(
            "absolute inset-y-0 right-0 flex w-full flex-col bg-[var(--bank-navy)] px-6 pb-8 pt-5 text-white transition-transform duration-300 ease-out",
            isMobileMenuOpen ? "translate-x-0" : "translate-x-full",
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2.5">
              {mobileLogoUrl ? (
                <img
                  src={mobileLogoUrl}
                  alt={siteName}
                  className="h-9 w-auto object-contain"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--bank-gold)] text-xs font-bold text-[var(--bank-navy)]">
                  HB
                </div>
              )}
              {showMobileBrandNameBesideLogo ? (
                <div>
                  <p className="text-sm font-semibold">{siteName}</p>
                  <p className="text-xs text-white/60">Mobile Navigation</p>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white"
              aria-label="Close navigation menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-14 flex flex-1 flex-col gap-3">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateToSection(item.href)}
                className={cn(
                  "min-h-[52px] border-l-2 px-4 text-left text-[18px] font-medium transition",
                  activeSection === item.id
                    ? "border-[var(--bank-gold)] text-white"
                    : "border-transparent text-white/75 hover:border-[var(--bank-gold)]/40 hover:text-white",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-6 space-y-3">
            <Button
              type="button"
              className="h-12 w-full rounded-full bg-[var(--bank-gold)] text-[var(--bank-navy)] hover:bg-[#d7b663]"
              onClick={() => {
                setIsMobileMenuOpen(false);
                window.location.href = "/auth";
              }}
            >
              Internet Banking
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;
