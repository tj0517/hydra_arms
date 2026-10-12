/**
 * Unit tests for xml-integration/bl-catalogue-setup.ts (HA-2.26) — the logic the
 * category/tag build script runs against BaseLinker, exercised on an in-memory
 * stand-in for the catalogue (no BaseLinker call, no mock client).
 *
 * Runner: npx tsx --test xml-integration/__tests__/bl-catalogue-setup.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { resolve } from 'path';

import { parseHydraTree, UNASSIGNED_CATEGORY, type ParsedHydraCategory } from '../hydra-tree-txt';
import {
  ensureCategoryTree,
  foreignCategories,
  missingImportTags,
  IMPORT_TAGS_TO_CREATE,
  type ExistingCategory,
} from '../bl-catalogue-setup';
import { IMPORT_OWNED_TAGS, TAG_PERMIT_OFF, TAG_PERMIT_OK } from '../import-tags';

const txt = readFileSync(resolve(process.cwd(), 'xml-integration/hydra-category-tree.txt'), 'utf8');
const TREE: ParsedHydraCategory[] = [UNASSIGNED_CATEGORY, ...parseHydraTree(txt)];

/** In-memory catalogue: `create` appends a category, optionally failing after N writes. */
class FakeCatalogue {
  categories: ExistingCategory[] = [];
  private nextId = 9_000_001;
  constructor(public failAfter = Infinity) {}

  create = async (cat: ParsedHydraCategory, parentBlId: number): Promise<number> => {
    if (this.categories.length >= this.failAfter) throw new Error('network down');
    const category_id = this.nextId++;
    this.categories.push({ category_id, name: cat.blName, parent_id: parentBlId });
    return category_id;
  };
}

test('ensureCategoryTree: empty catalogue → 206 created, children hang under their parent id', async () => {
  const bl = new FakeCatalogue();
  const res = await ensureCategoryTree(TREE, bl.categories, bl.create);

  assert.deepEqual({ created: res.created, reused: res.reused }, { created: 206, reused: 0 });
  assert.equal(res.idByNum.size, 206);
  assert.equal(new Set(res.idByNum.values()).size, 206, 'ids are unique');

  const byId = new Map(bl.categories.map((c) => [c.category_id, c]));
  assert.equal(byId.get(res.idByNum.get('00')!)!.parent_id, 0);
  assert.equal(byId.get(res.idByNum.get('01')!)!.parent_id, 0);
  assert.equal(byId.get(res.idByNum.get('1.1')!)!.parent_id, res.idByNum.get('01'));
  assert.equal(byId.get(res.idByNum.get('3.4.3')!)!.parent_id, res.idByNum.get('3.4'));
});

test('ensureCategoryTree: re-run after an interrupted write is not refused and creates no duplicates', async () => {
  // Run 1 dies after 80 categories reached the catalogue
  const bl = new FakeCatalogue(80);
  await assert.rejects(() => ensureCategoryTree(TREE, bl.categories, bl.create), /network down/);
  assert.equal(bl.categories.length, 80);
  const afterRun1 = bl.categories.map((c) => ({ ...c }));

  // Run 2 starts from what is in the catalogue: all of it is Hydra's → no refusal
  assert.deepEqual(foreignCategories(afterRun1, TREE), []);
  bl.failAfter = Infinity;
  const res = await ensureCategoryTree(TREE, afterRun1, bl.create);

  assert.deepEqual({ created: res.created, reused: res.reused }, { created: 126, reused: 80 });
  assert.equal(bl.categories.length, 206, 'catalogue holds each category once');
  assert.equal(new Set(bl.categories.map((c) => c.name)).size, 206, 'no duplicated name');
  assert.equal(new Set(bl.categories.map((c) => c.category_id)).size, 206);
  // The 80 from run 1 keep their ids in the mapping
  for (const c of afterRun1) {
    const num = TREE.find((t) => t.blName === c.name)!.num;
    assert.equal(res.idByNum.get(num), c.category_id);
  }
});

test('ensureCategoryTree: re-run on a complete catalogue writes nothing and returns the same mapping', async () => {
  const bl = new FakeCatalogue();
  const first = await ensureCategoryTree(TREE, bl.categories, bl.create);
  const neverCreate = async (): Promise<number> => { throw new Error('must not write'); };
  const second = await ensureCategoryTree(TREE, [...bl.categories], neverCreate);

  assert.deepEqual({ created: second.created, reused: second.reused }, { created: 0, reused: 206 });
  assert.deepEqual([...second.idByNum], [...first.idByNum]);
});

test('ensureCategoryTree: a create that returns no id stops the run', async () => {
  await assert.rejects(
    () => ensureCategoryTree(TREE, [], async () => undefined as unknown as number),
    /no category_id returned for "00\. DO PRZYPISANIA"/,
  );
});

test('foreignCategories: a category is Hydra\'s when its name is a tree name; anything else is foreign', () => {
  assert.deepEqual(foreignCategories([], TREE), [], 'empty catalogue');
  const other = [
    { category_id: 1, name: '01. BROŃ PALNA', parent_id: 0 },
    { category_id: 2, name: 'Akcesoria do broni palnej', parent_id: 0 },
    { category_id: 3, name: '1.1 Broń krótka', parent_id: 1 }, // differs in case → not ours
  ];
  assert.deepEqual(foreignCategories(other, TREE), [other[1], other[2]]);
});

test('IMPORT_TAGS_TO_CREATE: the five task tags + every tag the import writes; admin permit tags excluded', () => {
  assert.deepEqual([...IMPORT_TAGS_TO_CREATE], ['auto', 'review', 'flag', 'approved', 'age_18', 'permit', 'permit_review']);
  for (const t of IMPORT_OWNED_TAGS) assert.ok((IMPORT_TAGS_TO_CREATE as readonly string[]).includes(t), `${t} is written by the import`);
  assert.equal((IMPORT_TAGS_TO_CREATE as readonly string[]).includes(TAG_PERMIT_OFF), false);
  assert.equal((IMPORT_TAGS_TO_CREATE as readonly string[]).includes(TAG_PERMIT_OK), false);
});

test('missingImportTags: a tag already on the account by name is skipped — re-run creates nothing', () => {
  assert.deepEqual(missingImportTags([]), [...IMPORT_TAGS_TO_CREATE]);
  // interrupted after three tags
  assert.deepEqual(missingImportTags(['auto', 'review', 'flag']), ['approved', 'age_18', 'permit', 'permit_review']);
  assert.deepEqual(missingImportTags([...IMPORT_TAGS_TO_CREATE, 'client-own-tag']), []);
  // exact names only: "Auto" is another tag, not ours
  assert.deepEqual(missingImportTags(['Auto']), [...IMPORT_TAGS_TO_CREATE]);
});
