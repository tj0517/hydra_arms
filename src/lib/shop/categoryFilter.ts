/**
 * The BaseLinker inventory also carries ~55 auto-generated marketplace
 * category paths (Google Shopping / Ceneo / Allegro export mappings, e.g.
 * "Hobby/Militaria i strzelectwo/...", "OFERTA/BROŃ PALNA/...") alongside
 * the real product taxonomy built by scripts/bl-build-categories.ts
 * (xml-integration/hydra-category-tree.txt — 15 numbered branches "01." to
 * "15.", plus the "00. DO PRZYPISANIA" triage bucket). getInventoryCategories
 * returns everything in the inventory, so the sync must filter down to just
 * the Hydra tree before writing to Supabase.
 */
const HYDRA_ROOT_RE = /^\d{2}\./;

export function filterHydraCategories<T extends { category_id: number; name: string; parent_id: number }>(
  categories: T[],
): T[] {
  const hydraIds = new Set(
    categories.filter(c => HYDRA_ROOT_RE.test(c.name)).map(c => c.category_id),
  );

  // Pull in descendants of Hydra roots (their names don't carry the "NN." prefix)
  let changed = true;
  while (changed) {
    changed = false;
    for (const c of categories) {
      if (!hydraIds.has(c.category_id) && c.parent_id !== 0 && hydraIds.has(c.parent_id)) {
        hydraIds.add(c.category_id);
        changed = true;
      }
    }
  }

  return categories.filter(c => hydraIds.has(c.category_id));
}
