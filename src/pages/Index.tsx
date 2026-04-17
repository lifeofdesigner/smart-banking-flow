import { useSiteSettings } from "@/hooks/useSiteSettings";
import LiveChatWidget from "@/components/LiveChatWidget";
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

  let landingContent = <LandingNavyGold />;

  switch (activeLanding) {
    case "split-screen":
      landingContent = <LandingSplitScreen />;
      break;
    case "magazine":
      landingContent = <LandingMagazine />;
      break;
    case "soft-modern":
      landingContent = <LandingSoftModern />;
      break;
    case "cinematic":
      landingContent = <LandingCinematic />;
      break;
    case "dashboard-app":
      landingContent = <LandingDashboardApp />;
      break;
    case "geometric":
      landingContent = <LandingGeometric />;
      break;
    case "classic":
    default:
      landingContent = <LandingNavyGold />;
      break;
  }

  return (
    <>
      {landingContent}
      <LiveChatWidget />
    </>
  );
};

export default Index;
