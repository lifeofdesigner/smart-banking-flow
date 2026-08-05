import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Eye, GripVertical, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CmsEditorSheet, CmsField, CmsFormSection } from "@/components/admin/CmsEditorSheet";
import type { WireTransferVerificationStep } from "@/lib/wireTransferVerification";
import { toast } from "sonner";

type StepFormState = Omit<WireTransferVerificationStep, "id">;

const defaultForm = (): StepFormState => ({
  step_code: "",
  title: "",
  description: "",
  message_title: "Important",
  message_body: "",
  message_background_color: "#FFFBEB",
  message_border_color: "#F59E0B",
  message_icon: "AlertTriangle",
  requires_code: true,
  code_label: "Enter verification code",
  placeholder: "CODE-XXXXXXXX",
  button_text: "Verify Code",
  icon: "ShieldCheck",
  display_order: 1,
  is_active: true,
  allow_skip: false,
  requires_admin: false,
  visible_to_customer: true,
  show_icon: true,
  auto_complete: false,
});

const normalize = (rows: WireTransferVerificationStep[]) =>
  [...rows].sort((a, b) => a.display_order - b.display_order);

export default function WireTransferVerificationManager() {
  const [steps, setSteps] = useState<WireTransferVerificationStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [previewStepCode, setPreviewStepCode] = useState<string>("");
  const [form, setForm] = useState<StepFormState>(defaultForm());

  const activeSteps = useMemo(() => normalize(steps).filter((step) => step.is_active), [steps]);
  const previewStep = useMemo(
    () => activeSteps.find((step) => step.step_code === previewStepCode) || activeSteps[0] || null,
    [activeSteps, previewStepCode],
  );

  useEffect(() => {
    void fetchSteps();
  }, []);

  useEffect(() => {
    if (!previewStepCode && activeSteps[0]) {
      setPreviewStepCode(activeSteps[0].step_code);
    }
  }, [activeSteps, previewStepCode]);

  const fetchSteps = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("wire_transfer_verification_steps")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    setSteps((data || []) as WireTransferVerificationStep[]);
    setLoading(false);
  };

  const openCreate = () => {
    const nextOrder = (steps.reduce((max, step) => Math.max(max, step.display_order), 0) || 0) + 1;
    setEditingId(null);
    setForm({ ...defaultForm(), display_order: nextOrder });
    setDialogOpen(true);
  };

  const openEdit = (step: WireTransferVerificationStep) => {
    setEditingId(step.id);
    setForm({
      step_code: step.step_code,
      title: step.title,
      description: step.description || "",
      message_title: step.message_title || "",
      message_body: step.message_body || "",
      message_background_color: step.message_background_color || "#FFFBEB",
      message_border_color: step.message_border_color || "#F59E0B",
      message_icon: step.message_icon || "",
      requires_code: step.requires_code ?? true,
      code_label: step.code_label || "",
      placeholder: step.placeholder || "",
      button_text: step.button_text || "",
      icon: step.icon || "",
      display_order: step.display_order,
      is_active: step.is_active,
      allow_skip: step.allow_skip,
      requires_admin: step.requires_admin,
      visible_to_customer: step.visible_to_customer,
      show_icon: step.show_icon,
      auto_complete: step.auto_complete,
    });
    setDialogOpen(true);
  };

  const saveStep = async () => {
    setSaving(true);
    const payload = {
      ...form,
      step_code: form.step_code.trim().toUpperCase(),
      title: form.title.trim(),
      description: form.description.trim() || null,
      message_title: form.message_title.trim() || null,
      message_body: form.message_body.trim() || null,
      code_label: form.requires_code ? form.code_label.trim() || null : null,
      placeholder: form.requires_code ? form.placeholder.trim() || null : null,
      button_text: form.requires_code ? form.button_text.trim() || null : null,
      icon: form.icon.trim() || null,
    };

    const query = editingId
      ? supabase.from("wire_transfer_verification_steps").update(payload).eq("id", editingId)
      : supabase.from("wire_transfer_verification_steps").insert(payload);

    const { error } = await query;
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(editingId ? "Step updated" : "Step added");
    setDialogOpen(false);
    await fetchSteps();
  };

  const deleteStep = async (step: WireTransferVerificationStep) => {
    const previous = steps;
    setSteps((current) => current.filter((item) => item.id !== step.id));
    const { error } = await supabase.from("wire_transfer_verification_steps").delete().eq("id", step.id);
    if (error) {
      setSteps(previous);
      toast.error(error.message);
      return;
    }
    toast.success("Step deleted");
    await fetchSteps();
  };

  const toggleActive = async (step: WireTransferVerificationStep) => {
    const nextValue = !step.is_active;
    setSteps((current) => current.map((item) => (item.id === step.id ? { ...item, is_active: nextValue } : item)));
    const { error } = await supabase.from("wire_transfer_verification_steps").update({ is_active: nextValue }).eq("id", step.id);
    if (error) {
      toast.error(error.message);
      await fetchSteps();
      return;
    }
    toast.success(nextValue ? "Step enabled" : "Step disabled");
  };

  const reorder = async (currentId: string, targetId: string) => {
    if (currentId === targetId) return;
    const ordered = normalize(steps);
    const currentIndex = ordered.findIndex((item) => item.id === currentId);
    const targetIndex = ordered.findIndex((item) => item.id === targetId);
    if (currentIndex < 0 || targetIndex < 0) return;
    const next = [...ordered];
    [next[currentIndex], next[targetIndex]] = [next[targetIndex], next[currentIndex]];
    const renumbered = next.map((item, index) => ({ ...item, display_order: index + 1 }));
    setSteps(renumbered);
    const { error } = await supabase.from("wire_transfer_verification_steps").upsert(
      renumbered.map((item) => ({ id: item.id, display_order: item.display_order })),
      { onConflict: "id" },
    );
    if (error) {
      toast.error(error.message);
      await fetchSteps();
      return;
    }
    toast.success("Order updated");
  };

  const moveStep = async (step: WireTransferVerificationStep, direction: "up" | "down") => {
    const ordered = normalize(steps);
    const index = ordered.findIndex((item) => item.id === step.id);
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= ordered.length) return;
    await reorder(ordered[index].id, ordered[swapIndex].id);
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading wire transfer verification settings...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-[var(--bank-navy)]">Wire Transfer Verification</h3>
          <p className="text-sm text-muted-foreground">Manage the full wire verification workflow.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Add Step
        </Button>
      </div>

      <Tabs defaultValue="steps" className="space-y-4">
        <TabsList>
          <TabsTrigger value="steps">Steps</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="steps" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Verification Steps</CardTitle>
              <CardDescription>Drag to reorder, or use the arrows to move items.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead />
                    <TableHead>Order</TableHead>
                    <TableHead>Step</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {normalize(steps).map((step, index) => (
                    <TableRow
                      key={step.id}
                      draggable
                      onDragStart={() => setDraggedId(step.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (draggedId) {
                          void reorder(draggedId, step.id);
                        }
                        setDraggedId(null);
                      }}
                      onDragEnd={() => setDraggedId(null)}
                    >
                      <TableCell className="w-10">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{step.title}</div>
                          <div className="text-xs text-muted-foreground">{step.description || "No description"}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{step.step_code}</TableCell>
                      <TableCell>
                        <Badge variant={step.is_active ? "default" : "secondary"}>{step.is_active ? "Enabled" : "Disabled"}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveStep(step, "up")}>
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveStep(step, "down")}>
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(step)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleActive(step)}>
                            {step.is_active ? "⏸" : "▶"}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteStep(step)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle>Customer Preview</CardTitle>
              <CardDescription>Preview the current customer experience from the configured workflow.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Current Active Step</Label>
                <select
                  value={previewStepCode}
                  onChange={(e) => setPreviewStepCode(e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {activeSteps.map((step) => (
                    <option key={step.id} value={step.step_code}>
                      {step.title}
                    </option>
                  ))}
                </select>
              </div>

              {previewStep ? (
                <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="rounded-xl border bg-white p-6">
                    <div className="mb-4 flex items-center gap-3">
                      {previewStep.show_icon ? <div className="rounded-full bg-[var(--bank-navy)]/10 p-3">🔒</div> : null}
                      <div>
                        <h4 className="text-xl font-semibold">{previewStep.title}</h4>
                        <p className="text-sm text-muted-foreground">{previewStep.description}</p>
                      </div>
                    </div>

                    <div
                      className="mb-6 rounded-lg border-l-4 p-4"
                      style={{
                        backgroundColor: previewStep.message_background_color || "#FFFBEB",
                        borderColor: previewStep.message_border_color || "#F59E0B",
                      }}
                    >
                      <p className="mb-1 text-sm font-semibold">{previewStep.message_title || "Important"}</p>
                      <p className="text-sm">{previewStep.message_body || "Editable verification message."}</p>
                    </div>

                    {previewStep.requires_code ? (
                      <div className="space-y-2">
                        <Label>{previewStep.code_label || "Enter verification code"}</Label>
                        <Input placeholder={previewStep.placeholder || "CODE-XXXXXXXX"} />
                        <Button className="mt-2 w-full">{previewStep.button_text || "Verify Code"}</Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">This step is informational only.</p>
                        <Button className="w-full">{previewStep.button_text || "Continue"}</Button>
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border bg-white p-6">
                    <h4 className="mb-4 font-semibold">Progress Panel</h4>
                    <div className="space-y-3">
                      {activeSteps.map((step, index) => (
                        <div key={step.id} className="flex items-center gap-3">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                              step.step_code === previewStep.step_code
                                ? "bg-[var(--bank-navy)] text-white"
                                : "border border-border text-muted-foreground"
                            }`}
                          >
                            {index + 1}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{step.title}</p>
                            <p className="text-xs text-muted-foreground">{step.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Add at least one active step to preview the workflow.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CmsEditorSheet
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editingId ? "Edit Verification Step" : "Add Verification Step"}
        description="Configure the wire transfer verification step."
        onSave={saveStep}
        saveLabel={editingId ? "Update Step" : "Save Step"}
        saving={saving}
      >
        <CmsFormSection title="Step Details">
          <div className="grid gap-4 md:grid-cols-2">
            <CmsField label="Step Code" helperText="Stable key used by the workflow and verification codes.">
              <Input value={form.step_code} onChange={(e) => setForm((prev) => ({ ...prev, step_code: e.target.value }))} />
            </CmsField>
            <CmsField label="Display Order">
              <Input
                type="number"
                value={form.display_order}
                onChange={(e) => setForm((prev) => ({ ...prev, display_order: Number(e.target.value) || 0 }))}
              />
            </CmsField>
          </div>
          <CmsField label="Step Name">
            <Input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} />
          </CmsField>
          <CmsField label="Short Description">
            <Textarea value={form.description || ""} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} />
          </CmsField>
        </CmsFormSection>

        <CmsFormSection title="Important Box">
          <div className="grid gap-4 md:grid-cols-2">
            <CmsField label="Title">
              <Input value={form.message_title || ""} onChange={(e) => setForm((prev) => ({ ...prev, message_title: e.target.value }))} />
            </CmsField>
            <CmsField label="Icon Name">
              <Input value={form.message_icon || ""} onChange={(e) => setForm((prev) => ({ ...prev, message_icon: e.target.value }))} />
            </CmsField>
            <CmsField label="Background Color">
              <Input value={form.message_background_color || ""} onChange={(e) => setForm((prev) => ({ ...prev, message_background_color: e.target.value }))} />
            </CmsField>
            <CmsField label="Border Color">
              <Input value={form.message_border_color || ""} onChange={(e) => setForm((prev) => ({ ...prev, message_border_color: e.target.value }))} />
            </CmsField>
          </div>
          <CmsField label="Body Text">
            <Textarea value={form.message_body || ""} onChange={(e) => setForm((prev) => ({ ...prev, message_body: e.target.value }))} />
          </CmsField>
        </CmsFormSection>

        <CmsFormSection title="Code Input">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Requires Verification Code</p>
              <p className="text-xs text-muted-foreground">Hide the input completely when disabled.</p>
            </div>
            <Switch checked={form.requires_code} onCheckedChange={(checked) => setForm((prev) => ({ ...prev, requires_code: checked }))} />
          </div>
          {form.requires_code ? (
            <div className="grid gap-4 md:grid-cols-3">
              <CmsField label="Verification Code Label">
                <Input value={form.code_label || ""} onChange={(e) => setForm((prev) => ({ ...prev, code_label: e.target.value }))} />
              </CmsField>
              <CmsField label="Placeholder">
                <Input value={form.placeholder || ""} onChange={(e) => setForm((prev) => ({ ...prev, placeholder: e.target.value }))} />
              </CmsField>
              <CmsField label="Button Text">
                <Input value={form.button_text || ""} onChange={(e) => setForm((prev) => ({ ...prev, button_text: e.target.value }))} />
              </CmsField>
            </div>
          ) : null}
        </CmsFormSection>

        <CmsFormSection title="Optional Settings">
          <div className="grid gap-3 md:grid-cols-2">
            {[
              ["Show Icon", "show_icon"],
              ["Allow Skip", "allow_skip"],
              ["Auto Complete", "auto_complete"],
              ["Requires Admin Approval", "requires_admin"],
              ["Visible To Customer", "visible_to_customer"],
              ["Enabled", "is_active"],
            ].map(([label, key]) => (
              <div key={key} className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">{label}</p>
                </div>
                <Switch
                  checked={Boolean((form as Record<string, boolean>)[key])}
                  onCheckedChange={(checked) => setForm((prev) => ({ ...prev, [key]: checked } as StepFormState))}
                />
              </div>
            ))}
          </div>
          <CmsField label="Icon">
            <Input value={form.icon || ""} onChange={(e) => setForm((prev) => ({ ...prev, icon: e.target.value }))} />
          </CmsField>
        </CmsFormSection>
      </CmsEditorSheet>
    </div>
  );
}
