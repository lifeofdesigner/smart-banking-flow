import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ContactSection, type HomepageSection } from "@/components/DynamicHomepageSections";

const fallbackSection: HomepageSection = {
  id: "fallback-contact",
  section_type: "contact",
  title: null,
  subtitle: "Have questions? We are here to help.",
  content: null,
  image: null,
  display_order: 0,
  is_active: true,
};

export default function Contact() {
  const siteSettings = useSiteSettings();
  const [section, setSection] = useState<HomepageSection | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchSection = async () => {
      const { data } = await supabase
        .from("homepage_sections")
        .select("id, section_type, title, subtitle, content, image, display_order, is_active")
        .eq("section_type", "contact")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!isMounted) return;
      setSection((data as HomepageSection | null) || fallbackSection);
      setLoading(false);
    };

    fetchSection();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    document.title = `Contact Us | ${siteSettings.site_name || "Your Bank"}`;
  }, [siteSettings]);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      {!loading && section ? <ContactSection section={section} /> : null}
      <Footer />
    </div>
  );
}
