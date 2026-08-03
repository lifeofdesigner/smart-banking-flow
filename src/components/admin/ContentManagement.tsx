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
  EyeOff,
  Image as ImageIcon,
  Upload,
  Award,
  Briefcase,
  Building2,
  CheckCircle2,
  CreditCard,
  DollarSign,
  HelpCircle,
  Lock,
  PiggyBank,
  Shield,
  Smartphone,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { ImagePicker } from "@/components/admin/ImagePicker";
import { PageLinkPicker } from "@/components/admin/PageLinkPicker";

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
  { key: "shield", label: "Shield (security)", Icon: Shield },
  { key: "lock", label: "Lock (security)", Icon: Lock },
  { key: "zap", label: "Lightning (fast)", Icon: Zap },
  { key: "smartphone", label: "Smartphone (mobile)", Icon: Smartphone },
  { key: "check", label: "Checkmark", Icon: CheckCircle2 },
  { key: "target", label: "Target (default)", Icon: Target },
];

type StructuredItem = Record<string, string | number>;

/** Section types whose content is edited as a repeatable/fixed set of plain
 * fields (via emptyItemForSection/getItemsFromContent/buildContentFromItems
 * below), never as raw JSON. Anything not in this list falls back to a
 * plain text box (see renderHomepageContentFields' default case) — used
 * today only by "products" (whose real content lives in product_pages) and
 * "custom". */
const structuredSectionTypes = [
  "hero", "services", "about", "testimonials", "faq", "faqs", "contact",
  "trust_bar", "banking_made_simple", "statistics", "financial_tools",
  "security", "mobile_banking", "financial_education", "final_cta",
] as const;

/** Section types whose repeatable list is an icon+title+description card,
 * same shape as the original "services"/"about" cards. */
const cardSectionTypes = ["services", "about", "banking_made_simple"];
/** Section types whose repeatable list is a plain icon+label checklist. */
const checklistSectionTypes = ["trust_bar", "security", "financial_tools"];
/** Section types that are a single CTA pair, no repeatable list at all. */
const singleCtaSectionTypes = ["mobile_banking", "financial_education"];
/** Section types that are a primary+secondary CTA pair, no repeatable list. */
const dualCtaSectionTypes = ["hero", "final_cta"];

const safeParseContent = (content: string): unknown => {
  if (!content.trim()) return null;
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
};

const stringifyContent = (value: unknown) => JSON.stringify(value, null, 2);

/** Real seeded content sometimes wraps its array under a named key (e.g.
 * { services: [...] }); content saved by this editor writes a bare array.
 * Mirrors the same-purpose helper in DynamicHomepageSections.tsx so both
 * sides of the CMS agree on what a section's content can look like. */
const extractItemsArray = (parsed: unknown, wrapperKeys: string[]): StructuredItem[] | null => {
  if (Array.isArray(parsed)) return parsed as StructuredItem[];

  if (parsed && typeof parsed === "object") {
    for (const key of wrapperKeys) {
      const value = (parsed as Record<string, unknown>)[key];
      if (Array.isArray(value)) return value as StructuredItem[];
    }
  }

  return null;
};

const asRecord = (parsed: unknown): Record<string, unknown> =>
  parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};

const emptyItemForSection = (sectionType: string): StructuredItem => {
  if (dualCtaSectionTypes.includes(sectionType)) {
    return { cta_primary_label: "", cta_primary_link: "", cta_secondary_label: "", cta_secondary_link: "" };
  }
  if (singleCtaSectionTypes.includes(sectionType)) {
    return { cta_primary_label: "", cta_primary_link: "" };
  }
  if (checklistSectionTypes.includes(sectionType)) {
    return { icon: "check", label: "" };
  }
  if (cardSectionTypes.includes(sectionType)) {
    return { icon: "target", title: "", description: "" };
  }

  switch (sectionType) {
    case "contact":
      return { phone: "", email: "", hours: "", address: "" };
    case "faq":
    case "faqs":
      return { question: "", answer: "" };
    case "testimonials":
      return { name: "", role: "", content: "", rating: 5 };
    case "statistics":
      return { value: "", label: "" };
    default:
      return { title: "", description: "" };
  }
};

const getItemsFromContent = (sectionType: string, content: string): StructuredItem[] => {
  const parsed = safeParseContent(content);
  const record = asRecord(parsed);

  if (dualCtaSectionTypes.includes(sectionType)) {
    return [{
      cta_primary_label: typeof record.cta_primary_label === "string" ? record.cta_primary_label : "",
      cta_primary_link: typeof record.cta_primary_link === "string" ? record.cta_primary_link : "",
      cta_secondary_label: typeof record.cta_secondary_label === "string" ? record.cta_secondary_label : "",
      cta_secondary_link: typeof record.cta_secondary_link === "string" ? record.cta_secondary_link : "",
    }];
  }

  if (singleCtaSectionTypes.includes(sectionType)) {
    return [{
      cta_primary_label: typeof record.cta_primary_label === "string" ? record.cta_primary_label : "",
      cta_primary_link: typeof record.cta_primary_link === "string" ? record.cta_primary_link : "",
    }];
  }

  if (sectionType === "contact") {
    return [{
      phone: Array.isArray(record.phone) ? String(record.phone[0] || "") : "",
      email: Array.isArray(record.email) ? String(record.email[0] || "") : "",
      hours: Array.isArray(record.hours) ? String(record.hours[0] || "") : "",
      address: Array.isArray(record.address) ? String(record.address.join("\n")) : "",
    }];
  }

  if (cardSectionTypes.includes(sectionType)) {
    const cards = extractItemsArray(parsed, ["cards", "services", "values"]);
    return cards && cards.length ? cards : [emptyItemForSection(sectionType)];
  }

  if (checklistSectionTypes.includes(sectionType) || sectionType === "statistics") {
    const items = extractItemsArray(parsed, ["items"]);
    return items && items.length ? items : [emptyItemForSection(sectionType)];
  }

  if (Array.isArray(parsed) && parsed.length) {
    return parsed as StructuredItem[];
  }

  return [emptyItemForSection(sectionType)];
};

/** financial_tools carries both a checklist AND a trailing CTA; the CTA
 * isn't part of the repeatable items list, so it's read straight off
 * whatever content is currently loaded rather than through homepageItems. */
const getFixedContentField = (content: string, key: string): string => {
  const record = asRecord(safeParseContent(content));
  return typeof record[key] === "string" ? record[key] : "";
};

const buildContentFromItems = (sectionType: string, items: StructuredItem[], currentContent: string) => {
  const cleanItems = items.map((item) => Object.fromEntries(
    Object.entries(item).map(([key, value]) => [key, typeof value === "string" ? value.trim() : value]),
  ));

  if (dualCtaSectionTypes.includes(sectionType)) {
    const item = cleanItems[0] || {};
    return stringifyContent({
      cta_primary_label: item.cta_primary_label || "",
      cta_primary_link: item.cta_primary_link || "",
      cta_secondary_label: item.cta_secondary_label || "",
      cta_secondary_link: item.cta_secondary_link || "",
    });
  }

  if (singleCtaSectionTypes.includes(sectionType)) {
    const item = cleanItems[0] || {};
    return stringifyContent({
      cta_primary_label: item.cta_primary_label || "",
      cta_primary_link: item.cta_primary_link || "",
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
    const record = asRecord(safeParseContent(currentContent));
    return stringifyContent({
      ...(typeof record.cta_primary_label === "string" && record.cta_primary_label.trim() ? { cta_primary_label: record.cta_primary_label } : {}),
      ...(typeof record.cta_primary_link === "string" && record.cta_primary_link.trim() ? { cta_primary_link: record.cta_primary_link } : {}),
      cards: cleanItems,
    });
  }

  if (sectionType === "services" || sectionType === "banking_made_simple") {
    return stringifyContent({ services: cleanItems });
  }

  if (checklistSectionTypes.includes(sectionType) || sectionType === "statistics") {
    const record = asRecord(safeParseContent(currentContent));
    return stringifyContent({
      ...(sectionType === "financial_tools" && typeof record.cta_primary_label === "string" && record.cta_primary_label.trim()
        ? { cta_primary_label: record.cta_primary_label, cta_primary_link: record.cta_primary_link || "" }
        : {}),
      items: cleanItems,
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
  description: string | null;
  content: unknown;
  image: string | null;
  image_alt: string | null;
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
  const [homepageForm, setHomepageForm] = useState({ section_type: "", title: "", subtitle: "", description: "", content: "", image: "", image_alt: "", is_active: true });
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

  // Product CRUD — all mutations apply to local state immediately (optimistic),
  // then reconcile with the server; a failed write reverts the local change.
  const saveProduct = async () => {
    if (selectedProduct) {
      const previous = products;
      setProducts(products.map((p) => (p.id === selectedProduct.id ? { ...p, ...productForm } : p)));
      const { error } = await supabase.from("product_pages").update(productForm).eq("id", selectedProduct.id);
      if (error) { setProducts(previous); toast.error(error.message); return; }
      toast.success("Product updated");
    } else {
      const { data, error } = await supabase
        .from("product_pages")
        .insert({ ...productForm, display_order: products.length })
        .select()
        .single();
      if (error) { toast.error(error.message); return; }
      setProducts([...products, data]);
      toast.success("Product created");
    }
    setProductDialogOpen(false);
  };

  const deleteProduct = async (id: string) => {
    const previous = products;
    setProducts(products.filter((p) => p.id !== id));
    if (selectedProduct?.id === id) { setSelectedProduct(null); setSections([]); setFaqs([]); }
    const { error } = await supabase.from("product_pages").delete().eq("id", id);
    if (error) { setProducts(previous); toast.error(error.message); return; }
    toast.success("Product deleted");
  };

  const toggleProductStatus = async (p: ProductPage) => {
    const newStatus = p.status === "published" ? "draft" : "published";
    const previous = products;
    setProducts(products.map((item) => (item.id === p.id ? { ...item, status: newStatus } : item)));
    const { error } = await supabase.from("product_pages").update({ status: newStatus }).eq("id", p.id);
    if (error) { setProducts(previous); toast.error(error.message); return; }
    toast.success(`Product ${newStatus === "published" ? "published" : "unpublished"}`);
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
          description: section.description || "",
          content: section.content ? JSON.stringify(section.content) : "",
          image: section.image || "",
          image_alt: section.image_alt || "",
          is_active: section.is_active,
        }
      : { section_type: "", title: "", subtitle: "", description: "", content: "", image: "", image_alt: "", is_active: true };

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

  /** For the handful of fields (About's CTA, Financial Tools' trailing
   * CTA) that live alongside a repeatable items list rather than inside
   * it — read/write them straight on homepageForm.content so they survive
   * independently of whatever the items editor does. */
  const setFixedContentField = (key: string, value: string) => {
    const record = asRecord(safeParseContent(homepageForm.content));
    setHomepageForm((prev) => ({ ...prev, content: stringifyContent({ ...record, [key]: value }) }));
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
      description: homepageForm.description || null,
      image: homepageForm.image,
      image_alt: homepageForm.image_alt || null,
      is_active: homepageForm.is_active,
      content: parsedContent,
    };

    if (editingHomepage) {
      setHomepageSections(homepageSections.map((s) => (s.id === editingHomepage.id ? { ...s, ...normalizedHomepageForm } : s)));
      const { error } = await supabase.from("homepage_sections").update(normalizedHomepageForm).eq("id", editingHomepage.id);
      if (error) { fetchAll(); toast.error(error.message); return; }
      toast.success("Section updated");
    } else {
      const { data, error } = await supabase
        .from("homepage_sections")
        .insert({ ...normalizedHomepageForm, display_order: homepageSections.length })
        .select()
        .single();
      if (error) { toast.error(error.message); return; }
      setHomepageSections([...homepageSections, data]);
      toast.success("Section added");
    }
    setHomepageDialogOpen(false);
    setEditingHomepage(null);
  };

  const deleteHomepageSection = async (id: string) => {
    const previous = homepageSections;
    setHomepageSections(homepageSections.filter((s) => s.id !== id));
    const { error } = await supabase.from("homepage_sections").delete().eq("id", id);
    if (error) { setHomepageSections(previous); toast.error(error.message); return; }
    toast.success("Section deleted");
  };

  /** One-click show/hide — the primary way admins gate a homepage section without opening the full editor. */
  const toggleHomepageSectionActive = async (sec: HomepageSection) => {
    const previous = homepageSections;
    setHomepageSections(homepageSections.map((s) => (s.id === sec.id ? { ...s, is_active: !s.is_active } : s)));
    const { error } = await supabase.from("homepage_sections").update({ is_active: !sec.is_active }).eq("id", sec.id);
    if (error) { setHomepageSections(previous); toast.error(error.message); return; }
    toast.success(sec.is_active ? "Section hidden from homepage" : "Section now visible on homepage");
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
    const { data: mediaRow, error: dbError } = await supabase
      .from("media_library")
      .insert({
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_type: file.type.startsWith("image") ? "image" : "document",
      })
      .select()
      .single();
    if (dbError) {
      toast.error(dbError.message);
    } else {
      setMedia([mediaRow, ...media]);
      toast.success("File uploaded");
    }
    setUploading(false);
  };

  const deleteMedia = async (item: MediaItem) => {
    const previous = media;
    setMedia(media.filter((m) => m.id !== item.id));
    const path = item.file_url.split("/cms-media/")[1];
    if (path) await supabase.storage.from("cms-media").remove([path]);
    const { error } = await supabase.from("media_library").delete().eq("id", item.id);
    if (error) { setMedia(previous); toast.error(error.message); return; }
    toast.success("Media deleted");
  };

  const renderHomepageContentFields = () => {
    switch (homepageForm.section_type) {
      case "hero":
      case "final_cta": {
        const item = homepageItems[0] || emptyItemForSection(homepageForm.section_type);
        return (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Primary Button Text</Label>
              <Input value={String(item.cta_primary_label || "")} onChange={(e) => updateHomepageItem(0, "cta_primary_label", e.target.value)} />
            </div>
            <PageLinkPicker label="Primary Button Link" value={String(item.cta_primary_link || "")} onChange={(v) => updateHomepageItem(0, "cta_primary_link", v)} />
            <div>
              <Label>Secondary Button Text</Label>
              <Input value={String(item.cta_secondary_label || "")} onChange={(e) => updateHomepageItem(0, "cta_secondary_label", e.target.value)} />
            </div>
            <PageLinkPicker label="Secondary Button Link" value={String(item.cta_secondary_link || "")} onChange={(v) => updateHomepageItem(0, "cta_secondary_link", v)} />
            <p className="text-xs text-muted-foreground md:col-span-2">
              Use the Title field above for the main headline, Subtitle for the supporting text, and Description below for a longer paragraph if this style needs one.
            </p>
          </div>
        );
      }
      case "mobile_banking":
      case "financial_education": {
        const item = homepageItems[0] || emptyItemForSection(homepageForm.section_type);
        return (
          <div className="grid gap-4 md:grid-cols-2">
            <div><Label>Button Text</Label><Input value={String(item.cta_primary_label || "")} onChange={(e) => updateHomepageItem(0, "cta_primary_label", e.target.value)} /></div>
            <PageLinkPicker label="Button Link" value={String(item.cta_primary_link || "")} onChange={(v) => updateHomepageItem(0, "cta_primary_link", v)} />
          </div>
        );
      }
      case "about": {
        const ctaLabel = getFixedContentField(homepageForm.content, "cta_primary_label");
        const ctaLink = getFixedContentField(homepageForm.content, "cta_primary_link");
        return (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div><Label>Button Text</Label><Input placeholder="Learn About Us" value={ctaLabel} onChange={(e) => setFixedContentField("cta_primary_label", e.target.value)} /></div>
              <PageLinkPicker label="Button Link" value={ctaLink} onChange={(v) => setFixedContentField("cta_primary_link", v)} />
            </div>
            <div className="space-y-3">
              <Label>Feature Cards (optional)</Label>
              {homepageItems.map((item, index) => (
                <div key={index} className="rounded-lg border p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Feature {index + 1}</p>
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
              <Button type="button" variant="outline" onClick={addHomepageItem}><Plus className="mr-2 h-4 w-4" /> Add Feature</Button>
            </div>
          </div>
        );
      }
      case "trust_bar":
      case "security":
      case "financial_tools": {
        const ctaLabel = getFixedContentField(homepageForm.content, "cta_primary_label");
        const ctaLink = getFixedContentField(homepageForm.content, "cta_primary_link");
        return (
          <div className="space-y-3">
            {homepageItems.map((item, index) => (
              <div key={index} className="flex items-end gap-3 rounded-lg border p-3">
                <div className="w-40">
                  <Label>Icon</Label>
                  <Select value={String(item.icon || "check")} onValueChange={(v) => updateHomepageItem(index, "icon", v)}>
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
                <div className="flex-1"><Label>Label</Label><Input value={String(item.label || "")} onChange={(e) => updateHomepageItem(index, "label", e.target.value)} /></div>
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-destructive" onClick={() => removeHomepageItem(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addHomepageItem}><Plus className="mr-2 h-4 w-4" /> Add Item</Button>
            {homepageForm.section_type === "financial_tools" ? (
              <div className="grid gap-4 border-t pt-4 md:grid-cols-2">
                <div><Label>Button Text</Label><Input placeholder="Explore Financial Tools" value={ctaLabel} onChange={(e) => setFixedContentField("cta_primary_label", e.target.value)} /></div>
                <PageLinkPicker label="Button Link" value={ctaLink} onChange={(v) => setFixedContentField("cta_primary_link", v)} />
              </div>
            ) : null}
          </div>
        );
      }
      case "statistics":
        return (
          <div className="space-y-3">
            {homepageItems.map((item, index) => (
              <div key={index} className="flex items-end gap-3 rounded-lg border p-3">
                <div className="w-32"><Label>Value</Label><Input placeholder="25+" value={String(item.value || "")} onChange={(e) => updateHomepageItem(index, "value", e.target.value)} /></div>
                <div className="flex-1"><Label>Label</Label><Input placeholder="Years Serving Communities" value={String(item.label || "")} onChange={(e) => updateHomepageItem(index, "label", e.target.value)} /></div>
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-destructive" onClick={() => removeHomepageItem(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addHomepageItem}><Plus className="mr-2 h-4 w-4" /> Add Statistic</Button>
          </div>
        );
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
      case "banking_made_simple":
        return (
          <div className="space-y-3">
            {homepageItems.map((item, index) => (
              <div key={index} className="rounded-lg border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Item {index + 1}</p>
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
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title={sec.is_active ? "Hide from homepage" : "Show on homepage"}
                            onClick={() => toggleHomepageSectionActive(sec)}
                          >
                            {sec.is_active ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                          </Button>
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
                <SelectItem value="hero">Hero Banner</SelectItem>
                <SelectItem value="trust_bar">Trust Bar</SelectItem>
                <SelectItem value="products">Banking Products</SelectItem>
                <SelectItem value="services">Why Choose Us</SelectItem>
                <SelectItem value="about">About Us</SelectItem>
                <SelectItem value="banking_made_simple">Banking Made Simple</SelectItem>
                <SelectItem value="statistics">Statistics</SelectItem>
                <SelectItem value="financial_tools">Financial Tools</SelectItem>
                <SelectItem value="testimonials">Testimonials</SelectItem>
                <SelectItem value="security">Security</SelectItem>
                <SelectItem value="mobile_banking">Mobile Banking</SelectItem>
                <SelectItem value="financial_education">Financial Education</SelectItem>
                <SelectItem value="faq">FAQ</SelectItem>
                <SelectItem value="final_cta">Final Call-to-Action</SelectItem>
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
          <CmsField label="Description" helperText="A longer paragraph shown below the subtitle, where this section style uses one.">
            <Textarea rows={4} value={homepageForm.description} onChange={(e) => setHomepageForm({ ...homepageForm, description: e.target.value })} />
          </CmsField>
        </CmsFormSection>

        <CmsFormSection title="Image">
          <ImagePicker
            label="Section Image"
            value={homepageForm.image}
            onChange={(url) => setHomepageForm({ ...homepageForm, image: url })}
            helperText="Optional. Shown alongside this section's content."
          />
          <CmsField label="Image Alt Text" helperText="Describes the image for screen readers and search engines.">
            <Input value={homepageForm.image_alt} onChange={(e) => setHomepageForm({ ...homepageForm, image_alt: e.target.value })} />
          </CmsField>
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
