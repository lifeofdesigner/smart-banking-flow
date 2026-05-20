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
import { Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";

type SiteSettingsMap = Record<string, string>;

interface SiteSettingsManagerProps {
  adminId?: string;
}

const DEFAULTS: SiteSettingsMap = {
  site_name: "",
  site_tagline: "",
  site_description: "",
  site_keywords: "",
  site_logo_url: "",
  site_favicon_url: "",
  site_og_image_url: "",
  site_twitter_handle: "",
  site_google_verification: "",
  site_canonical_url: "",
  active_theme: "navy-gold",
  active_landing: "classic",
  signup_enabled: "true",
  demo_admin_login_enabled: "true",
};

const LANDING_THEMES = [
  {
    key: "classic",
    name: "Navy & Gold Classic",
    description: "Timeless premium banking look",
    colors: ["#0A1628", "#C9A84C", "#F4F5F7"],
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

  const uploadBrandingAsset = async (key: "site_logo_url" | "site_favicon_url" | "site_og_image_url", file?: File | null) => {
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
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="social">Social</TabsTrigger>
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
                  <Label>Logo</Label>
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
                      onChange={(e) => uploadBrandingAsset("site_logo_url", e.target.files?.[0])}
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
                      onChange={(e) => uploadBrandingAsset("site_favicon_url", e.target.files?.[0])}
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
              </div>

              <div className="rounded-xl border border-[var(--bank-navy)]/10 bg-[var(--bank-bg)]/70 p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-[var(--bank-navy)]">Demo Admin Login</p>
                    <p className="text-sm text-[var(--bank-muted)]">
                      Show or hide the admin demo login button on the public Internet Banking login page.
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
                onClick={() => saveKeys(["site_name", "site_tagline", "site_logo_url", "site_favicon_url"])}
              >
                {saving ? "Saving..." : "Save"}
              </Button>
            </CardContent>
          </Card>
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
                    onChange={(e) => uploadBrandingAsset("site_og_image_url", e.target.files?.[0])}
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
                onClick={() => saveKeys(["site_description", "site_keywords", "site_og_image_url", "site_canonical_url", "site_google_verification"])}
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
                onClick={() => saveKeys(["site_twitter_handle"])}
              >
                {saving ? "Saving..." : "Save"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

