import { useMemo } from "react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import LiveChatWidget from "@/components/LiveChatWidget";
import LandingSplitScreen from "@/components/landing/LandingSplitScreen";
import LandingMagazine from "@/components/landing/LandingMagazine";
import LandingSoftModern from "@/components/landing/LandingSoftModern";
import LandingCinematic from "@/components/landing/LandingCinematic";
import LandingDashboardApp from "@/components/landing/LandingDashboardApp";
import LandingGeometric from "@/components/landing/LandingGeometric";
import LandingWhiteBank from "@/components/landing/LandingWhiteBank";

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
    <div className="overflow-x-hidden">
      {landingContent}
      <LiveChatWidget variant="landing" />
    </div>
  );
};

export default Index;
