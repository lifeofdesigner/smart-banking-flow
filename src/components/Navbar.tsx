import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const navItems = [
  { label: "Checking", href: "/products/checking" },
  { label: "Savings & CDs", href: "/products/savings-account" },
  { label: "Credit Cards", href: "/products/cards" },
  { label: "Home Loans", href: "/products/home-loans" },
  { label: "Auto Loans", href: "/products/auto-loans" },
  { label: "Investing", href: "/products/investments" },
  { label: "About Us", href: "/about" },
  { label: "Contact Us", href: "/contact" },
];

function LogoMark({ logoUrl, siteName }: { logoUrl?: string; siteName: string }) {
  if (logoUrl) {
    return (
      <div className="flex min-w-0 items-center gap-3">
        <img src={logoUrl} alt={siteName} className="h-9 max-w-[80px] object-contain md:h-11 md:max-w-[120px]" />
        <span className="max-w-[160px] truncate text-lg font-extrabold leading-tight text-[var(--bank-public-navy)] md:max-w-[260px] md:text-2xl">
          {siteName}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="grid h-9 w-9 place-items-center rounded bg-[var(--bank-public-navy)] text-base font-extrabold text-white md:h-11 md:w-11">
        {siteName.slice(0, 1).toUpperCase()}
      </div>
      <span className="max-w-[200px] truncate text-lg font-extrabold leading-tight text-[var(--bank-public-navy)] md:max-w-[320px] md:text-2xl">
        {siteName}
      </span>
    </div>
  );
}

const Navbar = () => {
  const siteSettings = useSiteSettings();
  const logoUrl = siteSettings["site_logo_url"];
  const siteName = siteSettings["site_name"] || "Your Bank";
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[#d8dde6] bg-white">
      <div className="bg-[#f4f5f7] text-[10px] text-[#4b5563]">
        <div className="mx-auto flex max-w-[1180px] items-center justify-center gap-2 px-4 py-1.5 md:justify-start">
          <span>{siteName} deposit products:</span>
          <strong className="text-[var(--bank-public-navy)]">{siteSettings.deposit_insurer_name || "Deposit Insurance"}</strong>
          <span>insured and protected for eligible customers</span>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1180px] items-center justify-between px-4 py-3">
        <button
          type="button"
          className="grid h-10 w-10 place-items-center border border-[#d8dde6] md:hidden"
          aria-label="Open menu"
          onClick={() => setIsMenuOpen(true)}
        >
          <Menu className="h-5 w-5 text-[var(--bank-public-navy)]" />
        </button>

        <Link to="/">
          <LogoMark logoUrl={logoUrl} siteName={siteName} />
        </Link>

        <Button
          type="button"
          className="rounded-full bg-[var(--bank-public-navy)] px-4 py-2 text-xs font-semibold text-white hover:opacity-90 md:hidden"
          onClick={() => {
            window.location.href = "/auth";
          }}
        >
          Login
        </Button>

        <Button
          type="button"
          className="hidden rounded-full bg-[var(--bank-public-navy)] px-6 py-2 text-sm font-semibold text-white hover:opacity-90 md:inline-flex"
          onClick={() => {
            window.location.href = "/auth";
          }}
        >
          Login
        </Button>
      </div>

      <nav className="mx-auto hidden max-w-[1180px] items-center gap-6 overflow-x-auto border-t border-[#e6eaf0] px-4 py-3 text-sm font-medium text-[#334155] md:flex">
        {navItems.map((item) => (
          <Link key={item.href} to={item.href} className="whitespace-nowrap transition hover:text-[var(--bank-public-navy)]">
            {item.label}
          </Link>
        ))}
      </nav>

      <div
        className={`fixed inset-0 z-[100] md:hidden ${isMenuOpen ? "pointer-events-auto" : "pointer-events-none"}`}
      >
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${isMenuOpen ? "opacity-100" : "opacity-0"}`}
          onClick={() => setIsMenuOpen(false)}
        />
        <div
          className={`absolute inset-y-0 right-0 flex w-full max-w-[320px] flex-col overflow-y-auto bg-white px-6 pb-8 pt-5 transition-transform duration-300 ease-out ${
            isMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between">
            <LogoMark logoUrl={logoUrl} siteName={siteName} />
            <button
              type="button"
              onClick={() => setIsMenuOpen(false)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d8dde6]"
              aria-label="Close navigation menu"
            >
              <X className="h-5 w-5 text-[var(--bank-public-navy)]" />
            </button>
          </div>

          <div className="mt-8 flex flex-1 flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setIsMenuOpen(false)}
                className="min-h-[48px] border-b border-[#f0f2f5] py-3 text-[15px] font-medium text-[#1f2937]"
              >
                {item.label}
              </Link>
            ))}
          </div>

          <Button
            type="button"
            className="mt-4 h-12 w-full rounded-full bg-[var(--bank-public-navy)] text-sm font-semibold text-white"
            onClick={() => {
              window.location.href = "/auth";
            }}
          >
            Login
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
