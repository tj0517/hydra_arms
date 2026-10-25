// Fallbacks used when Sanity siteSettings has no value. Shared so the footer, homepage and /kontakt
// can never show different numbers.

/** O-09: still to be confirmed by the client. */
export const DEFAULT_TELEFON = "511 307 179";

/** Contact addresses shown when siteSettings has none (footer, homepage, JSON-LD). */
export const DEFAULT_EMAILS = {
  rd: "research@hydra-arms.com",
  b2g: "gov@hydra-arms.com",
  handel: "sprzedaz@hydra-arms.com",
  biuro: "office@hydra-arms.com",
} as const;

export type SiteEmails = { rd: string; b2g: string; handel: string; biuro: string };

/** The four contact addresses from siteSettings (field names as in the Sanity schema), with fallbacks. */
export function siteEmails(
  s?: { emailRD?: string; emailB2G?: string; emailHandel?: string; emailBiuro?: string } | null,
): SiteEmails {
  return {
    rd: s?.emailRD || DEFAULT_EMAILS.rd,
    b2g: s?.emailB2G || DEFAULT_EMAILS.b2g,
    handel: s?.emailHandel || DEFAULT_EMAILS.handel,
    biuro: s?.emailBiuro || DEFAULT_EMAILS.biuro,
  };
}
