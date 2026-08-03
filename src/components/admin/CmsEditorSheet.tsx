import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/**
 * Shared "source of truth" shell for every CMS content editor (product,
 * product section, FAQ, homepage section). A wide, full-height slide-over
 * with a fixed header/footer and a scrolling body, so long fields (like a
 * full product description) get real room instead of a cramped, scrolling
 * textarea inside a small centered modal.
 */
export function CmsEditorSheet({
  open,
  onOpenChange,
  title,
  description,
  onSave,
  saveLabel = "Save",
  saving = false,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  onSave: () => void;
  saveLabel?: string;
  saving?: boolean;
  children: ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl"
      >
        <SheetHeader className="shrink-0 border-b border-border px-6 py-5 text-left">
          <SheetTitle className="text-xl">{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-8">{children}</div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border bg-background px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? "Saving..." : saveLabel}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** One labeled group of fields within a CmsEditorSheet. Keeps section headings, spacing, and helper-text styling identical across every editor. */
export function CmsFormSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      <div className="space-y-1 border-b border-border pb-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">{title}</h3>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

/** One field: label, optional helper text, and the control. Keeps label sizing/spacing identical everywhere. */
export function CmsField({
  label,
  helperText,
  children,
  className,
}: {
  label: string;
  helperText?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="text-sm font-medium text-foreground">{label}</label>
      {helperText ? <p className="text-xs text-muted-foreground">{helperText}</p> : null}
      {children}
    </div>
  );
}
