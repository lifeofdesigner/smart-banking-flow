import { useEffect } from "react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const DEFAULT_SITE_NAME = "Your Bank";

function setMetaTag(attr: "name" | "property", key: string, content: string) {
  if (!content) return;

  let element = document.querySelector(`meta[${attr}='${key}']`) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attr, key);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

function setLinkTag(rel: string, href: string, type?: string) {
  if (!href) return;

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

function getImageType(href: string) {
  const path = href.split("?")[0].toLowerCase();

  if (path.endsWith(".ico")) return "image/x-icon";
  if (path.endsWith(".svg")) return "image/svg+xml";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
  if (path.endsWith(".webp")) return "image/webp";
  if (path.endsWith(".gif")) return "image/gif";

  return undefined;
}

function withCacheBust(href: string) {
  if (/^(blob|data):/i.test(href)) return href;

  try {
    const url = new URL(href, window.location.origin);
    url.searchParams.set("v", Date.now().toString());
    return url.toString();
  } catch {
    const separator = href.includes("?") ? "&" : "?";
    return `${href}${separator}v=${Date.now()}`;
  }
}

function setFaviconTags(href: string) {
  const faviconHref = withCacheBust(href);
  const faviconType = getImageType(href);

  document.querySelectorAll<HTMLLinkElement>("link[rel~='icon'], link[rel='apple-touch-icon']").forEach((link) => {
    link.setAttribute("href", faviconHref);
    if (faviconType) {
      link.setAttribute("type", faviconType);
    }
  });

  setLinkTag("icon", faviconHref, faviconType);
  setLinkTag("shortcut icon", faviconHref, faviconType);
  setLinkTag("apple-touch-icon", faviconHref, faviconType);
}

const hexToHsl = (hex: string) => {
  const normalized = hex.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return "";

  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }

    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

const applyThemeSetting = (name: string, value?: string) => {
  if (!value) return;
  document.documentElement.style.setProperty(name, value);
};

export default function DynamicSEO() {
  const settings = useSiteSettings();

  useEffect(() => {
    if (!Object.keys(settings).length) return;

    const siteName = settings.site_name || DEFAULT_SITE_NAME;
    const siteTagline = settings.site_tagline || "Digital banking for modern customers";
    const siteDescription =
      settings.site_description ||
      `${siteName} provides secure digital banking, savings, loans, payments, and support.`;
    const siteKeywords = settings.site_keywords || "banking, digital banking, loans, savings, investments";
    const ogImage = settings.site_og_image_url || "";
    const twitterHandle = settings.site_twitter_handle || "";
    const faviconUrl = settings.site_favicon_url || "";
    const canonicalUrl = settings.site_canonical_url || "";
    const googleVerification = settings.site_google_verification || "";
    const currentUrl = canonicalUrl || window.location.href;
    const title = `${siteName} - ${siteTagline}`;

    document.title = title;

    setMetaTag("name", "description", siteDescription);
    setMetaTag("name", "keywords", siteKeywords);
    setMetaTag("name", "author", siteName);
    setMetaTag("property", "og:site_name", siteName);
    setMetaTag("property", "og:title", title);
    setMetaTag("property", "og:description", siteDescription);
    setMetaTag("property", "og:type", "website");
    setMetaTag("property", "og:url", currentUrl);
    setMetaTag("property", "og:image", ogImage);
    setMetaTag("property", "og:image:secure_url", ogImage);
    setMetaTag("property", "og:image:width", settings.site_og_image_width || "1200");
    setMetaTag("property", "og:image:height", settings.site_og_image_height || "630");
    setMetaTag("name", "twitter:card", ogImage ? "summary_large_image" : "summary");
    setMetaTag("name", "twitter:title", title);
    setMetaTag("name", "twitter:description", siteDescription);
    setMetaTag("name", "twitter:image", ogImage);

    if (twitterHandle) {
      setMetaTag("name", "twitter:site", twitterHandle);
    }

    if (canonicalUrl) {
      setLinkTag("canonical", canonicalUrl);
    }

    if (faviconUrl) {
      setFaviconTags(faviconUrl);
    }

    if (googleVerification) {
      const value = googleVerification.includes("=")
        ? googleVerification.split("=").slice(1).join("=")
        : googleVerification;
      setMetaTag("name", "google-site-verification", value);
    }

    applyThemeSetting("--bank-navy", settings.theme_color_primary);
    applyThemeSetting("--bank-gold", settings.theme_color_accent);
    applyThemeSetting("--bank-slate", settings.theme_color_secondary);
    applyThemeSetting("--bank-bg", settings.theme_color_background);
    applyThemeSetting("--bank-text", settings.theme_color_text);
    applyThemeSetting("--bank-muted", settings.theme_color_muted);

    const primaryHsl = hexToHsl(settings.theme_color_primary || "");
    const accentHsl = hexToHsl(settings.theme_color_accent || "");
    const backgroundHsl = hexToHsl(settings.theme_color_background || "");
    const textHsl = hexToHsl(settings.theme_color_text || "");

    applyThemeSetting("--primary", primaryHsl);
    applyThemeSetting("--ring", primaryHsl);
    applyThemeSetting("--accent", accentHsl);
    applyThemeSetting("--background", backgroundHsl);
    applyThemeSetting("--foreground", textHsl);
  }, [settings]);

  return null;
}
