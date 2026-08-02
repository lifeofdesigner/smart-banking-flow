/**
 * CMS-authored free text (testimonial quotes, product descriptions, FAQ
 * answers, etc.) sometimes needs to reference the bank by name. Hardcoding
 * the name means it goes stale the next time an admin renames the site.
 * Authors can instead write the placeholder {{site_name}} and it's swapped
 * for the live site name at render time everywhere this is applied.
 */
export const applySiteName = (text: string, siteName: string): string =>
  text.replace(/\{\{\s*site_name\s*\}\}/gi, siteName);
