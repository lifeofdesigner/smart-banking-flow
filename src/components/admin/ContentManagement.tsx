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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, Eye, Image as ImageIcon, Upload } from "lucide-react";
import { toast } from "sonner";

interface ProductPage {
  id: string;
  product_name: string;
  slug: string;
  short_description: string | null;
  full_description: string | null;
  hero_image: string | null;
  meta_description: string | null;
  og_image: string | null;
  status: string;
  display_order: number;
}

interface ProductSection {
  id: string;
  product_id: string;
  section_type: string;
  section_title: string | null;
  section_content: string | null;
  section_image: string | null;
  display_order: number;
}

interface FAQ {
  id: string;
  product_id: string | null;
  page_id: string | null;
  question: string;
  answer: string;
  display_order: number;
}

interface HomepageSection {
  id: string;
  section_type: string;
  title: string | null;
  subtitle: string | null;
  content: string | null;
  image: string | null;
  display_order: number;
  status: string;
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
  const [productForm, setProductForm] = useState({ product_name: "", slug: "", short_description: "", full_description: "", meta_description: "", status: "active" });
  const [sectionForm, setSectionForm] = useState({ section_type: "features", section_title: "", section_content: "", display_order: 0 });
  const [faqForm, setFaqForm] = useState({ question: "", answer: "", display_order: 0 });
  const [homepageForm, setHomepageForm] = useState({ section_type: "", title: "", subtitle: "", content: "", status: "active" });

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
    const newStatus = p.status === "active" ? "draft" : "active";
    await supabase.from("product_pages").update({ status: newStatus }).eq("id", p.id);
    toast.success(`Product ${newStatus === "active" ? "enabled" : "disabled"}`);
    fetchAll();
  };

  // Section CRUD
  const saveSection = async () => {
    if (!selectedProduct) return;
    if (editingSection) {
      const { error } = await supabase.from("product_sections").update(sectionForm).eq("id", editingSection.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Section updated");
    } else {
      const { error } = await supabase.from("product_sections").insert({ ...sectionForm, product_id: selectedProduct.id });
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
  const saveHomepageSection = async () => {
    if (editingHomepage) {
      const { error } = await supabase.from("homepage_sections").update(homepageForm).eq("id", editingHomepage.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Section updated");
    } else {
      const { error } = await supabase.from("homepage_sections").insert({ ...homepageForm, display_order: homepageSections.length });
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
                  setProductForm({ product_name: "", slug: "", short_description: "", full_description: "", meta_description: "", status: "active" });
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
                      <Badge variant={p.status === "active" ? "default" : "secondary"} className="text-xs mt-1">{p.status}</Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); toggleProductStatus(p); }}>
                        <Eye className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProduct(p);
                        setProductForm({ product_name: p.product_name, slug: p.slug, short_description: p.short_description || "", full_description: p.full_description || "", meta_description: p.meta_description || "", status: p.status });
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
                        setSectionForm({ section_type: "features", section_title: "", section_content: "", display_order: sections.length });
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
                              <TableCell>{sec.section_title}</TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                                    setEditingSection(sec);
                                    setSectionForm({ section_type: sec.section_type, section_title: sec.section_title || "", section_content: sec.section_content || "", display_order: sec.display_order });
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
                setEditingHomepage(null);
                setHomepageForm({ section_type: "", title: "", subtitle: "", content: "", status: "active" });
                setHomepageDialogOpen(true);
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
                      <TableCell><Badge variant={sec.status === "active" ? "default" : "secondary"}>{sec.status}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                            setEditingHomepage(sec);
                            setHomepageForm({ section_type: sec.section_type, title: sec.title || "", subtitle: sec.subtitle || "", content: sec.content || "", status: sec.status });
                            setHomepageDialogOpen(true);
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

      {/* Product Dialog */}
      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedProduct && productForm.product_name ? "Edit Product" : "New Product"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Product Name</Label><Input value={productForm.product_name} onChange={(e) => setProductForm({ ...productForm, product_name: e.target.value })} /></div>
            <div><Label>Slug</Label><Input value={productForm.slug} onChange={(e) => setProductForm({ ...productForm, slug: e.target.value })} /></div>
            <div><Label>Short Description</Label><Textarea value={productForm.short_description} onChange={(e) => setProductForm({ ...productForm, short_description: e.target.value })} /></div>
            <div><Label>Full Description</Label><Textarea value={productForm.full_description} onChange={(e) => setProductForm({ ...productForm, full_description: e.target.value })} rows={4} /></div>
            <div><Label>Meta Description (SEO)</Label><Input value={productForm.meta_description} onChange={(e) => setProductForm({ ...productForm, meta_description: e.target.value })} /></div>
            <div>
              <Label>Status</Label>
              <Select value={productForm.status} onValueChange={(v) => setProductForm({ ...productForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={saveProduct}>Save Product</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Section Dialog */}
      <Dialog open={sectionDialogOpen} onOpenChange={setSectionDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingSection ? "Edit Section" : "Add Section"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Section Type</Label>
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
            </div>
            <div><Label>Title</Label><Input value={sectionForm.section_title} onChange={(e) => setSectionForm({ ...sectionForm, section_title: e.target.value })} /></div>
            <div><Label>Content</Label><Textarea value={sectionForm.section_content} onChange={(e) => setSectionForm({ ...sectionForm, section_content: e.target.value })} rows={6} placeholder='Plain text or JSON array: ["item1","item2"]' /></div>
            <Button className="w-full" onClick={saveSection}>Save Section</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* FAQ Dialog */}
      <Dialog open={faqDialogOpen} onOpenChange={setFaqDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFaq ? "Edit FAQ" : "Add FAQ"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Question</Label><Input value={faqForm.question} onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })} /></div>
            <div><Label>Answer</Label><Textarea value={faqForm.answer} onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })} rows={4} /></div>
            <Button className="w-full" onClick={saveFaq}>Save FAQ</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Homepage Section Dialog */}
      <Dialog open={homepageDialogOpen} onOpenChange={setHomepageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingHomepage ? "Edit Homepage Section" : "Add Homepage Section"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Section Name</Label><Input value={homepageForm.section_type} onChange={(e) => setHomepageForm({ ...homepageForm, section_type: e.target.value })} /></div>
            <div><Label>Title</Label><Input value={homepageForm.title} onChange={(e) => setHomepageForm({ ...homepageForm, title: e.target.value })} /></div>
            <div><Label>Subtitle</Label><Input value={homepageForm.subtitle} onChange={(e) => setHomepageForm({ ...homepageForm, subtitle: e.target.value })} /></div>
            <div><Label>Content</Label><Textarea value={homepageForm.content} onChange={(e) => setHomepageForm({ ...homepageForm, content: e.target.value })} rows={4} /></div>
            <div>
              <Label>Status</Label>
              <Select value={homepageForm.status} onValueChange={(v) => setHomepageForm({ ...homepageForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={saveHomepageSection}>Save Section</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
