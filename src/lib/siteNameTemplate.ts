/**
 * CMS-authored free text (testimonial quotes, product descriptions, FAQ
 * answers, etc.) sometimes needs to reference the bank by name or the
 * country it operates in. Hardcoding either means it goes stale the next
 * time an admin renames the site or re-skins it for a different country.
 * Authors can instead write {{site_name}} or {{country}} and they're
 * swapped for the live values at render time everywhere this is applied.
 */
type TemplateValues = {
  site_name?: string;
  country?: string;
};

export const applySiteTemplate = (text: string, values: TemplateValues): string => {
  let result = text;

  if (values.site_name !== undefined) {
    result = result.replace(/\{\{\s*site_name\s*\}\}/gi, values.site_name);
  }

  if (values.country !== undefined) {
    result = result.replace(/\{\{\s*country\s*\}\}/gi, values.country);
  }

  return result;
};

/** Kept for any call site not yet migrated to applySiteTemplate. */
export const applySiteName = (text: string, siteName: string): string =>
  applySiteTemplate(text, { site_name: siteName });
