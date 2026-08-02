import { useEffect, useMemo, useState } from "react";
import { Banknote, BriefcaseBusiness, House, Info, Phone } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import LiveChatWidget from "@/components/LiveChatWidget";
import LandingSplitScreen from "@/components/landing/LandingSplitScreen";
import LandingMagazine from "@/components/landing/LandingMagazine";
import LandingSoftModern from "@/components/landing/LandingSoftModern";
import LandingCinematic from "@/components/landing/LandingCinematic";
import LandingDashboardApp from "@/components/landing/LandingDashboardApp";
import LandingGeometric from "@/components/landing/LandingGeometric";
import LandingWhiteBank from "@/components/landing/LandingWhiteBank";
import { cn } from "@/lib/utils";

const landingSections = [
  { id: "home", label: "Home", icon: House },
  { id: "services", label: "Services", icon: BriefcaseBusiness },
  { id: "products", label: "Products", icon: Banknote },
  { id: "about", label: "About", icon: Info },
  { id: "contact", label: "Contact", icon: Phone },
];

function MobileLandingBottomNav() {
  const [activeSection, setActiveSection] = useState("home");

  useEffect(() => {
    const updateActiveSection = () => {
      const scrollPosition = window.scrollY + 120;
      const currentSection = landingSections.reduce((activeId, section) => {
        const element = document.getElementById(section.id);
        if (!element) {
          return activeId;
        }

        return element.offsetTop <= scrollPosition ? section.id : activeId;
      }, "home");

      setActiveSection(currentSection);
    };

    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });

    return () => {
      window.removeEventListener("scroll", updateActiveSection);
    };
  }, []);

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveSection(sectionId);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 w-full border-t border-[#E5E7EB] bg-[#ffffff] px-2 pt-2 shadow-[0_-6px_20px_rgba(15,23,42,0.08)] md:hidden"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0px)" }}
    >
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {landingSections.map((section) => {
          const Icon = section.icon;

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => scrollToSection(section.id)}
              className="flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-2xl px-1"
            >
              <Icon
                className={cn(
                  "h-[18px] w-[18px] transition-colors",
                  activeSection === section.id ? "text-[#0A1628]" : "text-[#9CA3AF]",
                )}
              />
              <span
                className={cn(
                  "text-[10px] font-medium",
                  activeSection === section.id ? "text-[#0A1628]" : "text-[#9CA3AF]",
                )}
              >
                {section.label}
              </span>
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full transition-opacity",
                  activeSection === section.id ? "bg-[var(--bank-gold)] opacity-100" : "opacity-0",
                )}
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
}

const Index = () => {
  const siteSettings = useSiteSettings();
  const activeLanding = siteSettings["active_landing"] || "classic";

  const landingContent = useMemo(() => {
    switch (activeLanding) {
      case "split-screen":
        return <LandingSplitScreen />;
      case "magazine":
        return <LandingMagazine />;
      case "soft-modern":
        return <LandingSoftModern />;
      case "cinematic":
        return <LandingCinematic />;
      case "dashboard-app":
        return <LandingDashboardApp />;
      case "geometric":
        return <LandingGeometric />;
      case "classic":
      default:
        return <LandingWhiteBank />;
    }
  }, [activeLanding]);

  return (
    <div className="overflow-x-hidden pb-[84px] md:pb-0">
      {landingContent}
      <MobileLandingBottomNav />
      <LiveChatWidget variant="landing" />
    </div>
  );
};

export default Index;
