import { Facebook, Twitter, Instagram, Linkedin } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const Footer = () => {
  const siteSettings = useSiteSettings();
  const logoUrl = siteSettings["site_logo_url"];
  const siteName = siteSettings["site_name"] || "MicroFinance Bank";

  return (
    <footer className="bg-[var(--bank-navy)] text-primary-foreground">
      <div className="container mx-auto px-4 py-5 md:hidden">
        <div className="flex items-center justify-between gap-4 text-[11px] text-white/75">
          <p>
            &copy; {new Date().getFullYear()} {siteName}
          </p>
          <div className="flex items-center gap-4">
            <a href="#" className="transition-colors hover:text-[var(--bank-gold)]">Privacy</a>
            <a href="#" className="transition-colors hover:text-[var(--bank-gold)]">Terms</a>
          </div>
        </div>
      </div>

      <div className="hidden md:block py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={siteName}
                    style={{ height: "36px", width: "auto", objectFit: "contain" }}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                    <span className="text-accent-foreground font-bold text-xl">M</span>
                  </div>
                )}
                <span className="text-xl font-bold">{siteName}</span>
              </div>
              <p className="text-primary-foreground/80 leading-relaxed">
                Empowering communities through accessible financial services since 2010.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="hover:text-accent transition-colors">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="#" className="hover:text-accent transition-colors">
                  <Twitter className="w-5 h-5" />
                </a>
                <a href="#" className="hover:text-accent transition-colors">
                  <Instagram className="w-5 h-5" />
                </a>
                <a href="#" className="hover:text-accent transition-colors">
                  <Linkedin className="w-5 h-5" />
                </a>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-4">Quick Links</h3>
              <ul className="space-y-3">
                <li><a href="#home" className="text-primary-foreground/80 hover:text-accent transition-colors">Home</a></li>
                <li><a href="#services" className="text-primary-foreground/80 hover:text-accent transition-colors">Services</a></li>
                <li><a href="#products" className="text-primary-foreground/80 hover:text-accent transition-colors">Products</a></li>
                <li><a href="#about" className="text-primary-foreground/80 hover:text-accent transition-colors">About Us</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-4">Services</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-primary-foreground/80 hover:text-accent transition-colors">Savings Account</a></li>
                <li><a href="#" className="text-primary-foreground/80 hover:text-accent transition-colors">Microloans</a></li>
                <li><a href="#" className="text-primary-foreground/80 hover:text-accent transition-colors">Business Loans</a></li>
                <li><a href="#" className="text-primary-foreground/80 hover:text-accent transition-colors">Investment Plans</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-4">Legal</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-primary-foreground/80 hover:text-accent transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-primary-foreground/80 hover:text-accent transition-colors">Terms of Service</a></li>
                <li><a href="#" className="text-primary-foreground/80 hover:text-accent transition-colors">Cookie Policy</a></li>
                <li><a href="#" className="text-primary-foreground/80 hover:text-accent transition-colors">Regulatory Compliance</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-primary-foreground/20 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <p className="text-primary-foreground/80 text-sm">
                &copy; {new Date().getFullYear()} {siteName}. All rights reserved.
              </p>
              <p className="text-primary-foreground/80 text-sm">
                Member of Deposit Insurance Corporation
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
