import { useSiteSettings } from "@/hooks/useSiteSettings";
import LandingNavyGold from "@/components/landing/LandingNavyGold";
import LandingSplitScreen from "@/components/landing/LandingSplitScreen";
import LandingMagazine from "@/components/landing/LandingMagazine";
import LandingSoftModern from "@/components/landing/LandingSoftModern";
import LandingCinematic from "@/components/landing/LandingCinematic";
import LandingDashboardApp from "@/components/landing/LandingDashboardApp";
import LandingGeometric from "@/components/landing/LandingGeometric";

const Index = () => {
  const siteSettings = useSiteSettings();
  const activeLanding = siteSettings["active_landing"] || "classic";

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
      return <LandingNavyGold />;
  }
};

export default Index;
