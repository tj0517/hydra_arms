/**
 * Unit tests for xml-integration/connectors/sharg.ts on a small inline IOF 3.0 fragment
 * (structure as in the full feed, values made up).
 *
 * Runner: npx tsx --test xml-integration/__tests__/sharg-connector.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shargConnector } from '../connectors/sharg';
import { normalizeEan } from '../bl-match-key';

const xml = `<?xml version="1.0" encoding="utf-8"?>
<offer xmlns:iaiext="x" generated="2026-10-25 22:19:00" version="3.0"><products>
<product id="100554" code_on_card="A1" vat="23">
  <category id="5" name="Militaria/Noże"/>
  <description><name xml:lang="pol"><![CDATA[Nóż]]></name></description>
  <sizes>
    <size id="uniw" name="pozostałe" code="100554-uniw" weight="3" code_producer="012345678905" iaiext:code_external="000139">
      <price gross="328" net="266.67"/><stock id="1" quantity="4"/>
    </size>
  </sizes>
</product>
<product id="100556" code_on_card="A2" vat="23">
  <category id="5" name="Militaria/Odzież"/>
  <description><name xml:lang="pol"><![CDATA[Kurtka]]></name></description>
  <sizes>
    <size id="1" name="S" code="100556-1" weight="900" code_producer="0192687280759" iaiext:code_external="000140">
      <price gross="231.75" net="188.41"/><stock id="1" quantity="2"/>
    </size>
    <size id="2" name="M" code="100556-2" weight="950" code_producer="0192687280766" iaiext:code_external="000141">
      <price gross="240" net="195.12"/><stock id="1" quantity="1"/>
    </size>
  </sizes>
</product>
</products></offer>`;

const products = shargConnector.parse(xml);
const byId = (id: string) => products.find((p) => p.connector_product_id === id)!;

test('sharg: EAN (code_producer) is read as text — the leading zero survives (HA-2.38)', () => {
  assert.equal(byId('100554').ean, '012345678905', 'before HA-2.38 the parser gave the 11-digit 12345678905');
  assert.equal(typeof byId('100554').ean, 'string');
  assert.equal(byId('100556').ean, '0192687280759');
  assert.deepEqual(byId('100556').variants.map((v) => v.ean), ['0192687280759', '0192687280766']);
  assert.equal(normalizeEan(byId('100554').ean).kind, 'ok');
});

test('sharg: SKU format of HA-2.28 unchanged — code_external still read as a number (SHARG-139, not SHARG-000139)', () => {
  assert.equal(byId('100554').connector_sku, '139');
  assert.equal(byId('100556').connector_sku, '140');
});

test('sharg: other numeric attributes still parsed as numbers (prices, stock, weight)', () => {
  const p = byId('100554');
  assert.equal(p.price_purchase, 328);
  assert.equal(p.stock, 4);
  assert.equal(p.weight_g, 3);
  assert.equal(byId('100556').stock, 3);
});
