/**
 * Feed diagnostics (HA-2.15): the simulation must follow the import's upsert key exactly —
 * since HA-2.28 the shared findBLMatch(): EAN across suppliers first, then this supplier's
 * `<SUPPLIER>-<feed sku>` only.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  compareStock,
  eanShapes,
  numericSkuCount,
  simulateImports,
  simulateSync,
  type SlimProduct,
} from '../feed-diagnostics';
import type { Supplier } from '../bl-match-key';

function prod(supplier: Supplier, id: string, sku: string, ean: string, name: string, extra: Partial<SlimProduct> = {}): SlimProduct {
  return { supplier, id, sku, ean, name, stock: 5, admitted: true, ...extra };
}

test('a product two suppliers carry under one EAN is one catalogue product, counted as shared', () => {
  const { runs, catalogue } = simulateImports(['kolba', 'sharg'], {
    kolba: [prod('kolba', 'k1', '053-057ZB1', '5905247629906', 'Latarka A')],
    sharg: [prod('sharg', 's1', '139', '5905247629906', 'Latarka A (Sharg)')],
  });
  assert.equal(catalogue.length, 1);
  assert.deepEqual([runs[0].created, runs[1].created, runs[1].sharedByEan, runs[1].mergedBySkuOnly], [1, 0, 1, 0]);
  assert.equal(catalogue[0].writer, 'sharg', 'the later import owns name and description');
  assert.equal(catalogue[0].sku, 'KOLBA-053-057ZB1', 'the SKU stays the creating supplier\'s (D1)');
});

test('two unrelated products with the same bare-number SKU stay two records (HA-2.28)', () => {
  const { runs, catalogue } = simulateImports(['sharg', 'spechurt'], {
    sharg: [prod('sharg', 's1', '1094', '5905247620859', 'Nóż Sharg')],
    spechurt: [prod('spechurt', '1094', '1094', '4046872186585', 'Kabura Spechurt')],
  });
  assert.equal(catalogue.length, 2, 'two BaseLinker products for two different goods');
  assert.equal(runs[1].mergedBySkuOnly, 0);
  assert.equal(runs[1].sharedByEan, 0);
  assert.deepEqual(catalogue.map((e) => [e.sku, e.ean]), [
    ['SHARG-1094', '5905247620859'],
    ['SPECHURT-1094', '4046872186585'],
  ], 'the first product keeps its EAN');
});

test('red proof: with different SKUs the same two products stay separate', () => {
  const { runs, catalogue } = simulateImports(['sharg', 'spechurt'], {
    sharg: [prod('sharg', 's1', '1094', '5905247620859', 'Nóż Sharg')],
    spechurt: [prod('spechurt', '2000', '2000', '4046872186585', 'Kabura Spechurt')],
  });
  assert.equal(catalogue.length, 2);
  assert.equal(runs[1].mergedBySkuOnly, 0);
});

test('the EAN is tried before the SKU', () => {
  const { runs, catalogue } = simulateImports(['kolba', 'sharg'], {
    kolba: [
      prod('kolba', 'k1', 'A-1', '1111111111116', 'Produkt z EAN'),
      prod('kolba', 'k2', '77', '', 'Produkt z samym SKU'),
    ],
    sharg: [prod('sharg', 's1', '77', '1111111111116', 'Ten sam EAN, cudzy SKU')],
  });
  assert.equal(runs[1].sharedByEan, 1);
  assert.equal(runs[1].mergedBySkuOnly, 0);
  assert.equal(catalogue[0].writer, 'sharg');
  assert.equal(catalogue[1].writer, 'kolba');
});

test('a repeat inside one feed updates the product it created and is not a cross-supplier match', () => {
  const { runs, catalogue } = simulateImports(['kolba'], {
    kolba: [
      prod('kolba', 'k1', 'A-1', '1111111111116', 'Pierwszy'),
      prod('kolba', 'k2', 'A-2', '1111111111116', 'Powtórka EAN'),
    ],
  });
  assert.equal(catalogue.length, 1);
  assert.deepEqual([runs[0].created, runs[0].updatedOwn, runs[0].sharedByEan, runs[0].mergedBySkuOnly], [1, 1, 0, 0]);
});

test('products that do not pass the assortment filter are not imported', () => {
  const { runs, catalogue } = simulateImports(['kolba'], {
    kolba: [prod('kolba', 'k1', 'A-1', '', 'Poza P1', { admitted: false }), prod('kolba', 'k2', 'A-2', '', 'W P1')],
  });
  assert.equal(catalogue.length, 1);
  assert.equal(runs[0].admitted, 1);
});

test('suppliers are imported in the given order', () => {
  const feeds = {
    kolba: [prod('kolba', 'k1', '5', '5900000000008', 'Kolba 5')],
    sharg: [prod('sharg', 's1', '5', '5900000000008', 'Sharg 5')],
  };
  const ks = simulateImports(['kolba', 'sharg'], feeds).catalogue;
  const sk = simulateImports(['sharg', 'kolba'], feeds).catalogue;
  assert.deepEqual([ks.length, ks[0].writer, ks[0].sku], [1, 'sharg', 'KOLBA-5']);
  assert.deepEqual([sk.length, sk[0].writer, sk[0].sku], [1, 'kolba', 'SHARG-5']);
});

test('a sync matches through the EAN or its own prefixed SKU only — a foreign record with the same bare SKU is not touched', () => {
  const feeds = {
    sharg: [prod('sharg', 's1', '1094', '5905247620859', 'Nóż Sharg')],
    spechurt: [
      prod('spechurt', '300', '300', '4046872186585', 'Własny produkt Spechurtu'),
      prod('spechurt', '1094', '1094', '', 'Niezaimportowany, ale w feedzie', { admitted: false }),
      prod('spechurt', '999', '999', '', 'Bez pary'),
    ],
  };
  const { catalogue } = simulateImports(['sharg', 'spechurt'], feeds);
  const sync = simulateSync('spechurt', feeds.spechurt, catalogue);
  assert.deepEqual(
    [sync.inFeed, sync.matchedOwn, sync.foreignBySkuOnly, sync.foreignByEan, sync.unmatched],
    [3, 2, 0, 0, 1],
  );
  assert.equal(sync.examples.length, 0);
});

test('the number of examples is capped, the counts are not', () => {
  // Shared records (same EAN) written last by Spechurt; Sharg's feed then loses the EANs, so its
  // sync finds its own records through SHARG-<n> alone while Spechurt is the last writer.
  // Valid EAN-13s (HA-2.38: a wrong check digit counts as no EAN)
  const withCheck = (d12: string) => d12 + (10 - ([...d12].reduce((sum, c, k) => sum + Number(c) * (k % 2 ? 3 : 1), 0) % 10)) % 10;
  const ean = (i: number) => withCheck(`5900000000${String(i).padStart(2, '0')}`);
  const sharg = Array.from({ length: 30 }, (_, i) => prod('sharg', `s${i}`, String(i + 1), ean(i), `Sharg ${i}`));
  const spechurt = Array.from({ length: 30 }, (_, i) => prod('spechurt', String(i + 1), String(i + 1), ean(i), `Spechurt ${i}`));
  const { runs, catalogue } = simulateImports(['sharg', 'spechurt'], { sharg, spechurt }, 5);
  assert.deepEqual([catalogue.length, runs[1].sharedByEan, runs[1].mergedBySkuOnly], [30, 30, 0]);
  const shargNoEan = sharg.map((p) => ({ ...p, ean: '' }));
  const sync = simulateSync('sharg', shargNoEan, catalogue, 5);
  assert.equal(sync.foreignBySkuOnly, 30);
  assert.equal(sync.examples.length, 5);
});

test('stock comparison between two feeds of one supplier', () => {
  const full = [{ id: 'a', stock: 3 }, { id: 'b', stock: 0 }, { id: 'c', stock: 2 }, { id: 'd', stock: 1 }];
  const light = [{ id: 'a', stock: 3 }, { id: 'b', stock: 7 }, { id: 'c', stock: 0 }];
  assert.deepEqual(compareStock(full, light), {
    inBoth: 3, equal: 1, different: 2, positiveOnlyInFirst: 1, positiveOnlyInSecond: 1, missingInSecond: 1,
  });
});

test('EAN shapes show lost leading zeros; numeric SKUs are counted', () => {
  const products = [
    prod('sharg', '1', '139', '5905247629906', 'a'),
    prod('sharg', '2', '140', '22886426026', 'b'),
    prod('sharg', '3', 'AB-1', '', 'c'),
    prod('sharg', '4', '7', '59052476X9906', 'd'),
  ];
  assert.deepEqual(eanShapes(products), {
    '13 digits': 1, '11 digits (not a GTIN length)': 1, empty: 1, 'not digits': 1,
  });
  assert.equal(numericSkuCount(products), 3);
});
