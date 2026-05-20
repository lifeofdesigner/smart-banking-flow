import { Megaphone, X } from "lucide-react";
import { useState } from "react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export default function AnnouncementBanner() {
  const settings = useSiteSettings();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || settings.announcement_enabled !== "true") {
    return null;
  }

  const message = settings.announcement_message || "";
  if (!message.trim()) return null;

  return (
    <div className="bg-[var(--bank-navy)] px-4 py-2 text-white">
      <div className="container mx-auto flex items-center justify-between gap-3 text-sm">
        <div className="flex min-w-0 items-center gap-2">
          <Megaphone className="h-4 w-4 flex-shrink-0 text-[var(--bank-gold)]" />
          <span className="truncate">
            {settings.announcement_title ? `${settings.announcement_title}: ` : ""}
            {message}
          </span>
          {settings.announcement_link_url ? (
            <a
              href={settings.announcement_link_url}
              className="hidden flex-shrink-0 font-semibold text-[var(--bank-gold)] underline-offset-4 hover:underline sm:inline"
            >
              {settings.announcement_link_label || "Learn more"}
            </a>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
          aria-label="Dismiss announcement"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
