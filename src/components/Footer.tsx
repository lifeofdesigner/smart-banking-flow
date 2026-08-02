import { Facebook, Instagram, Linkedin, Twitter } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const parseLinks = (value: string | undefined, fallback: Array<{ label: string; href: string }>) => {
  if (!value) return fallback;

  try {
    const parsed = JSON.parse(value) as Array<{ label?: string; href?: string }>;
    const links = parsed
      .filter((item) => item.label && item.href)
      .map((item) => ({ label: item.label as string, href: item.href as string }));
    return links.length ? links : fallback;
  } catch {
    return fallback;
  }
};

const Footer = () => {
  const siteSettings = useSiteSettings();
  const logoUrl = siteSettings.site_logo_url;
  const siteName = siteSettings.site_name || "Your Bank";
  const footerDescription =
    siteSettings.footer_description ||
    `${siteName} provides secure banking, payments, loans, and support for modern customers.`;
  const footerDisclaimer =
    siteSettings.footer_disclaimer || `Member of ${siteSettings.deposit_insurer_name || "Deposit Insurance Corporation"}`;
  const quickLinks = parseLinks(siteSettings.footer_quick_links_json, [
    { label: "Home", href: "/" },
    { label: "About Us", href: "/about" },
    { label: "Contact Us", href: "/contact" },
  ]);
  const serviceLinks = parseLinks(siteSettings.footer_service_links_json, [
    { label: "Checking", href: "/products/checking" },
    { label: "Savings & CDs", href: "/products/savings-account" },
    { label: "Credit Cards", href: "/products/cards" },
    { label: "Home Loans", href: "/products/home-loans" },
    { label: "Auto Loans", href: "/products/auto-loans" },
    { label: "Investing", href: "/products/investments" },
  ]);
  const legalLinks = parseLinks(siteSettings.footer_legal_links_json, [
    { label: "Privacy", href: siteSettings.footer_privacy_url || "#" },
    { label: "Terms", href: siteSettings.footer_terms_url || "#" },
    { label: "Cookies", href: siteSettings.footer_cookie_url || "#" },
    { label: "Compliance", href: siteSettings.footer_compliance_url || "#" },
  ]);
  const socials = [
    { href: siteSettings.social_facebook_url, icon: Facebook, label: "Facebook" },
    { href: siteSettings.social_x_url, icon: Twitter, label: "X" },
    { href: siteSettings.social_instagram_url, icon: Instagram, label: "Instagram" },
    { href: siteSettings.social_linkedin_url, icon: Linkedin, label: "LinkedIn" },
  ].filter((item) => item.href);

  return (
    <footer className="border-t border-[#d8dde6] bg-white text-[#1f2937]">
      <div className="container mx-auto px-4 py-5 md:hidden">
        <div className="flex items-center justify-between gap-4 text-[11px] text-[#6b7280]">
          <p>
            &copy; {new Date().getFullYear()} {siteName}
          </p>
          <div className="flex items-center gap-4">
            {legalLinks.slice(0, 2).map((link) => (
              <a key={link.label} href={link.href} className="transition-colors hover:text-[var(--bank-public-navy)]">
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="hidden py-16 md:block">
        <div className="container mx-auto px-4">
          <div className="mb-12 grid gap-12 md:grid-cols-4">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={siteName}
                    className="h-[var(--logo-height-desktop)] w-auto object-contain"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--bank-public-navy)]">
                    <span className="text-xl font-bold text-white">
                      {(siteSettings.brand_initials || siteName.slice(0, 2)).toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="text-xl font-bold text-[var(--bank-public-navy)]">{siteName}</span>
              </div>
              <p className="leading-relaxed text-[#4b5563]">{footerDescription}</p>
              {socials.length ? (
                <div className="flex space-x-4">
                  {socials.map((item) => {
                    const Icon = item.icon;
                    return (
                      <a
                        key={item.label}
                        href={item.href}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#6b7280] transition-colors hover:text-[var(--bank-public-navy)]"
                        aria-label={item.label}
                      >
                        <Icon className="h-5 w-5" />
                      </a>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <FooterLinkColumn title={siteSettings.footer_quick_links_title || "Quick Links"} links={quickLinks} />
            <FooterLinkColumn title={siteSettings.footer_services_title || "Products"} links={serviceLinks} />
            <FooterLinkColumn title={siteSettings.footer_legal_title || "Legal"} links={legalLinks} />
          </div>

          <div className="border-t border-[#e6eaf0] pt-8">
            <div className="flex flex-col items-center justify-between space-y-4 md:flex-row md:space-y-0">
              <p className="text-sm text-[#6b7280]">
                &copy; {new Date().getFullYear()} {siteName}. All rights reserved.
              </p>
              <p className="text-sm text-[#6b7280]">{footerDisclaimer}</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

function FooterLinkColumn({ title, links }: { title: string; links: Array<{ label: string; href: string }> }) {
  return (
    <div>
      <h3 className="mb-4 text-lg font-bold text-[var(--bank-public-navy)]">{title}</h3>
      <ul className="space-y-3">
        {links.map((link) => (
          <li key={`${link.label}-${link.href}`}>
            <a href={link.href} className="text-[#4b5563] transition-colors hover:text-[var(--bank-public-navy)]">
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Footer;
