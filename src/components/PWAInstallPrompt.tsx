import { useEffect, useState } from "react";
import { X, Share, PlusSquare, CheckCircle2, Download } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { usePwaInstall } from "@/hooks/usePwaInstall";

const VISIT_COUNT_KEY = "pwa_visit_count";
const DISMISSED_AT_KEY = "pwa_prompt_dismissed_at";
const SESSION_COUNTED_KEY = "pwa_visit_counted_this_session";

const getVisitCount = () => {
  const stored = Number(localStorage.getItem(VISIT_COUNT_KEY) || "0");
  if (sessionStorage.getItem(SESSION_COUNTED_KEY)) return stored;

  const next = stored + 1;
  localStorage.setItem(VISIT_COUNT_KEY, String(next));
  sessionStorage.setItem(SESSION_COUNTED_KEY, "1");
  return next;
};

/**
 * Fully CMS-driven "install this as an app" prompt. Reads every piece of
 * content, timing, and styling from site_settings (see the "Mobile App" tab
 * in Site Settings) so an admin can configure the whole experience without
 * touching code. Never renders if already installed, disabled, dismissed
 * within the configured cooldown, or on a browser/visit that doesn't
 * qualify yet.
 */
export default function PWAInstallPrompt() {
  const siteSettings = useSiteSettings();
  const { canPromptNatively, isStandalone, isIOS, promptInstall } = usePwaInstall();
  const [visible, setVisible] = useState(false);
  const [showIOSSteps, setShowIOSSteps] = useState(false);
  const [installing, setInstalling] = useState(false);

  const enabled = siteSettings.pwa_prompt_enabled === "true";

  useEffect(() => {
    if (!enabled || isStandalone) {
      setVisible(false);
      return;
    }
    if (!canPromptNatively && !isIOS) {
      // Nothing actionable to offer on this browser (e.g. desktop Firefox).
      return;
    }

    const dismissedAt = Number(localStorage.getItem(DISMISSED_AT_KEY) || "0");
    const reappearDays = Number(siteSettings.pwa_prompt_reappear_days || "7");
    if (dismissedAt && Date.now() - dismissedAt < reappearDays * 24 * 60 * 60 * 1000) {
      return;
    }

    const visitCount = getVisitCount();
    const trigger = siteSettings.pwa_prompt_trigger || "first_visit";
    const threshold = Number(siteSettings.pwa_prompt_visit_threshold || "3");

    const shouldShow = trigger === "first_visit" ? visitCount >= 1 : visitCount >= threshold;
    if (shouldShow) {
      // Small delay so it never competes with the initial page paint.
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [enabled, isStandalone, canPromptNatively, isIOS, siteSettings.pwa_prompt_reappear_days, siteSettings.pwa_prompt_trigger, siteSettings.pwa_prompt_visit_threshold]);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_AT_KEY, String(Date.now()));
    setVisible(false);
  };

  const handlePrimaryAction = async () => {
    if (siteSettings.pwa_prompt_cta_url) {
      window.open(siteSettings.pwa_prompt_cta_url, "_blank", "noopener,noreferrer");
      dismiss();
      return;
    }
    if (isIOS && !canPromptNatively) {
      setShowIOSSteps(true);
      return;
    }
    setInstalling(true);
    const accepted = await promptInstall();
    setInstalling(false);
    if (accepted) setVisible(false);
  };

  if (!visible) return null;

  const bgColor = siteSettings.pwa_prompt_bg_color || "#0A1628";
  const accentColor = siteSettings.pwa_prompt_accent_color || "#C9A84C";
  const iconUrl = siteSettings.pwa_prompt_icon_url || siteSettings.site_logo_url;
  const siteName = siteSettings.site_name || "our app";
  const title = siteSettings.pwa_prompt_title || `Install ${siteName}`;
  const subtitle = siteSettings.pwa_prompt_subtitle || "";
  const description = siteSettings.pwa_prompt_description || "";
  const benefits = [siteSettings.pwa_prompt_benefit_1, siteSettings.pwa_prompt_benefit_2, siteSettings.pwa_prompt_benefit_3].filter(Boolean);
  const primaryLabel = siteSettings.pwa_prompt_primary_label || "Install App";
  const secondaryLabel = siteSettings.pwa_prompt_secondary_label || "Not Now";
  const style = siteSettings.pwa_prompt_style || "bottom_sheet";
  const position = siteSettings.pwa_prompt_position || "bottom-right";

  const renderContent = (compact: boolean) => (
    <div className={`flex flex-col ${compact ? "gap-3" : "gap-4"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {iconUrl ? (
            <img src={iconUrl} alt="" className={`shrink-0 rounded-xl object-contain ${compact ? "h-9 w-9" : "h-11 w-11"}`} />
          ) : (
            <div
              className={`grid shrink-0 place-items-center rounded-xl ${compact ? "h-9 w-9" : "h-11 w-11"}`}
              style={{ backgroundColor: accentColor }}
            >
              <Download className={compact ? "h-4 w-4" : "h-5 w-5"} style={{ color: bgColor }} />
            </div>
          )}
          <div>
            <p className="font-semibold text-white">{title}</p>
            {subtitle && !compact ? <p className="text-sm text-white/70">{subtitle}</p> : null}
          </div>
        </div>
        <button type="button" onClick={dismiss} className="shrink-0 text-white/60 transition hover:text-white" aria-label="Dismiss">
          <X className="h-4 w-4" />
        </button>
      </div>

      {description && !compact ? <p className="text-sm leading-6 text-white/80">{description}</p> : null}

      {benefits.length > 0 && !showIOSSteps && !compact ? (
        <ul className="space-y-1.5">
          {benefits.map((benefit) => (
            <li key={benefit} className="flex items-start gap-2 text-sm text-white/85">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: accentColor }} />
              {benefit}
            </li>
          ))}
        </ul>
      ) : null}

      {showIOSSteps ? (
        <div className="space-y-2 rounded-lg bg-white/10 p-3 text-sm text-white">
          <p className="flex items-center gap-2">
            1. Tap <Share className="h-4 w-4" /> Share in Safari's toolbar
          </p>
          <p className="flex items-center gap-2">
            2. Tap <PlusSquare className="h-4 w-4" /> "Add to Home Screen"
          </p>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handlePrimaryAction}
            disabled={installing}
            className={`flex-1 rounded-lg text-sm font-semibold shadow-sm transition disabled:opacity-60 ${compact ? "px-3 py-2" : "px-4 py-2.5"}`}
            style={{ backgroundColor: accentColor, color: bgColor }}
          >
            {installing ? "Installing..." : primaryLabel}
          </button>
          {!compact && (
            <button
              type="button"
              onClick={dismiss}
              className="rounded-lg border border-white/30 px-4 py-2.5 text-sm font-medium text-white/90 transition hover:bg-white/10"
            >
              {secondaryLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
  const content = renderContent(false);
  const compactContent = renderContent(true);

  if (style === "modal") {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
        <div className="w-full max-w-sm rounded-2xl p-6 shadow-2xl" style={{ backgroundColor: bgColor }}>
          {content}
        </div>
      </div>
    );
  }

  if (style === "bottom_sheet") {
    return (
      <div className="fixed inset-x-0 bottom-0 z-[100] p-3 sm:flex sm:justify-center">
        <div className="w-full rounded-2xl p-5 shadow-2xl sm:max-w-md" style={{ backgroundColor: bgColor }}>
          {content}
        </div>
      </div>
    );
  }

  if (style === "notification_card") {
    const positionClass =
      position === "bottom-left" ? "bottom-4 left-4" : position === "top" ? "top-4 left-1/2 -translate-x-1/2" : "bottom-4 right-4";
    return (
      <div className={`fixed z-[100] w-[calc(100vw-2rem)] max-w-[300px] ${positionClass}`}>
        <div className="rounded-xl p-3.5 shadow-2xl" style={{ backgroundColor: bgColor }}>
          {compactContent}
        </div>
      </div>
    );
  }

  // floating_banner
  const bannerPositionClass =
    position === "bottom-left" ? "bottom-4 left-4" : position === "top" ? "top-4 left-1/2 -translate-x-1/2" : "bottom-4 right-4";
  return (
    <div className={`fixed z-[100] w-[calc(100vw-2rem)] max-w-sm ${bannerPositionClass}`}>
      <div className="rounded-2xl p-5 shadow-2xl" style={{ backgroundColor: bgColor }}>
        {content}
      </div>
    </div>
  );
}
