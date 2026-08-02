import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ImageOff, Images, Upload, X } from "lucide-react";
import { toast } from "sonner";

interface MediaItem {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
}

/**
 * No-code image field: preview + Upload New / Choose from Library / Remove.
 * Replaces raw "paste an image URL" text inputs across the admin CMS.
 */
export function ImagePicker({
  label,
  value,
  onChange,
  helperText,
  aspectRatio = "aspect-video",
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  helperText?: string;
  aspectRatio?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("cms-media").upload(path, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("cms-media").getPublicUrl(path);
      await supabase.from("media_library").insert({
        file_name: file.name,
        file_url: data.publicUrl,
        file_type: file.type.startsWith("image") ? "image" : "document",
      });

      onChange(data.publicUrl);
      toast.success("Image uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const openLibrary = async () => {
    setLibraryOpen(true);
    setLoadingMedia(true);
    const { data } = await supabase
      .from("media_library")
      .select("id, file_name, file_url, file_type")
      .eq("file_type", "image")
      .order("created_at", { ascending: false });
    setMedia(data || []);
    setLoadingMedia(false);
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {helperText ? <p className="text-xs text-muted-foreground">{helperText}</p> : null}

      <div className={`relative w-full max-w-sm overflow-hidden rounded-lg border border-border bg-secondary/30 ${aspectRatio}`}>
        {value ? (
          <img src={value} alt={label} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageOff className="h-6 w-6" />
            <span className="text-xs">No image set</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadFile(file);
            e.target.value = "";
          }}
        />
        <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
          <Upload className="mr-1.5 h-3.5 w-3.5" />
          {uploading ? "Uploading..." : "Upload New"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={openLibrary}>
          <Images className="mr-1.5 h-3.5 w-3.5" />
          Choose from Library
        </Button>
        {value ? (
          <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => onChange("")}>
            <X className="mr-1.5 h-3.5 w-3.5" />
            Remove
          </Button>
        ) : null}
      </div>

      <Dialog open={libraryOpen} onOpenChange={setLibraryOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Choose an image</DialogTitle>
          </DialogHeader>
          {loadingMedia ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : media.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No images uploaded yet. Close this and use "Upload New" to add one — it'll show up here for reuse next time.
            </p>
          ) : (
            <div className="grid max-h-[60vh] grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-4">
              {media.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="group relative aspect-square overflow-hidden rounded-lg border border-border hover:border-primary"
                  onClick={() => {
                    onChange(item.file_url);
                    setLibraryOpen(false);
                  }}
                >
                  <img src={item.file_url} alt={item.file_name} className="h-full w-full object-cover" />
                  <span className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-1.5 py-1 text-[10px] text-white opacity-0 group-hover:opacity-100">
                    {item.file_name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
