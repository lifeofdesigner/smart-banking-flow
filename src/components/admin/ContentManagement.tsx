import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CmsEditorSheet, CmsFormSection, CmsField } from "@/components/admin/CmsEditorSheet";
import {
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  Image as ImageIcon,
  Upload,
  Award,
  Briefcase,
  Building2,
  CreditCard,
  DollarSign,
  HelpCircle,
  PiggyBank,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { ImagePicker } from "@/components/admin/ImagePicker";

/** Matches the icon keys DynamicHomepageSections/DynamicProducts know how to render. */
const ICON_OPTIONS = [
  { key: "savings", label: "Piggy bank (savings)", Icon: PiggyBank },
  { key: "dollar", label: "Dollar sign", Icon: DollarSign },
  { key: "briefcase", label: "Briefcase (business)", Icon: Briefcase },
  { key: "card", label: "Card", Icon: CreditCard },
  { key: "investment", label: "Trending up (investing)", Icon: TrendingUp },
  { key: "users", label: "People", Icon: Users },
  { key: "building", label: "Building", Icon: Building2 },
  { key: "award", label: "Award", Icon: Award },
  { key: "help", label: "Question mark", Icon: HelpCircle },
  { key: "target", label: "Target (default)", Icon: Target },
];

type StructuredItem = Record<string, string | number>;

const structuredSectionTypes = ["hero", "services", "about", "testimonials", "faq", "faqs", "contact"] as const;

const safeParseContent = (content: string): unknown => {
  if (!content.trim()) return null;
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
};

const stringifyContent = (value: unknown) => JSON.stringify(value, null, 2);

const emptyItemForSection = (sectionType: string): StructuredItem => {
  switch (sectionType) {
    case "hero":
      return { cta_primary: "Open an Account", cta_secondary: "Learn More" };
    case "contact":
      return { phone: "", email: "", hours: "", address: "" };
    case "faq":
    case "faqs":
      return { question: "", answer: "" };
    case "testimonials":
      return { name: "", role: "", content: "", rating: 5 };
    case "about":
    case "services":
      return { icon: "target", title: "", description: "" };
    default:
      return { title: "", description: "" };
  }
};

const getItemsFromContent = (sectionType: string, content: string): StructuredItem[] => {
  const parsed = safeParseContent(content);

  if (sectionType === "hero") {
    const data = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
    return [{
      cta_primary: typeof data.cta_primary === "string" ? data.cta_primary : "Open an Account",
      cta_secondary: typeof data.cta_secondary === "string" ? data.cta_secondary : "Learn More",
    }];
  }

  if (sectionType === "contact") {
    const data = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
    return [{
      phone: Array.isArray(data.phone) ? String(data.phone[0] || "") : "",
      email: Array.isArray(data.email) ? String(data.email[0] || "") : "",
      hours: Array.isArray(data.hours) ? String(data.hours[0] || "") : "",
      address: Array.isArray(data.address) ? String(data.address.join("\n")) : "",
    }];
  }

  if (sectionType === "about" && parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const cards = (parsed as { cards?: unknown }).cards;
    return Array.isArray(cards) && cards.length ? cards as StructuredItem[] : [emptyItemForSection(sectionType)];
  }

  if (Array.isArray(parsed) && parsed.length) {
    return parsed as StructuredItem[];
  }

  return [emptyItemForSection(sectionType)];
};

const buildContentFromItems = (sectionType: string, items: StructuredItem[], currentContent: string) => {
  const cleanItems = items.map((item) => Object.fromEntries(
    Object.entries(item).map(([key, value]) => [key, typeof value === "string" ? value.trim() : value]),
  ));

  if (sectionType === "hero") {
    const item = cleanItems[0] || {};
    return stringifyContent({
      cta_primary: item.cta_primary || "Open an Account",
      cta_secondary: item.cta_secondary || "Learn More",
    });
  }

  if (sectionType === "contact") {
    const item = cleanItems[0] || {};
    const address = String(item.address || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    return stringifyContent({
      phone: item.phone ? [item.phone] : [],
      email: item.email ? [item.email] : [],
      hours: item.hours ? [item.hours] : [],
      address,
    });
  }

  if (sectionType === "about") {
    const parsed = safeParseContent(currentContent);
    const body = parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as { body?: unknown }).body
      : undefined;

    return stringifyContent({
      ...(typeof body === "string" && body.trim() ? { body } : {}),
      cards: cleanItems,
    });
  }

  return stringifyContent(cleanItems);
};

/** product_sections.content is jsonb (string or string[]); render it as editable text. */
const contentToEditableText = (content: unknown): string => {
  if (Array.isArray(content)) return content.filter((item) => typeof item === "string").join("\n");
  if (typeof content === "string") return content;
  return "";
};

interface ProductPage {
  id: string;
  product_name: string;
  slug: string;
  short_description: string | null;
  full_description: string | null;
  hero_image: string | null;
  meta_description: string | null;
  og_image: string | null;
  icon: string | null;
  status: string;
  display_order: number;
}

interface ProductSection {
  id: string;
  product_id: string;
  section_type: string;
  title: string | null;
  content: unknown;
  image: string | null;
  display_order: number;
}

interface FAQ {
  id: string;
  product_id: string | null;
  question: string;
  answer: string;
  display_order: number;
}

interface HomepageSection {
  id: string;
  section_type: string;
  title: string | null;
  subtitle: string | null;
  content: unknown;
  image: string | null;
  display_order: number;
  is_active: boolean;
}

interface MediaItem {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  created_at: string;
}

export default function ContentManagement() {
  const [products, setProducts] = useState<ProductPage[]>([]);
  const [sections, setSections] = useState<ProductSection[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [homepageSections, setHomepageSections] = useState<HomepageSection[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductPage | null>(null);
  const [editingSection, setEditingSection] = useState<ProductSection | null>(null);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [editingHomepage, setEditingHomepage] = useState<HomepageSection | null>(null);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [faqDialogOpen, setFaqDialogOpen] = useState(false);
  const [homepageDialogOpen, setHomepageDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form states
  const [productForm, setProductForm] = useState({
    product_name: "",
    slug: "",
    short_description: "",
    full_description: "",
    hero_image: "",
    meta_description: "",
    og_image: "",
    icon: "",
    status: "published",
  });
  const [sectionForm, setSectionForm] = useState({ section_type: "features", title: "", content: "", image: "", display_order: 0 });
  const [faqForm, setFaqForm] = useState({ question: "", answer: "", display_order: 0 });
  const [homepageForm, setHomepageForm] = useState({ section_type: "", title: "", subtitle: "", content: "", image: "", is_active: true });
  const [homepageItems, setHomepageItems] = useState<StructuredItem[]>([emptyItemForSection("")]);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const [prodRes, hpRes, mediaRes] = await Promise.all([
      supabase.from("product_pages").select("*").order("display_order"),
      supabase.from("homepage_sections").select("*").order("display_order"),
      supabase.from("media_library").select("*").order("created_at", { ascending: false }),
    ]);
    if (prodRes.error) {
      toast.error(prodRes.error.message);
    }
    if (hpRes.error) {
      toast.error(hpRes.error.message);
    }
    if (prodRes.data) setProducts(prodRes.data);
    if (hpRes.data) setHomepageSections(hpRes.data);
    if (mediaRes.data) setMedia(mediaRes.data);
  };

  const fetchProductDetails = async (productId: string) => {
    const [secRes, faqRes] = await Promise.all([
      supabase.from("product_sections").select("*").eq("product_id", productId).order("display_order"),
      supabase.from("faqs").select("*").eq("product_id", productId).order("display_order"),
    ]);
    if (secRes.data) setSections(secRes.data);
    if (faqRes.data) setFaqs(faqRes.data);
  };

  const selectProduct = (p: ProductPage) => {
    setSelectedProduct(p);
    fetchProductDetails(p.id);
  };

  // Product CRUD
  const saveProduct = async () => {
    if (selectedProduct) {
      const { error } = await supabase.from("product_pages").update(productForm).eq("id", selectedProduct.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Product updated");
    } else {
      const { error } = await supabase.from("product_pages").insert({ ...productForm, display_order: products.length });
      if (error) { toast.error(error.message); return; }
      toast.success("Product created");
    }
    setProductDialogOpen(false);
    fetchAll();
  };

  const deleteProduct = async (id: string) => {
    const { error } = await supabase.from("product_pages").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Product deleted");
    if (selectedProduct?.id === id) { setSelectedProduct(null); setSections([]); setFaqs([]); }
    fetchAll();
  };

  const toggleProductStatus = async (p: ProductPage) => {
    const newStatus = p.status === "published" ? "draft" : "published";
    const { error } = await supabase.from("product_pages").update({ status: newStatus }).eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Product ${newStatus === "published" ? "published" : "unpublished"}`);
    fetchAll();
  };

  // Section CRUD
  // product_sections.content is jsonb: features/benefits/how_it_works store a string
  // array (one line per item); description/other section types store plain text.
  const isListSectionType = (sectionType: string) => ["features", "benefits", "how_it_works"].includes(sectionType);

  const saveSection = async () => {
    if (!selectedProduct) return;

    const content = isListSectionType(sectionForm.section_type)
      ? sectionForm.content.split("\n").map((line) => line.trim()).filter(Boolean)
      : sectionForm.content;

    const payload = { section_type: sectionForm.section_type, title: sectionForm.title, content, image: sectionForm.image, display_order: sectionForm.display_order };

    if (editingSection) {
      const { error } = await supabase.from("product_sections").update(payload).eq("id", editingSection.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Section updated");
    } else {
      const { error } = await supabase.from("product_sections").insert({ ...payload, product_id: selectedProduct.id });
      if (error) { toast.error(error.message); return; }
      toast.success("Section added");
    }
    setSectionDialogOpen(false);
    setEditingSection(null);
    fetchProductDetails(selectedProduct.id);
  };

  const deleteSection = async (id: string) => {
    await supabase.from("product_sections").delete().eq("id", id);
    toast.success("Section deleted");
    if (selectedProduct) fetchProductDetails(selectedProduct.id);
  };

  const reorderSection = async (sec: ProductSection, dir: "up" | "down") => {
    const idx = sections.findIndex((s) => s.id === sec.id);
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sections.length) return;
    await Promise.all([
      supabase.from("product_sections").update({ display_order: sections[swapIdx].display_order }).eq("id", sec.id),
      supabase.from("product_sections").update({ display_order: sec.display_order }).eq("id", sections[swapIdx].id),
    ]);
    if (selectedProduct) fetchProductDetails(selectedProduct.id);
  };

  // FAQ CRUD
  const saveFaq = async () => {
    if (!selectedProduct) return;
    if (editingFaq) {
      const { error } = await supabase.from("faqs").update(faqForm).eq("id", editingFaq.id);
      if (error) { toast.error(error.message); return; }
      toast.success("FAQ updated");
    } else {
      const { error } = await supabase.from("faqs").insert({ ...faqForm, product_id: selectedProduct.id });
      if (error) { toast.error(error.message); return; }
      toast.success("FAQ added");
    }
    setFaqDialogOpen(false);
    setEditingFaq(null);
    fetchProductDetails(selectedProduct.id);
  };

  const deleteFaq = async (id: string) => {
    await supabase.from("faqs").delete().eq("id", id);
    toast.success("FAQ deleted");
    if (selectedProduct) fetchProductDetails(selectedProduct.id);
  };

  // Homepage sections
  const openHomepageDialog = (section?: HomepageSection | null) => {
    const form = section
      ? {
          section_type: section.section_type,
          title: section.title || "",
          subtitle: section.subtitle || "",
          content: section.content ? JSON.stringify(section.content) : "",
          image: section.image || "",
          is_active: section.is_active,
        }
      : { section_type: "", title: "", subtitle: "", content: "", image: "", is_active: true };

    setEditingHomepage(section || null);
    setHomepageForm(form);
    setHomepageItems(getItemsFromContent(form.section_type, form.content));
    setHomepageDialogOpen(true);
  };

  const updateHomepageSectionType = (sectionType: string) => {
    const currentContent = buildContentFromItems(homepageForm.section_type, homepageItems, homepageForm.content);
    const nextItems = getItemsFromContent(sectionType, currentContent);

    setHomepageForm((prev) => ({ ...prev, section_type: sectionType, content: currentContent }));
    setHomepageItems(nextItems);
  };

  const updateHomepageItem = (index: number, key: string, value: string | number) => {
    setHomepageItems((prev) => prev.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [key]: value } : item
    )));
  };

  const addHomepageItem = () => {
    setHomepageItems((prev) => [...prev, emptyItemForSection(homepageForm.section_type)]);
  };

  const removeHomepageItem = (index: number) => {
    setHomepageItems((prev) => {
      const next = prev.filter((_, itemIndex) => itemIndex !== index);
      return next.length ? next : [emptyItemForSection(homepageForm.section_type)];
    });
  };

  const saveHomepageSection = async () => {
    const contentString = structuredSectionTypes.includes(homepageForm.section_type as typeof structuredSectionTypes[number])
      ? buildContentFromItems(homepageForm.section_type, homepageItems, homepageForm.content)
      : homepageForm.content;

    // content is a jsonb column; parse the built/edited JSON string back into a
    // real object/array so it isn't double-encoded as a JSON string scalar.
    let parsedContent: unknown = contentString;
    if (contentString.trim()) {
      try {
        parsedContent = JSON.parse(contentString);
      } catch {
        parsedContent = contentString;
      }
    } else {
      parsedContent = null;
    }

    const normalizedHomepageForm = {
      section_type: homepageForm.section_type,
      title: homepageForm.title,
      subtitle: homepageForm.subtitle,
      image: homepageForm.image,
      is_active: homepageForm.is_active,
      content: parsedContent,
    };

    if (editingHomepage) {
      const { error } = await supabase.from("homepage_sections").update(normalizedHomepageForm).eq("id", editingHomepage.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Section updated");
    } else {
      const { error } = await supabase.from("homepage_sections").insert({ ...normalizedHomepageForm, display_order: homepageSections.length });
      if (error) { toast.error(error.message); return; }
      toast.success("Section added");
    }
    setHomepageDialogOpen(false);
    setEditingHomepage(null);
    fetchAll();
  };

  const deleteHomepageSection = async (id: string) => {
    await supabase.from("homepage_sections").delete().eq("id", id);
    toast.success("Section deleted");
    fetchAll();
  };

  // Media upload
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("cms-media").upload(path, file);
    if (uploadError) { toast.error(uploadError.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("cms-media").getPublicUrl(path);
    const { error: dbError } = await supabase.from("media_library").insert({
      file_name: file.name,
      file_url: urlData.publicUrl,
      file_type: file.type.startsWith("image") ? "image" : "document",
    });
    if (dbError) toast.error(dbError.message);
    else toast.success("File uploaded");
    setUploading(false);
    fetchAll();
  };

  const deleteMedia = async (item: MediaItem) => {
    const path = item.file_url.split("/cms-media/")[1];
    if (path) await supabase.storage.from("cms-media").remove([path]);
    await supabase.from("media_library").delete().eq("id", item.id);
    toast.success("Media deleted");
    fetchAll();
  };

  const renderHomepageContentFields = () => {
    switch (homepageForm.section_type) {
      case "hero": {
        const item = homepageItems[0] || emptyItemForSection("hero");
        return (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Primary Button Text</Label>
              <p className="mb-1.5 text-xs text-muted-foreground">The main call-to-action button, e.g. "Open an Account".</p>
              <Input value={String(item.cta_primary || "")} onChange={(e) => updateHomepageItem(0, "cta_primary", e.target.value)} />
            </div>
            <div>
              <Label>Secondary Button Text</Label>
              <p className="mb-1.5 text-xs text-muted-foreground">The secondary button next to it, e.g. "Learn More".</p>
              <Input value={String(item.cta_secondary || "")} onChange={(e) => updateHomepageItem(0, "cta_secondary", e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground md:col-span-2">
              Use the Title field above for the main headline and Subtitle for the supporting text under it.
            </p>
          </div>
        );
      }
      case "contact": {
        const item = homepageItems[0] || emptyItemForSection("contact");
        return (
          <div className="grid gap-4 md:grid-cols-2">
            <div><Label>Phone</Label><Input value={String(item.phone || "")} onChange={(e) => updateHomepageItem(0, "phone", e.target.value)} /></div>
            <div><Label>Email</Label><Input value={String(item.email || "")} onChange={(e) => updateHomepageItem(0, "email", e.target.value)} /></div>
            <div className="md:col-span-2"><Label>Hours</Label><Input value={String(item.hours || "")} onChange={(e) => updateHomepageItem(0, "hours", e.target.value)} /></div>
            <div className="md:col-span-2">
              <Label>Address</Label>
              <Textarea value={String(item.address || "")} onChange={(e) => updateHomepageItem(0, "address", e.target.value)} rows={3} />
            </div>
          </div>
        );
      }
      case "faq":
      case "faqs":
        return (
          <div className="space-y-3">
            {homepageItems.map((item, index) => (
              <div key={index} className="rounded-lg border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Question {index + 1}</p>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeHomepageItem(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div><Label>Question</Label><Input value={String(item.question || "")} onChange={(e) => updateHomepageItem(index, "question", e.target.value)} /></div>
                <div><Label>Answer</Label><Textarea value={String(item.answer || "")} onChange={(e) => updateHomepageItem(index, "answer", e.target.value)} rows={3} /></div>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addHomepageItem}><Plus className="mr-2 h-4 w-4" /> Add Question</Button>
          </div>
        );
      case "testimonials":
        return (
          <div className="space-y-3">
            {homepageItems.map((item, index) => (
              <div key={index} className="rounded-lg border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Testimonial {index + 1}</p>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeHomepageItem(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div><Label>Name</Label><Input value={String(item.name || "")} onChange={(e) => updateHomepageItem(index, "name", e.target.value)} /></div>
                  <div><Label>Role</Label><Input value={String(item.role || "")} onChange={(e) => updateHomepageItem(index, "role", e.target.value)} /></div>
                  <div><Label>Rating</Label><Input type="number" min="1" max="5" value={String(item.rating || 5)} onChange={(e) => updateHomepageItem(index, "rating", Number(e.target.value) || 5)} /></div>
                  <div className="md:col-span-2"><Label>Quote</Label><Textarea value={String(item.content || "")} onChange={(e) => updateHomepageItem(index, "content", e.target.value)} rows={3} /></div>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addHomepageItem}><Plus className="mr-2 h-4 w-4" /> Add Testimonial</Button>
          </div>
        );
      case "services":
      case "about":
        return (
          <div className="space-y-3">
            {homepageItems.map((item, index) => (
              <div key={index} className="rounded-lg border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{homepageForm.section_type === "about" ? "Feature" : "Service"} {index + 1}</p>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeHomepageItem(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div><Label>Title</Label><Input value={String(item.title || "")} onChange={(e) => updateHomepageItem(index, "title", e.target.value)} /></div>
                  <div>
                    <Label>Icon</Label>
                    <Select value={String(item.icon || "target")} onValueChange={(v) => updateHomepageItem(index, "icon", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ICON_OPTIONS.map(({ key, label, Icon }) => (
                          <SelectItem key={key} value={key}>
                            <span className="flex items-center gap-2"><Icon className="h-4 w-4" /> {label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2"><Label>Description</Label><Textarea value={String(item.description || "")} onChange={(e) => updateHomepageItem(index, "description", e.target.value)} rows={3} /></div>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addHomepageItem}><Plus className="mr-2 h-4 w-4" /> Add Item</Button>
          </div>
        );
      default:
        return (
          <div>
            <Label>Text Content</Label>
            <Textarea
              value={homepageForm.content}
              onChange={(e) => setHomepageForm({ ...homepageForm, content: e.target.value })}
              rows={5}
              placeholder="Write the content for this section."
            />
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="products">
        <TabsList className="flex-wrap">
          <TabsTrigger value="products">Product Pages</TabsTrigger>
          <TabsTrigger value="homepage">Homepage Sections</TabsTrigger>
          <TabsTrigger value="media">Media Library</TabsTrigger>
        </TabsList>

        {/* PRODUCT PAGES TAB */}
        <TabsContent value="products" className="space-y-4">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Products list */}
            <Card className="lg:col-span-1">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-lg">Products</CardTitle>
                <Button size="sm" onClick={() => {
                  setSelectedProduct(null);
                  setProductForm({ product_name: "", slug: "", short_description: "", full_description: "", hero_image: "", meta_description: "", og_image: "", icon: "", status: "published" });
                  setProductDialogOpen(true);
                }}>
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {products.map((p) => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-secondary/50 transition-colors ${selectedProduct?.id === p.id ? "bg-secondary" : ""}`}
                    onClick={() => selectProduct(p)}
                  >
                    <div>
                      <p className="font-medium text-sm">{p.product_name}</p>
                      <Badge variant={p.status === "published" ? "default" : "secondary"} className="text-xs mt-1">{p.status}</Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); toggleProductStatus(p); }}>
                        <Eye className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProduct(p);
                        setProductForm({
                          product_name: p.product_name,
                          slug: p.slug,
                          short_description: p.short_description || "",
                          full_description: p.full_description || "",
                          hero_image: p.hero_image || "",
                          meta_description: p.meta_description || "",
                          og_image: p.og_image || "",
                          icon: p.icon || "",
                          status: p.status,
                        });
                        setProductDialogOpen(true);
                      }}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); deleteProduct(p.id); }}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Product detail */}
            <div className="lg:col-span-2 space-y-4">
              {selectedProduct ? (
                <>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>{selectedProduct.product_name}</CardTitle>
                        <CardDescription>/products/{selectedProduct.slug}</CardDescription>
                      </div>
                      <a href={`/products/${selectedProduct.slug}`} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm"><Eye className="w-4 h-4 mr-1" /> Preview</Button>
                      </a>
                    </CardHeader>
                  </Card>

                  {/* Sections */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                      <CardTitle className="text-lg">Sections</CardTitle>
                      <Button size="sm" onClick={() => {
                        setEditingSection(null);
                        setSectionForm({ section_type: "features", title: "", content: "", image: "", display_order: sections.length });
                        setSectionDialogOpen(true);
                      }}>
                        <Plus className="w-4 h-4 mr-1" /> Add Section
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Order</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sections.map((sec) => (
                            <TableRow key={sec.id}>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => reorderSection(sec, "up")}><ArrowUp className="w-3 h-3" /></Button>
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => reorderSection(sec, "down")}><ArrowDown className="w-3 h-3" /></Button>
                                </div>
                              </TableCell>
                              <TableCell><Badge variant="outline">{sec.section_type}</Badge></TableCell>
                              <TableCell>{sec.title}</TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                                    setEditingSection(sec);
                                    setSectionForm({
                                      section_type: sec.section_type,
                                      title: sec.title || "",
                                      content: contentToEditableText(sec.content),
                                      image: sec.image || "",
                                      display_order: sec.display_order,
                                    });
                                    setSectionDialogOpen(true);
                                  }}><Pencil className="w-3 h-3" /></Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteSection(sec.id)}><Trash2 className="w-3 h-3" /></Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  {/* FAQs */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                      <CardTitle className="text-lg">FAQs</CardTitle>
                      <Button size="sm" onClick={() => {
                        setEditingFaq(null);
                        setFaqForm({ question: "", answer: "", display_order: faqs.length });
                        setFaqDialogOpen(true);
                      }}>
                        <Plus className="w-4 h-4 mr-1" /> Add FAQ
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Question</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {faqs.map((faq) => (
                            <TableRow key={faq.id}>
                              <TableCell>{faq.question}</TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                                    setEditingFaq(faq);
                                    setFaqForm({ question: faq.question, answer: faq.answer, display_order: faq.display_order });
                                    setFaqDialogOpen(true);
                                  }}><Pencil className="w-3 h-3" /></Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteFaq(faq.id)}><Trash2 className="w-3 h-3" /></Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card className="p-12 text-center text-muted-foreground">
                  Select a product to manage its content
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* HOMEPAGE TAB */}
        <TabsContent value="homepage" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Homepage Sections</CardTitle>
              <Button size="sm" onClick={() => {
                openHomepageDialog(null);
              }}>
                <Plus className="w-4 h-4 mr-1" /> Add Section
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Section</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {homepageSections.map((sec) => (
                    <TableRow key={sec.id}>
                      <TableCell className="font-medium">{sec.section_type}</TableCell>
                      <TableCell>{sec.title}</TableCell>
                      <TableCell><Badge variant={sec.is_active ? "default" : "secondary"}>{sec.is_active ? "active" : "inactive"}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                            openHomepageDialog(sec);
                          }}><Pencil className="w-3 h-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteHomepageSection(sec.id)}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MEDIA TAB */}
        <TabsContent value="media" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Media Library</CardTitle>
              <div>
                <Input type="file" accept="image/*" className="hidden" id="media-upload" onChange={handleMediaUpload} />
                <Button size="sm" asChild disabled={uploading}>
                  <label htmlFor="media-upload" className="cursor-pointer">
                    <Upload className="w-4 h-4 mr-1" /> {uploading ? "Uploading..." : "Upload"}
                  </label>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {media.map((item) => (
                  <div key={item.id} className="group relative rounded-lg overflow-hidden border border-border">
                    {item.file_type === "image" ? (
                      <img src={item.file_url} alt={item.file_name} className="w-full h-32 object-cover" />
                    ) : (
                      <div className="w-full h-32 flex items-center justify-center bg-secondary">
                        <ImageIcon className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="p-2">
                      <p className="text-xs truncate">{item.file_name}</p>
                    </div>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => deleteMedia(item)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                {media.length === 0 && (
                  <p className="col-span-full text-center text-muted-foreground py-8">No media uploaded yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Product Editor */}
      <CmsEditorSheet
        open={productDialogOpen}
        onOpenChange={setProductDialogOpen}
        title={selectedProduct && productForm.product_name ? "Edit Product" : "New Product"}
        description="Everything shown on this product's public page, from its headline to its SEO details."
        onSave={saveProduct}
        saveLabel="Save Product"
      >
        <CmsFormSection title="Basic Information" description="The name and short summary shown in lists and previews.">
          <CmsField label="Product Name">
            <Input value={productForm.product_name} onChange={(e) => setProductForm({ ...productForm, product_name: e.target.value })} placeholder="e.g. Everyday Chequing" />
          </CmsField>
          <CmsField label="Slug" helperText="The web address for this page, e.g. /products/everyday-chequing.">
            <Input value={productForm.slug} onChange={(e) => setProductForm({ ...productForm, slug: e.target.value })} placeholder="everyday-chequing" />
          </CmsField>
          <CmsField label="Short Description" helperText="A one-sentence summary shown on cards and in the product list.">
            <Textarea value={productForm.short_description} onChange={(e) => setProductForm({ ...productForm, short_description: e.target.value })} rows={3} />
          </CmsField>
        </CmsFormSection>

        <CmsFormSection title="Full Description" description="The longer description shown in the page's description section.">
          <Textarea
            value={productForm.full_description}
            onChange={(e) => setProductForm({ ...productForm, full_description: e.target.value })}
            rows={14}
            className="min-h-[280px] resize-y"
            placeholder="Describe this product in full detail..."
          />
        </CmsFormSection>

        <CmsFormSection title="Images">
          <ImagePicker
            label="Hero Image"
            value={productForm.hero_image}
            onChange={(url) => setProductForm({ ...productForm, hero_image: url })}
            helperText="Shown at the top of this page. Landscape photos work best."
          />
          <ImagePicker
            label="Social Share Image"
            value={productForm.og_image}
            onChange={(url) => setProductForm({ ...productForm, og_image: url })}
            helperText="Shown when this page is shared on social media. If left empty, the hero image is used."
          />
        </CmsFormSection>

        <CmsFormSection title="SEO & Metadata">
          <CmsField label="Meta Description" helperText="Shown in search engine results. Aim for 150-160 characters.">
            <Textarea value={productForm.meta_description} onChange={(e) => setProductForm({ ...productForm, meta_description: e.target.value })} rows={2} />
          </CmsField>
        </CmsFormSection>

        <CmsFormSection title="Display Settings">
          <CmsField label="Icon" helperText="The small icon shown next to this product's name.">
            <Select value={productForm.icon || "target"} onValueChange={(v) => setProductForm({ ...productForm, icon: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ICON_OPTIONS.map(({ key, label, Icon }) => (
                  <SelectItem key={key} value={key}>
                    <span className="flex items-center gap-2"><Icon className="h-4 w-4" /> {label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CmsField>
          <CmsField label="Status" helperText="Only Published pages are visible to customers.">
            <Select value={productForm.status} onValueChange={(v) => setProductForm({ ...productForm, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </CmsField>
        </CmsFormSection>
      </CmsEditorSheet>

      {/* Product Section Editor */}
      <CmsEditorSheet
        open={sectionDialogOpen}
        onOpenChange={setSectionDialogOpen}
        title={editingSection ? "Edit Section" : "Add Section"}
        description="A content block on this product's page, such as its feature list or description."
        onSave={saveSection}
        saveLabel="Save Section"
      >
        <CmsFormSection title="Section Details">
          <CmsField label="Section Type">
            <Select value={sectionForm.section_type} onValueChange={(v) => setSectionForm({ ...sectionForm, section_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="description">Description</SelectItem>
                <SelectItem value="features">Features</SelectItem>
                <SelectItem value="benefits">Benefits</SelectItem>
                <SelectItem value="how_it_works">How It Works</SelectItem>
                <SelectItem value="content">Custom Content</SelectItem>
              </SelectContent>
            </Select>
          </CmsField>
          <CmsField label="Title">
            <Input value={sectionForm.title} onChange={(e) => setSectionForm({ ...sectionForm, title: e.target.value })} />
          </CmsField>
        </CmsFormSection>

        <CmsFormSection title="Image">
          <ImagePicker
            label="Section Image"
            value={sectionForm.image}
            onChange={(url) => setSectionForm({ ...sectionForm, image: url })}
            helperText="Optional. Shown alongside this section's content."
          />
        </CmsFormSection>

        <CmsFormSection title="Content">
          <CmsField
            label="Content"
            helperText={
              isListSectionType(sectionForm.section_type)
                ? "One item per line — each line becomes a separate bullet point."
                : "A plain text paragraph."
            }
          >
            <Textarea
              value={sectionForm.content}
              onChange={(e) => setSectionForm({ ...sectionForm, content: e.target.value })}
              rows={12}
              className="min-h-[240px] resize-y"
              placeholder={
                isListSectionType(sectionForm.section_type)
                  ? "One item per line"
                  : "Plain text paragraph"
              }
            />
          </CmsField>
        </CmsFormSection>
      </CmsEditorSheet>

      {/* FAQ Editor */}
      <CmsEditorSheet
        open={faqDialogOpen}
        onOpenChange={setFaqDialogOpen}
        title={editingFaq ? "Edit FAQ" : "Add FAQ"}
        description="A question and answer shown on this product's page."
        onSave={saveFaq}
        saveLabel="Save FAQ"
      >
        <CmsFormSection title="Question & Answer">
          <CmsField label="Question">
            <Input value={faqForm.question} onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })} placeholder="e.g. Is there a minimum balance requirement?" />
          </CmsField>
          <CmsField label="Answer">
            <Textarea value={faqForm.answer} onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })} rows={8} className="min-h-[180px] resize-y" />
          </CmsField>
        </CmsFormSection>
      </CmsEditorSheet>

      {/* Homepage Section Editor */}
      <CmsEditorSheet
        open={homepageDialogOpen}
        onOpenChange={setHomepageDialogOpen}
        title={editingHomepage ? "Edit Homepage Section" : "Add Homepage Section"}
        description="A block of content shown on the public homepage, in the order sections appear here."
        onSave={saveHomepageSection}
        saveLabel="Save Section"
      >
        <CmsFormSection title="Section Basics">
          <CmsField label="Section Type">
            <Select value={homepageForm.section_type} onValueChange={updateHomepageSectionType}>
              <SelectTrigger><SelectValue placeholder="Choose a section" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="hero">Hero</SelectItem>
                <SelectItem value="services">Services</SelectItem>
                <SelectItem value="products">Products</SelectItem>
                <SelectItem value="about">About</SelectItem>
                <SelectItem value="testimonials">Testimonials</SelectItem>
                <SelectItem value="faq">FAQ</SelectItem>
                <SelectItem value="contact">Contact</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </CmsField>
          <CmsField label="Title">
            <Input value={homepageForm.title} onChange={(e) => setHomepageForm({ ...homepageForm, title: e.target.value })} />
          </CmsField>
          <CmsField label="Subtitle">
            <Input value={homepageForm.subtitle} onChange={(e) => setHomepageForm({ ...homepageForm, subtitle: e.target.value })} />
          </CmsField>
        </CmsFormSection>

        <CmsFormSection title="Image">
          <ImagePicker
            label="Section Image"
            value={homepageForm.image}
            onChange={(url) => setHomepageForm({ ...homepageForm, image: url })}
            helperText="Optional. Shown alongside this section's content."
          />
        </CmsFormSection>

        <CmsFormSection title="Content">
          {renderHomepageContentFields()}
        </CmsFormSection>

        <CmsFormSection title="Visibility">
          <CmsField label="Status" helperText="Inactive sections are hidden from the public homepage.">
            <Select
              value={homepageForm.is_active ? "active" : "inactive"}
              onValueChange={(v) => setHomepageForm({ ...homepageForm, is_active: v === "active" })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </CmsField>
        </CmsFormSection>
      </CmsEditorSheet>
    </div>
  );
}
