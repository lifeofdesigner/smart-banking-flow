import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
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
};

export default function SiteSettingsManager({ adminId }: SiteSettingsManagerProps) {
  const [settings, setSettings] = useState<SiteSettingsMap>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

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

    toast.success("Settings saved");
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
      toast.success("Settings saved");
    } catch (error: any) {
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
      <Tabs defaultValue="branding">
        <TabsList className="flex-wrap">
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="social">Social</TabsTrigger>
        </TabsList>

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

