import { useEffect } from "react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

function setMetaTag(attr: "name" | "property", key: string, content: string) {
  let element = document.querySelector(`meta[${attr}='${key}']`) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attr, key);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

function setLinkTag(rel: string, href: string, type?: string) {
  let link = document.querySelector(`link[rel='${rel}']`) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", rel);
    document.head.appendChild(link);
  }
  if (type) {
    link.setAttribute("type", type);
  }
  link.setAttribute("href", href);
}

export default function DynamicSEO() {
  const settings = useSiteSettings();

  useEffect(() => {
    if (!Object.keys(settings).length) return;

    const siteName = settings["site_name"] || "MicroFinance Bank";
    const siteTagline = settings["site_tagline"] || "Your Partner in Financial Growth";
    const siteDescription =
      settings["site_description"] ||
      "Empowering individuals and businesses with accessible microfinance solutions.";
    const siteKeywords = settings["site_keywords"] || "microfinance, bank, loans, savings, investments";
    const ogImage = settings["site_og_image_url"] || "";
    const twitterHandle = settings["site_twitter_handle"] || "";
    const faviconUrl = settings["site_favicon_url"] || "";
    const canonicalUrl = settings["site_canonical_url"] || "";
    const googleVerification = settings["site_google_verification"] || "";

    document.title = `${siteName} — ${siteTagline}`;

    setMetaTag("name", "description", siteDescription);
    setMetaTag("name", "keywords", siteKeywords);
    setMetaTag("name", "author", siteName);
    setMetaTag("property", "og:title", siteName);
    setMetaTag("property", "og:description", siteDescription);
    setMetaTag("property", "og:image", ogImage);
    setMetaTag("name", "twitter:title", siteName);
    setMetaTag("name", "twitter:description", siteDescription);

    if (twitterHandle) {
      setMetaTag("name", "twitter:site", twitterHandle);
    }

    if (canonicalUrl) {
      let canonical = document.querySelector("link[rel='canonical']") as HTMLLinkElement | null;
      if (!canonical) {
        canonical = document.createElement("link");
        canonical.setAttribute("rel", "canonical");
        document.head.appendChild(canonical);
      }
      canonical.setAttribute("href", canonicalUrl);
    }

    if (faviconUrl) {
      const iconLink = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
      if (iconLink) {
        iconLink.setAttribute("href", faviconUrl);
      }
      setLinkTag("apple-touch-icon", faviconUrl);
    }

    if (googleVerification) {
      const value = googleVerification.includes("=")
        ? googleVerification.split("=").slice(1).join("=")
        : googleVerification;
      setMetaTag("name", "google-site-verification", value);
    }
  }, [settings]);

  return null;
}

