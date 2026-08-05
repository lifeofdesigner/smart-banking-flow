import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { invalidateSiteSettingsCache } from "@/hooks/useSiteSettings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImagePicker } from "@/components/admin/ImagePicker";
import WireTransferVerificationManager from "@/components/admin/WireTransferVerificationManager";
import { Upload, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

type SiteSettingsMap = Record<string, string>;

type FooterLink = { label: string; href: string };

const parseFooterLinks = (json: string): FooterLink[] => {
  if (!json.trim()) return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item === "object")
      .map((item) => ({ label: String(item.label || ""), href: String(item.href || "") }));
  } catch {
    return [];
  }
};

function FooterLinksEditor({
  title,
  helperText,
  links,
  onChange,
}: {
  title: string;
  helperText: string;
  links: FooterLink[];
  onChange: (links: FooterLink[]) => void;
}) {
  const updateLink = (index: number, field: "label" | "href", value: string) => {
    onChange(links.map((link, i) => (i === index ? { ...link, [field]: value } : link)));
  };

  const removeLink = (index: number) => {
    onChange(links.filter((_, i) => i !== index));
  };

  const addLink = () => {
    onChange([...links, { label: "", href: "" }]);
  };

  return (
    <div className="space-y-3 rounded-xl border border-[var(--bank-navy)]/10 bg-[var(--bank-bg)]/70 p-4">
      <div>
        <p className="text-sm font-semibold text-[var(--bank-navy)]">{title}</p>
        <p className="text-xs text-[var(--bank-muted)]">{helperText}</p>
      </div>
      {links.length === 0 ? (
        <p className="text-xs text-muted-foreground">No links yet — add one below.</p>
      ) : (
        <div className="space-y-2">
          {links.map((link, index) => (
            <div key={index} className="flex flex-col gap-2 rounded-lg border border-border bg-white p-2.5 sm:flex-row sm:items-center">
              <Input
                placeholder="Link text (e.g. Privacy Policy)"
                value={link.label}
                onChange={(e) => updateLink(index, "label", e.target.value)}
                className="sm:w-1/3"
              />
              <Input
                placeholder="Where it goes: /about, /contact, or https://..."
                value={link.href}
                onChange={(e) => updateLink(index, "href", e.target.value)}
                className="flex-1"
              />
              <Button type="button" variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => removeLink(index)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <Button type="button" variant="outline" size="sm" onClick={addLink}>
        <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Link
      </Button>
    </div>
  );
}

interface SiteSettingsManagerProps {
  adminId?: string;
}

const DEFAULTS: SiteSettingsMap = {
  site_name: "",
  site_tagline: "",
  site_description: "",
  site_keywords: "",
  deposit_insurer_name: "Deposit Insurance Corporation",
  site_logo_url: "",
  mobile_logo_url: "",
  show_brand_name_beside_logo: "true",
  show_mobile_brand_name_beside_logo: "true",
  logo_height_mobile: "32",
  logo_height_tablet: "40",
  logo_height_desktop: "44",
  site_favicon_url: "",
  site_og_image_url: "",
  site_twitter_handle: "",
  site_google_verification: "",
  site_canonical_url: "",
  site_og_image_width: "1200",
  site_og_image_height: "630",
  brand_initials: "",
  support_email: "",
  support_phone: "",
  support_hours: "",
  contact_section_title: "",
  contact_section_subtitle: "",
  contact_address_line_1: "",
  contact_address_line_2: "",
  contact_phone_primary: "",
  contact_phone_secondary: "",
  contact_email_primary: "",
  contact_email_secondary: "",
  contact_hours_line_1: "",
  contact_hours_line_2: "",
  footer_description: "",
  footer_disclaimer: "",
  footer_quick_links_title: "Quick Links",
  footer_services_title: "Services",
  footer_legal_title: "Legal",
  footer_quick_links_json: "",
  footer_service_links_json: "",
  footer_legal_links_json: "",
  footer_privacy_url: "",
  footer_terms_url: "",
  footer_cookie_url: "",
  footer_compliance_url: "",
  social_facebook_url: "",
  social_x_url: "",
  social_instagram_url: "",
  social_linkedin_url: "",
  announcement_enabled: "false",
  announcement_title: "",
  announcement_message: "",
  announcement_link_label: "",
  announcement_link_url: "",
  theme_color_primary: "#0A1628",
  theme_color_accent: "#C9A84C",
  theme_color_secondary: "#2C4A7C",
  theme_color_background: "#F4F5F7",
  theme_color_text: "#1A2332",
  theme_color_muted: "#6B7A8D",
  theme_color_public_primary: "#003478",
  theme_color_public_accent: "#C41230",
  hero_badge_text: "",
  hero_primary_cta_label: "",
  hero_secondary_cta_label: "",
  hero_stat_1_value: "",
  hero_stat_1_label: "",
  hero_stat_2_value: "",
  hero_stat_2_label: "",
  hero_stat_3_value: "",
  hero_stat_3_label: "",
  hero_image_alt: "",
  market_widget_enabled: "false",
  market_widget_title: "Market Watch",
  forex_base_currency: "USD",
  forex_quote_currencies: "EUR,GBP,NGN",
  stock_symbols: "AAPL,MSFT,TSLA",
  active_theme: "navy-gold",
  active_landing: "classic",
  signup_enabled: "true",
  demo_admin_login_enabled: "true",
  demo_customer_login_enabled: "true",
  pwa_prompt_enabled: "false",
  pwa_prompt_style: "bottom_sheet",
  pwa_prompt_position: "bottom-right",
  pwa_prompt_trigger: "first_visit",
  pwa_prompt_visit_threshold: "3",
  pwa_prompt_reappear_days: "7",
  pwa_prompt_icon_url: "",
  pwa_prompt_title: "Install Our App",
  pwa_prompt_subtitle: "Bank smarter, faster",
  pwa_prompt_description: "Add our app to your home screen for instant access to your accounts, with a faster, more secure, native app-like experience.",
  pwa_prompt_benefit_1: "Faster access to your accounts",
  pwa_prompt_benefit_2: "Enhanced security with biometric login",
  pwa_prompt_benefit_3: "Works like a native app, right from your home screen",
  pwa_prompt_primary_label: "Install App",
  pwa_prompt_secondary_label: "Not Now",
  pwa_prompt_cta_url: "",
  pwa_prompt_bg_color: "#0A1628",
  pwa_prompt_accent_color: "#C9A84C",
  wire_transfer_verification_display_mode: "sequential",
};

const LANDING_THEMES = [
  {
    key: "classic",
    name: "White Retail Banking",
    description: "Dense white banking homepage with login, offers, education, and support sections",
    colors: ["#ffffff", "#003478", "#c41230"],
  },
  {
    key: "split-screen",
    name: "Split Screen Bold",
    description: "High-contrast hero with dashboard split",
    colors: ["#0A1628", "#C9A84C", "#ffffff"],
  },
  {
    key: "magazine",
    name: "Editorial Magazine",
    description: "Typography-first black and white style",
    colors: ["#000000", "#E53E3E", "#ffffff"],
  },
  {
    key: "soft-modern",
    name: "Soft Modern",
    description: "Rounded fintech interface with indigo tones",
    colors: ["#4F46E5", "#F0F4FF", "#ffffff"],
  },
  {
    key: "cinematic",
    name: "Cinematic Dark",
    description: "Luxury dark visuals with gold accents",
    colors: ["#1a1a2e", "#D4AF37", "#0F0F1A"],
  },
  {
    key: "dashboard-app",
    name: "App Dashboard",
    description: "Product-focused app interface layout",
    colors: ["#111827", "#22C55E", "#ffffff"],
  },
  {
    key: "geometric",
    name: "Geometric Corporate",
    description: "Structured corporate style with royal blue",
    colors: ["#1E40AF", "#ffffff", "#EFF6FF"],
  },
];

const DASHBOARD_COLOR_THEMES = [
  { key: "navy-gold", label: "Navy Gold", colors: ["#0A1628", "#C9A84C", "#F4F5F7"] },
  { key: "forest-amber", label: "Forest Amber", colors: ["#14532D", "#F59E0B", "#ECFCCB"] },
  { key: "midnight-steel", label: "Midnight Steel", colors: ["#0F172A", "#64748B", "#E2E8F0"] },
  { key: "ivory-burgundy", label: "Ivory Burgundy", colors: ["#7F1D1D", "#FEF2F2", "#E7E5E4"] },
  { key: "slate-teal", label: "Slate Teal", colors: ["#1E293B", "#0F766E", "#CCFBF1"] },
  { key: "royal-purple", label: "Royal Purple", colors: ["#4C1D95", "#8B5CF6", "#F5F3FF"] },
];

export default function SiteSettingsManager({ adminId }: SiteSettingsManagerProps) {
  const [settings, setSettings] = useState<SiteSettingsMap>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [togglingRegistration, setTogglingRegistration] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const descriptionLength = useMemo(() => (settings.site_description || "").length, [settings.site_description]);

  const fetchSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("site_settings").select("key, value");
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    const map = (data || []).reduce<SiteSettingsMap>((acc, row) => {
      acc[row.key] = row.value || "";
      return acc;
    }, { ...DEFAULTS });

    setSettings(map);
    setLoading(false);
  };

  const setSetting = (key: keyof SiteSettingsMap, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const registrationOpen = settings.signup_enabled !== "false";
  const demoAdminLoginVisible = settings.demo_admin_login_enabled !== "false";
  const demoCustomerLoginVisible = settings.demo_customer_login_enabled !== "false";
  const showBrandNameBesideLogo = settings.show_brand_name_beside_logo !== "false";
  const showMobileBrandNameBesideLogo = settings.show_mobile_brand_name_beside_logo !== "false";

  const saveKeys = async (keys: string[]) => {
    setSaving(true);

    const payload = keys.map((key) => ({
      key,
      value: settings[key] ?? "",
      updated_by: adminId ?? null,
    }));

    const { error } = await supabase
      .from("site_settings")
      .upsert(payload, { onConflict: "key" });

    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    invalidateSiteSettingsCache();
    toast.success("Settings saved");
  };

  const saveSingleKey = async (key: string, value: string, successMessage: string) => {
    const { error } = await supabase.from("site_settings").upsert(
      {
        key,
        value,
        updated_by: adminId ?? null,
      },
      { onConflict: "key" }
    );

    if (error) {
      toast.error(error.message);
      return;
    }

    setSettings((prev) => ({ ...prev, [key]: value }));
    invalidateSiteSettingsCache();
    toast.success(successMessage);
  };

  const toggleRegistration = async (checked: boolean) => {
    const previousValue = settings.signup_enabled ?? "true";
    const nextValue = checked ? "true" : "false";

    setTogglingRegistration(true);
    setSetting("signup_enabled", nextValue);

    const { error } = await supabase.from("site_settings").upsert(
      {
        key: "signup_enabled",
        value: nextValue,
        updated_by: adminId ?? null,
      },
      { onConflict: "key" }
    );

    setTogglingRegistration(false);

    if (error) {
      setSetting("signup_enabled", previousValue);
      toast.error(error.message);
      return;
    }

    toast.success(checked ? "Registration is now open" : "Registration is now closed");
    invalidateSiteSettingsCache();
  };

  const toggleDemoAdminLogin = async (checked: boolean) => {
    const previousValue = settings.demo_admin_login_enabled ?? "true";
    const nextValue = checked ? "true" : "false";

    setSetting("demo_admin_login_enabled", nextValue);

    const { error } = await supabase.from("site_settings").upsert(
      {
        key: "demo_admin_login_enabled",
        value: nextValue,
        updated_by: adminId ?? null,
      },
      { onConflict: "key" }
    );

    if (error) {
      setSetting("demo_admin_login_enabled", previousValue);
      toast.error(error.message);
      return;
    }

    invalidateSiteSettingsCache();
    toast.success(checked ? "Demo admin login is visible" : "Demo admin login is hidden");
  };

  const toggleDemoCustomerLogin = async (checked: boolean) => {
    const previousValue = settings.demo_customer_login_enabled ?? "true";
    const nextValue = checked ? "true" : "false";

    setSetting("demo_customer_login_enabled", nextValue);

    const { error } = await supabase.from("site_settings").upsert(
      {
        key: "demo_customer_login_enabled",
        value: nextValue,
        updated_by: adminId ?? null,
      },
      { onConflict: "key" }
    );

    if (error) {
      setSetting("demo_customer_login_enabled", previousValue);
      toast.error(error.message);
      return;
    }

    invalidateSiteSettingsCache();
    toast.success(checked ? "Demo customer login is visible" : "Demo customer login is hidden");
  };

  const uploadBrandingAsset = async (key: "site_logo_url" | "mobile_logo_url" | "site_favicon_url" | "site_og_image_url", file?: File | null) => {
    if (!file) return;

    try {
      setUploadingKey(key);
      const safeName = file.name.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9._-]/g, "");
      const path = `branding/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage.from("cms-media").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("cms-media").getPublicUrl(path);
      const publicUrl = data.publicUrl;

      const { error: saveError } = await supabase
        .from("site_settings")
        .upsert(
          {
            key,
            value: publicUrl,
            updated_by: adminId ?? null,
          },
          { onConflict: "key" }
        );

      if (saveError) throw saveError;

      setSetting(key, publicUrl);
      invalidateSiteSettingsCache();
      toast.success("Settings saved");
    } catch (error: unknown) {
      toast.error(error?.message || "Upload failed");
    } finally {
      setUploadingKey(null);
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading site settings...</div>;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="themes">
        <TabsList className="flex-wrap">
          <TabsTrigger value="themes">Themes</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="banking">Banking Settings</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="social">Social</TabsTrigger>
          <TabsTrigger value="banking">Banking</TabsTrigger>
          <TabsTrigger value="markets">Markets</TabsTrigger>
          <TabsTrigger value="pwa">Mobile App</TabsTrigger>
        </TabsList>

        <TabsContent value="themes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Landing Page Theme</CardTitle>
              <CardDescription>Choose how your public website looks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {LANDING_THEMES.map((theme) => {
                  const isActive = settings.active_landing === theme.key;
                  return (
                    <button
                      key={theme.key}
                      type="button"
                      onClick={() => saveSingleKey("active_landing", theme.key, "Theme updated — refresh your site to see changes")}
                      className={`rounded-lg border bg-card p-4 text-left transition hover:shadow-md ${
                        isActive ? "border-[#C9A84C] ring-1 ring-[#C9A84C]/30" : "border-border"
                      }`}
                    >
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-semibold">{theme.name}</h4>
                          <p className="mt-1 text-xs text-muted-foreground">{theme.description}</p>
                        </div>
                        {isActive && (
                          <span className="rounded-full bg-[#C9A84C] px-2 py-0.5 text-[10px] font-semibold text-[#0A1628]">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {theme.colors.map((color) => (
                          <span
                            key={`${theme.key}-${color}`}
                            className="h-4 w-4 rounded-full border border-black/10"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dashboard Color Theme</CardTitle>
              <CardDescription>Choose admin dashboard accent colors</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {DASHBOARD_COLOR_THEMES.map((theme) => {
                  const isActive = settings.active_theme === theme.key;
                  return (
                    <button
                      key={theme.key}
                      type="button"
                      onClick={() => saveSingleKey("active_theme", theme.key, "Dashboard color theme updated")}
                      className={`rounded-lg border p-4 text-left transition hover:shadow-md ${
                        isActive ? "border-[#C9A84C] ring-1 ring-[#C9A84C]/30" : "border-border"
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold">{theme.label}</p>
                        {isActive && (
                          <span className="rounded-full bg-[#C9A84C] px-2 py-0.5 text-[10px] font-semibold text-[#0A1628]">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {theme.colors.map((color) => (
                          <span
                            key={`${theme.key}-${color}`}
                            className="h-4 w-4 rounded-full border border-black/10"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Custom Color Tokens</CardTitle>
              <CardDescription>Override the public site and dashboard colors for white-label deployments.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[
                ["theme_color_primary", "Primary / Navy"],
                ["theme_color_accent", "Accent / Gold"],
                ["theme_color_secondary", "Secondary"],
                ["theme_color_background", "Background"],
                ["theme_color_text", "Text"],
                ["theme_color_muted", "Muted Text"],
              ].map(([key, label]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={key}>{label}</Label>
                  <div className="flex gap-2">
                    <Input
                      id={key}
                      type="color"
                      value={settings[key] || "#000000"}
                      onChange={(e) => setSetting(key, e.target.value)}
                      className="h-11 w-16 p-1"
                    />
                    <Input value={settings[key] || ""} onChange={(e) => setSetting(key, e.target.value)} />
                  </div>
                </div>
              ))}
              <div className="md:col-span-2 xl:col-span-3">
                <Button
                  disabled={saving}
                  className="bg-[var(--bank-navy)] text-white hover:bg-[var(--bank-navy)]/90"
                  onClick={() => saveKeys([
                    "theme_color_primary",
                    "theme_color_accent",
                    "theme_color_secondary",
                    "theme_color_background",
                    "theme_color_text",
                    "theme_color_muted",
                  ])}
                >
                  {saving ? "Saving..." : "Save Colors"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Public Site Colors</CardTitle>
              <CardDescription>
                Navy/accent colors for the public marketing site only (homepage, navigation, footer, product pages).
                Does not affect the internal dashboard/admin theme above.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {[
                ["theme_color_public_primary", "Public Primary / Navy"],
                ["theme_color_public_accent", "Public Accent"],
              ].map(([key, label]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={key}>{label}</Label>
                  <div className="flex gap-2">
                    <Input
                      id={key}
                      type="color"
                      value={settings[key] || "#000000"}
                      onChange={(e) => setSetting(key, e.target.value)}
                      className="h-11 w-16 p-1"
                    />
                    <Input value={settings[key] || ""} onChange={(e) => setSetting(key, e.target.value)} />
                  </div>
                </div>
              ))}
              <div className="md:col-span-2">
                <Button
                  disabled={saving}
                  className="bg-[var(--bank-public-navy)] text-white hover:bg-[var(--bank-public-navy)]/90"
                  onClick={() => saveKeys(["theme_color_public_primary", "theme_color_public_accent"])}
                >
                  {saving ? "Saving..." : "Save Public Site Colors"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="banking" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Wire Transfer Verification</CardTitle>
              <CardDescription>Choose how wire transfer verification steps are displayed for customers.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="wire-transfer-verification-display-mode">Verification Display Mode</Label>
                  <Select
                    id="wire-transfer-verification-display-mode"
                    value={settings.wire_transfer_verification_display_mode || "sequential"}
                    onValueChange={(value) => saveSingleKey("wire_transfer_verification_display_mode", value, "Wire transfer verification display mode saved")}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sequential">Sequential</SelectItem>
                      <SelectItem value="show_all">Show All</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Sequential shows only the current active step. Show All displays every enabled step immediately while preserving verification order.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Branding Assets</CardTitle>
              <CardDescription>Manage logo, favicon, and identity text.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label>Desktop Logo</Label>
                  {settings.site_logo_url ? (
                    <img src={settings.site_logo_url} alt="Site logo" className="h-20 w-auto rounded border border-border bg-white p-2" />
                  ) : (
                    <div className="h-20 rounded border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground">
                      No logo uploaded
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      id="site-logo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.currentTarget.files?.[0];
                        e.currentTarget.value = "";
                        void uploadBrandingAsset("site_logo_url", file);
                      }}
                    />
                    <Button asChild variant="outline" disabled={uploadingKey === "site_logo_url"}>
                      <label htmlFor="site-logo-upload" className="cursor-pointer">
                        <Upload className="w-4 h-4 mr-2" />
                        {uploadingKey === "site_logo_url" ? "Uploading..." : "Upload / Replace"}
                      </label>
                    </Button>
                    <Button variant="destructive" onClick={() => setSetting("site_logo_url", "")}>
                      <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Mobile Logo</Label>
                  {settings.mobile_logo_url ? (
                    <img src={settings.mobile_logo_url} alt="Mobile logo" className="h-16 w-auto rounded border border-border bg-white p-2" />
                  ) : (
                    <div className="h-16 rounded border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground">
                      Uses desktop logo when empty
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      id="mobile-logo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.currentTarget.files?.[0];
                        e.currentTarget.value = "";
                        void uploadBrandingAsset("mobile_logo_url", file);
                      }}
                    />
                    <Button asChild variant="outline" disabled={uploadingKey === "mobile_logo_url"}>
                      <label htmlFor="mobile-logo-upload" className="cursor-pointer">
                        <Upload className="w-4 h-4 mr-2" />
                        {uploadingKey === "mobile_logo_url" ? "Uploading..." : "Upload / Replace"}
                      </label>
                    </Button>
                    <Button variant="destructive" onClick={() => setSetting("mobile_logo_url", "")}>
                      <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Favicon</Label>
                  {settings.site_favicon_url ? (
                    <img src={settings.site_favicon_url} alt="Site favicon" className="h-8 w-8 rounded border border-border" />
                  ) : (
                    <div className="h-8 w-8 rounded border border-dashed border-border" />
                  )}
                  <div className="flex gap-2">
                    <Input
                      id="site-favicon-upload"
                      type="file"
                      accept="image/*,.ico"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.currentTarget.files?.[0];
                        e.currentTarget.value = "";
                        void uploadBrandingAsset("site_favicon_url", file);
                      }}
                    />
                    <Button asChild variant="outline" disabled={uploadingKey === "site_favicon_url"}>
                      <label htmlFor="site-favicon-upload" className="cursor-pointer">
                        <Upload className="w-4 h-4 mr-2" />
                        {uploadingKey === "site_favicon_url" ? "Uploading..." : "Upload / Replace"}
                      </label>
                    </Button>
                    <Button variant="destructive" onClick={() => setSetting("site_favicon_url", "")}>
                      <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </Button>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--bank-navy)]/10 bg-[var(--bank-bg)]/70 p-4 space-y-5">
                <div>
                  <p className="text-sm font-semibold text-[var(--bank-navy)]">Logo Size</p>
                  <p className="text-sm text-[var(--bank-muted)]">
                    Resize the logo shown in the website header and footer for each device size.
                  </p>
                </div>
                {([
                  ["logo_height_mobile", "Mobile", 20, 56],
                  ["logo_height_tablet", "Tablet", 24, 64],
                  ["logo_height_desktop", "Desktop", 28, 72],
                ] as const).map(([key, label, min, max]) => {
                  const currentValue = Number(settings[key]) || (key === "logo_height_mobile" ? 32 : key === "logo_height_tablet" ? 40 : 44);
                  return (
                    <div key={key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>{label}</Label>
                        <span className="text-xs text-muted-foreground">{currentValue}px</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <Slider
                          min={min}
                          max={max}
                          step={1}
                          value={[currentValue]}
                          onValueChange={([v]) => setSetting(key, String(v))}
                          className="flex-1"
                        />
                        {settings.site_logo_url ? (
                          <div className="flex h-16 w-20 flex-shrink-0 items-center justify-center rounded border border-border bg-white">
                            <img src={settings.site_logo_url} alt="Logo size preview" style={{ height: `${currentValue}px` }} className="w-auto object-contain" />
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
                <Button
                  disabled={saving}
                  size="sm"
                  className="bg-[var(--bank-navy)] text-white hover:bg-[var(--bank-navy)]/90"
                  onClick={() => saveKeys(["logo_height_mobile", "logo_height_tablet", "logo_height_desktop"])}
                >
                  {saving ? "Saving..." : "Save Logo Size"}
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="site-name">Bank Name</Label>
                  <Input
                    id="site-name"
                    value={settings.site_name}
                    onChange={(e) => setSetting("site_name", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="site-tagline">Tagline</Label>
                  <Input
                    id="site-tagline"
                    value={settings.site_tagline}
                    onChange={(e) => setSetting("site_tagline", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deposit-insurer-name">Deposit Insurer Name</Label>
                  <Input
                    id="deposit-insurer-name"
                    value={settings.deposit_insurer_name}
                    onChange={(e) => setSetting("deposit_insurer_name", e.target.value)}
                    placeholder="e.g. FDIC, NDIC, Deposit Insurance Corporation"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-[var(--bank-navy)]/10 bg-[var(--bank-bg)]/70 p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-[var(--bank-navy)]">Brand Name Beside Logo</p>
                    <p className="text-sm text-[var(--bank-muted)]">
                      Show or hide the bank name next to the logo in website and banking navigation.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-xs font-medium text-[var(--bank-muted)]">Current status:</span>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                          showBrandNameBesideLogo
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {showBrandNameBesideLogo ? "Visible" : "Hidden"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Label htmlFor="show-brand-name-beside-logo" className="text-sm font-medium text-[var(--bank-navy)]">
                      Show Brand Name
                    </Label>
                    <Switch
                      id="show-brand-name-beside-logo"
                      checked={showBrandNameBesideLogo}
                      onCheckedChange={(checked) => setSetting("show_brand_name_beside_logo", checked ? "true" : "false")}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--bank-navy)]/10 bg-[var(--bank-bg)]/70 p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-[var(--bank-navy)]">Mobile Brand Name Beside Logo</p>
                    <p className="text-sm text-[var(--bank-muted)]">
                      Show or hide the bank name next to the mobile logo only.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-xs font-medium text-[var(--bank-muted)]">Current status:</span>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                          showMobileBrandNameBesideLogo
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {showMobileBrandNameBesideLogo ? "Visible" : "Hidden"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Label htmlFor="show-mobile-brand-name-beside-logo" className="text-sm font-medium text-[var(--bank-navy)]">
                      Show Mobile Brand Name
                    </Label>
                    <Switch
                      id="show-mobile-brand-name-beside-logo"
                      checked={showMobileBrandNameBesideLogo}
                      onCheckedChange={(checked) => setSetting("show_mobile_brand_name_beside_logo", checked ? "true" : "false")}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--bank-navy)]/10 bg-[var(--bank-bg)]/70 p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-[var(--bank-navy)]">Demo Admin Login</p>
                    <p className="text-sm text-[var(--bank-muted)]">
                      Show or hide the demo button on the separate admin login page.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-xs font-medium text-[var(--bank-muted)]">Current status:</span>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                          demoAdminLoginVisible
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {demoAdminLoginVisible ? "Visible" : "Hidden"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Label htmlFor="demo-admin-login-enabled" className="text-sm font-medium text-[var(--bank-navy)]">
                      Show Demo Admin
                    </Label>
                    <Switch
                      id="demo-admin-login-enabled"
                      checked={demoAdminLoginVisible}
                      onCheckedChange={toggleDemoAdminLogin}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--bank-navy)]/10 bg-[var(--bank-bg)]/70 p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-[var(--bank-navy)]">Demo Customer Login</p>
                    <p className="text-sm text-[var(--bank-muted)]">
                      Show or hide the demo button on the regular customer login page.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-xs font-medium text-[var(--bank-muted)]">Current status:</span>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                          demoCustomerLoginVisible
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {demoCustomerLoginVisible ? "Visible" : "Hidden"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Label htmlFor="demo-customer-login-enabled" className="text-sm font-medium text-[var(--bank-navy)]">
                      Show Demo Customer
                    </Label>
                    <Switch
                      id="demo-customer-login-enabled"
                      checked={demoCustomerLoginVisible}
                      onCheckedChange={toggleDemoCustomerLogin}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--bank-navy)]/10 bg-[var(--bank-bg)]/70 p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-[var(--bank-navy)]">Registration Settings</p>
                    <p className="text-sm text-[var(--bank-muted)]">
                      Allow or pause new self-service account registrations from the public auth page.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-xs font-medium text-[var(--bank-muted)]">Current status:</span>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                          registrationOpen
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {registrationOpen ? "Open" : "Closed"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Label htmlFor="signup-enabled" className="text-sm font-medium text-[var(--bank-navy)]">
                      Allow New Registrations
                    </Label>
                    <Switch
                      id="signup-enabled"
                      checked={registrationOpen}
                      disabled={togglingRegistration}
                      onCheckedChange={toggleRegistration}
                    />
                  </div>
                </div>
              </div>

              <Button
                disabled={saving}
                className="bg-[var(--bank-navy)] hover:bg-[var(--bank-navy)]/90 text-white"
                onClick={() => saveKeys([
                  "site_name",
                  "site_tagline",
                  "deposit_insurer_name",
                  "site_logo_url",
                  "mobile_logo_url",
                  "site_favicon_url",
                  "show_brand_name_beside_logo",
                  "show_mobile_brand_name_beside_logo",
                ])}
              >
                {saving ? "Saving..." : "Save"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Homepage Hero Controls</CardTitle>
              <CardDescription>Control the public hero badges, CTAs, stats, and image alt text.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Hero Badge</Label>
                  <Input value={settings.hero_badge_text} onChange={(e) => setSetting("hero_badge_text", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Hero Image Alt Text</Label>
                  <Input value={settings.hero_image_alt} onChange={(e) => setSetting("hero_image_alt", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Primary CTA Label</Label>
                  <Input value={settings.hero_primary_cta_label} onChange={(e) => setSetting("hero_primary_cta_label", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Secondary CTA Label</Label>
                  <Input value={settings.hero_secondary_cta_label} onChange={(e) => setSetting("hero_secondary_cta_label", e.target.value)} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {[1, 2, 3].map((index) => (
                  <div key={index} className="rounded-lg border p-4">
                    <p className="mb-3 text-sm font-semibold">Stat {index}</p>
                    <div className="space-y-2">
                      <Input
                        placeholder="Value"
                        value={settings[`hero_stat_${index}_value`] || ""}
                        onChange={(e) => setSetting(`hero_stat_${index}_value`, e.target.value)}
                      />
                      <Input
                        placeholder="Label"
                        value={settings[`hero_stat_${index}_label`] || ""}
                        onChange={(e) => setSetting(`hero_stat_${index}_label`, e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <Button
                disabled={saving}
                className="bg-[var(--bank-navy)] text-white hover:bg-[var(--bank-navy)]/90"
                onClick={() => saveKeys([
                  "hero_badge_text",
                  "hero_image_alt",
                  "hero_primary_cta_label",
                  "hero_secondary_cta_label",
                  "hero_stat_1_value",
                  "hero_stat_1_label",
                  "hero_stat_2_value",
                  "hero_stat_2_label",
                  "hero_stat_3_value",
                  "hero_stat_3_label",
                ])}
              >
                {saving ? "Saving..." : "Save Hero Controls"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Announcement</CardTitle>
              <CardDescription>Add a site-wide announcement banner above the public navbar.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="text-sm font-semibold">Announcement Banner</p>
                  <p className="text-sm text-muted-foreground">Show this message on the public website.</p>
                </div>
                <Switch
                  checked={settings.announcement_enabled === "true"}
                  onCheckedChange={(checked) => setSetting("announcement_enabled", checked ? "true" : "false")}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={settings.announcement_title} onChange={(e) => setSetting("announcement_title", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Link Label</Label>
                  <Input value={settings.announcement_link_label} onChange={(e) => setSetting("announcement_link_label", e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Message</Label>
                  <Textarea value={settings.announcement_message} onChange={(e) => setSetting("announcement_message", e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Link URL</Label>
                  <Input value={settings.announcement_link_url} onChange={(e) => setSetting("announcement_link_url", e.target.value)} />
                </div>
              </div>
              <Button
                disabled={saving}
                className="bg-[var(--bank-navy)] text-white hover:bg-[var(--bank-navy)]/90"
                onClick={() => saveKeys(["announcement_enabled", "announcement_title", "announcement_message", "announcement_link_label", "announcement_link_url"])}
              >
                {saving ? "Saving..." : "Save Announcement"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact & Footer</CardTitle>
              <CardDescription>Update support details and footer copy shown across the public site and dashboard.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Support Email</Label>
                  <Input value={settings.support_email} onChange={(e) => setSetting("support_email", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Support Phone</Label>
                  <Input value={settings.support_phone} onChange={(e) => setSetting("support_phone", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Support Hours</Label>
                  <Input value={settings.support_hours} onChange={(e) => setSetting("support_hours", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Brand Initials</Label>
                  <Input value={settings.brand_initials} onChange={(e) => setSetting("brand_initials", e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Footer Description</Label>
                  <Textarea value={settings.footer_description} onChange={(e) => setSetting("footer_description", e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Footer Disclaimer</Label>
                  <Input value={settings.footer_disclaimer} onChange={(e) => setSetting("footer_disclaimer", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Address Line 1</Label>
                  <Input value={settings.contact_address_line_1} onChange={(e) => setSetting("contact_address_line_1", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Address Line 2</Label>
                  <Input value={settings.contact_address_line_2} onChange={(e) => setSetting("contact_address_line_2", e.target.value)} />
                </div>
              </div>
              <Button
                disabled={saving}
                className="bg-[var(--bank-navy)] text-white hover:bg-[var(--bank-navy)]/90"
                onClick={() => saveKeys([
                  "support_email",
                  "support_phone",
                  "support_hours",
                  "brand_initials",
                  "footer_description",
                  "footer_disclaimer",
                  "contact_address_line_1",
                  "contact_address_line_2",
                ])}
              >
                {saving ? "Saving..." : "Save Content"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Footer Links</CardTitle>
              <CardDescription>The link columns shown at the bottom of every page. Use a path like /about or a full https:// URL.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Quick Links Column Title</Label>
                  <Input value={settings.footer_quick_links_title} onChange={(e) => setSetting("footer_quick_links_title", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Products Column Title</Label>
                  <Input value={settings.footer_services_title} onChange={(e) => setSetting("footer_services_title", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Legal Column Title</Label>
                  <Input value={settings.footer_legal_title} onChange={(e) => setSetting("footer_legal_title", e.target.value)} />
                </div>
              </div>

              <FooterLinksEditor
                title="Quick Links"
                helperText="e.g. Home, About Us, Contact Us"
                links={parseFooterLinks(settings.footer_quick_links_json)}
                onChange={(links) => setSetting("footer_quick_links_json", JSON.stringify(links))}
              />
              <FooterLinksEditor
                title="Products"
                helperText="e.g. Checking, Savings & CDs, Credit Cards"
                links={parseFooterLinks(settings.footer_service_links_json)}
                onChange={(links) => setSetting("footer_service_links_json", JSON.stringify(links))}
              />
              <FooterLinksEditor
                title="Legal"
                helperText="e.g. Privacy Policy, Terms of Service"
                links={parseFooterLinks(settings.footer_legal_links_json)}
                onChange={(links) => setSetting("footer_legal_links_json", JSON.stringify(links))}
              />

              <Button
                disabled={saving}
                className="bg-[var(--bank-navy)] text-white hover:bg-[var(--bank-navy)]/90"
                onClick={() => saveKeys([
                  "footer_quick_links_title",
                  "footer_services_title",
                  "footer_legal_title",
                  "footer_quick_links_json",
                  "footer_service_links_json",
                  "footer_legal_links_json",
                ])}
              >
                {saving ? "Saving..." : "Save Footer Links"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="banking" className="space-y-4">
          <WireTransferVerificationManager />
        </TabsContent>

        <TabsContent value="seo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SEO Settings</CardTitle>
              <CardDescription>Configure metadata and social share assets.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="site-description">Meta Description (150-160 chars recommended)</Label>
                <Textarea
                  id="site-description"
                  rows={4}
                  value={settings.site_description}
                  onChange={(e) => setSetting("site_description", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">{descriptionLength}/160</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="site-keywords">Keywords (comma separated)</Label>
                <Input
                  id="site-keywords"
                  value={settings.site_keywords}
                  onChange={(e) => setSetting("site_keywords", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Social Share Image (1200x630px recommended)</Label>
                {settings.site_og_image_url ? (
                  <img src={settings.site_og_image_url} alt="OG preview" className="w-full max-w-lg rounded border border-border" />
                ) : (
                  <div className="h-28 w-full max-w-lg rounded border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground">
                    No OG image uploaded
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    id="site-og-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.currentTarget.files?.[0];
                      e.currentTarget.value = "";
                      void uploadBrandingAsset("site_og_image_url", file);
                    }}
                  />
                  <Button asChild variant="outline" disabled={uploadingKey === "site_og_image_url"}>
                    <label htmlFor="site-og-upload" className="cursor-pointer">
                      <Upload className="w-4 h-4 mr-2" />
                      {uploadingKey === "site_og_image_url" ? "Uploading..." : "Upload / Replace"}
                    </label>
                  </Button>
                  <Button variant="destructive" onClick={() => setSetting("site_og_image_url", "")}> 
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="og-width">OG Image Width</Label>
                  <Input
                    id="og-width"
                    value={settings.site_og_image_width}
                    onChange={(e) => setSetting("site_og_image_width", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="og-height">OG Image Height</Label>
                  <Input
                    id="og-height"
                    value={settings.site_og_image_height}
                    onChange={(e) => setSetting("site_og_image_height", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="site-canonical">Canonical URL (your main domain)</Label>
                <Input
                  id="site-canonical"
                  placeholder="https://yourdomain.com"
                  value={settings.site_canonical_url}
                  onChange={(e) => setSetting("site_canonical_url", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="google-verification">Google Verification Code</Label>
                <Input
                  id="google-verification"
                  placeholder="google-site-verification=xxxxx"
                  value={settings.site_google_verification}
                  onChange={(e) => setSetting("site_google_verification", e.target.value)}
                />
              </div>

              <div className="border-l-4 border-amber-500 bg-amber-50/50 p-3 text-sm text-amber-900 rounded-r">
                After saving SEO settings, meta tags are automatically applied to your site. Submit your sitemap to Google Search Console at search.google.com/search-console
              </div>

              <Button
                disabled={saving}
                className="bg-[var(--bank-navy)] hover:bg-[var(--bank-navy)]/90 text-white"
                onClick={() => saveKeys(["site_description", "site_keywords", "site_og_image_url", "site_og_image_width", "site_og_image_height", "site_canonical_url", "site_google_verification"])}
              >
                {saving ? "Saving..." : "Save All"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Social Metadata</CardTitle>
              <CardDescription>Configure sharing identity and preview behavior.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="twitter-handle">Twitter/X handle</Label>
                <Input
                  id="twitter-handle"
                  placeholder="@yourhandle"
                  value={settings.site_twitter_handle}
                  onChange={(e) => setSetting("site_twitter_handle", e.target.value)}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Facebook URL</Label>
                  <Input value={settings.social_facebook_url} onChange={(e) => setSetting("social_facebook_url", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>X URL</Label>
                  <Input value={settings.social_x_url} onChange={(e) => setSetting("social_x_url", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Instagram URL</Label>
                  <Input value={settings.social_instagram_url} onChange={(e) => setSetting("social_instagram_url", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>LinkedIn URL</Label>
                  <Input value={settings.social_linkedin_url} onChange={(e) => setSetting("social_linkedin_url", e.target.value)} />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <Card className="bg-muted/30">
                  <CardHeader>
                    <CardTitle className="text-base">Open Graph</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Open Graph tags control how your pages appear in link previews on Facebook, LinkedIn, WhatsApp, and many messaging platforms.
                  </CardContent>
                </Card>

                <Card className="bg-muted/30">
                  <CardHeader>
                    <CardTitle className="text-base">Twitter Cards</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Twitter cards use your title, description, and social image for richer previews, improving visibility and click-through rates.
                  </CardContent>
                </Card>
              </div>

              <Button
                disabled={saving}
                className="bg-[var(--bank-navy)] hover:bg-[var(--bank-navy)]/90 text-white"
                onClick={() => saveKeys(["site_twitter_handle", "social_facebook_url", "social_x_url", "social_instagram_url", "social_linkedin_url"])}
              >
                {saving ? "Saving..." : "Save"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="markets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Forex & Stock Widget</CardTitle>
              <CardDescription>Show public market rates using free public data sources.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="text-sm font-semibold">Market Widget</p>
                  <p className="text-sm text-muted-foreground">Display exchange rates and stock links below the hero.</p>
                </div>
                <Switch
                  checked={settings.market_widget_enabled === "true"}
                  onCheckedChange={(checked) => setSetting("market_widget_enabled", checked ? "true" : "false")}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Widget Title</Label>
                  <Input value={settings.market_widget_title} onChange={(e) => setSetting("market_widget_title", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Base Currency</Label>
                  <Input value={settings.forex_base_currency} onChange={(e) => setSetting("forex_base_currency", e.target.value.toUpperCase())} />
                </div>
                <div className="space-y-2">
                  <Label>Quote Currencies</Label>
                  <Input value={settings.forex_quote_currencies} onChange={(e) => setSetting("forex_quote_currencies", e.target.value.toUpperCase())} />
                  <p className="text-xs text-muted-foreground">Comma-separated, for example EUR,GBP,NGN.</p>
                </div>
                <div className="space-y-2">
                  <Label>Stock Symbols</Label>
                  <Input value={settings.stock_symbols} onChange={(e) => setSetting("stock_symbols", e.target.value.toUpperCase())} />
                  <p className="text-xs text-muted-foreground">Comma-separated US stock symbols.</p>
                </div>
              </div>
              <Button
                disabled={saving}
                className="bg-[var(--bank-navy)] text-white hover:bg-[var(--bank-navy)]/90"
                onClick={() => saveKeys(["market_widget_enabled", "market_widget_title", "forex_base_currency", "forex_quote_currencies", "stock_symbols"])}
              >
                {saving ? "Saving..." : "Save Market Widget"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MOBILE APP (PWA INSTALL PROMPT) TAB */}
        <TabsContent value="pwa" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Install App Prompt</CardTitle>
              <CardDescription>
                Invite visitors to install this site as an app on their phone or computer. Never shown to visitors who already installed it.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="text-sm font-semibold">Show Install Prompt</p>
                  <p className="text-sm text-muted-foreground">Turn the install prompt on or off for all visitors.</p>
                </div>
                <Switch
                  checked={settings.pwa_prompt_enabled === "true"}
                  onCheckedChange={(checked) => setSetting("pwa_prompt_enabled", checked ? "true" : "false")}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Display Style</Label>
                  <p className="text-xs text-muted-foreground">How the prompt appears on screen.</p>
                  <Select value={settings.pwa_prompt_style} onValueChange={(v) => setSetting("pwa_prompt_style", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="modal">Modal (center of screen)</SelectItem>
                      <SelectItem value="bottom_sheet">Bottom Sheet</SelectItem>
                      <SelectItem value="floating_banner">Floating Banner</SelectItem>
                      <SelectItem value="notification_card">Notification Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Position</Label>
                  <p className="text-xs text-muted-foreground">Used by the Floating Banner and Notification Card styles.</p>
                  <Select value={settings.pwa_prompt_position} onValueChange={(v) => setSetting("pwa_prompt_position", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bottom-right">Bottom Right</SelectItem>
                      <SelectItem value="bottom-left">Bottom Left</SelectItem>
                      <SelectItem value="top">Top of Screen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Show Prompt</Label>
                  <Select value={settings.pwa_prompt_trigger} onValueChange={(v) => setSetting("pwa_prompt_trigger", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="first_visit">On the visitor's first visit</SelectItem>
                      <SelectItem value="after_visits">After a number of visits</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Visits Before Showing</Label>
                  <p className="text-xs text-muted-foreground">Only used when "After a number of visits" is selected.</p>
                  <Input
                    type="number"
                    min={1}
                    value={settings.pwa_prompt_visit_threshold}
                    onChange={(e) => setSetting("pwa_prompt_visit_threshold", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Reappear After Dismissal</Label>
                  <p className="text-xs text-muted-foreground">Days to wait before showing the prompt again after a visitor dismisses it.</p>
                  <Input
                    type="number"
                    min={0}
                    value={settings.pwa_prompt_reappear_days}
                    onChange={(e) => setSetting("pwa_prompt_reappear_days", e.target.value)}
                  />
                </div>
              </div>
              <Button
                disabled={saving}
                className="bg-[var(--bank-navy)] text-white hover:bg-[var(--bank-navy)]/90"
                onClick={() => saveKeys([
                  "pwa_prompt_enabled",
                  "pwa_prompt_style",
                  "pwa_prompt_position",
                  "pwa_prompt_trigger",
                  "pwa_prompt_visit_threshold",
                  "pwa_prompt_reappear_days",
                ])}
              >
                {saving ? "Saving..." : "Save Install Prompt Settings"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Install Prompt Content</CardTitle>
              <CardDescription>Everything shown inside the install prompt. Keep it short — this is a small card, not a full page.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ImagePicker
                label="Icon"
                value={settings.pwa_prompt_icon_url}
                onChange={(url) => setSetting("pwa_prompt_icon_url", url)}
                helperText="Shown at the top of the prompt. If left empty, your site logo is used."
              />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={settings.pwa_prompt_title} onChange={(e) => setSetting("pwa_prompt_title", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Subtitle</Label>
                  <Input value={settings.pwa_prompt_subtitle} onChange={(e) => setSetting("pwa_prompt_subtitle", e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={settings.pwa_prompt_description}
                  onChange={(e) => setSetting("pwa_prompt_description", e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Benefits</Label>
                <p className="text-xs text-muted-foreground">Up to three short reasons to install, shown as a checklist.</p>
                <Input
                  className="mb-2"
                  placeholder="e.g. Faster access to your accounts"
                  value={settings.pwa_prompt_benefit_1}
                  onChange={(e) => setSetting("pwa_prompt_benefit_1", e.target.value)}
                />
                <Input
                  className="mb-2"
                  placeholder="e.g. Enhanced security with biometric login"
                  value={settings.pwa_prompt_benefit_2}
                  onChange={(e) => setSetting("pwa_prompt_benefit_2", e.target.value)}
                />
                <Input
                  placeholder="e.g. Works like a native app, right from your home screen"
                  value={settings.pwa_prompt_benefit_3}
                  onChange={(e) => setSetting("pwa_prompt_benefit_3", e.target.value)}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Primary Button Label</Label>
                  <Input value={settings.pwa_prompt_primary_label} onChange={(e) => setSetting("pwa_prompt_primary_label", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Secondary Button Label</Label>
                  <Input value={settings.pwa_prompt_secondary_label} onChange={(e) => setSetting("pwa_prompt_secondary_label", e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Primary Button Link (optional)</Label>
                  <p className="text-xs text-muted-foreground">
                    Leave empty so the primary button installs the app directly. Set this only to send visitors somewhere else instead (like an app store page).
                  </p>
                  <Input
                    placeholder="https://..."
                    value={settings.pwa_prompt_cta_url}
                    onChange={(e) => setSetting("pwa_prompt_cta_url", e.target.value)}
                  />
                </div>
              </div>
              <Button
                disabled={saving}
                className="bg-[var(--bank-navy)] text-white hover:bg-[var(--bank-navy)]/90"
                onClick={() => saveKeys([
                  "pwa_prompt_icon_url",
                  "pwa_prompt_title",
                  "pwa_prompt_subtitle",
                  "pwa_prompt_description",
                  "pwa_prompt_benefit_1",
                  "pwa_prompt_benefit_2",
                  "pwa_prompt_benefit_3",
                  "pwa_prompt_primary_label",
                  "pwa_prompt_secondary_label",
                  "pwa_prompt_cta_url",
                ])}
              >
                {saving ? "Saving..." : "Save Prompt Content"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Install Prompt Colors</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {[
                ["pwa_prompt_bg_color", "Background"],
                ["pwa_prompt_accent_color", "Accent"],
              ].map(([key, label]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={key}>{label}</Label>
                  <div className="flex gap-2">
                    <Input
                      id={key}
                      type="color"
                      value={settings[key] || "#000000"}
                      onChange={(e) => setSetting(key, e.target.value)}
                      className="h-11 w-16 p-1"
                    />
                    <Input value={settings[key] || ""} onChange={(e) => setSetting(key, e.target.value)} />
                  </div>
                </div>
              ))}
              <div className="md:col-span-2">
                <Button
                  disabled={saving}
                  className="bg-[var(--bank-navy)] text-white hover:bg-[var(--bank-navy)]/90"
                  onClick={() => saveKeys(["pwa_prompt_bg_color", "pwa_prompt_accent_color"])}
                >
                  {saving ? "Saving..." : "Save Colors"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
