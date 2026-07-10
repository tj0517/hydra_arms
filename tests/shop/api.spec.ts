/**
 * Shop API tests
 * Tests the /api/shop/products route directly — no browser needed.
 * Skips anything BL/P24 related (not yet wired).
 */
import { test, expect } from '@playwright/test';

test.describe('GET /api/shop/products', () => {
  test('returns 200 with expected shape', async ({ request }) => {
    const res = await request.get('/api/shop/products');
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty('products');
    expect(body).toHaveProperty('pagination');
    expect(Array.isArray(body.products)).toBe(true);
  });

  test('default page returns up to 24 products', async ({ request }) => {
    const res = await request.get('/api/shop/products');
    const { products, pagination } = await res.json();

    expect(products.length).toBeGreaterThan(0);
    expect(products.length).toBeLessThanOrEqual(24);
    expect(pagination.page).toBe(1);
    expect(pagination.page_size).toBe(24);
    expect(pagination.total).toBeGreaterThan(0);
    expect(pagination.total_pages).toBeGreaterThan(0);
  });

  test('each product has required fields', async ({ request }) => {
    const res = await request.get('/api/shop/products');
    const { products } = await res.json();

    for (const p of products) {
      expect(typeof p.id).toBe('number');
      expect(typeof p.name).toBe('string');
      expect(p.name.length).toBeGreaterThan(0);
      expect(typeof p.stock).toBe('number');
      expect(typeof p.is_active).toBe('boolean');
      expect(p.is_active).toBe(true); // only active products returned
      expect(['standard', 'age_restricted', 'pickup_only']).toContain(p.product_type);
    }
  });

  test('page 2 returns different products than page 1', async ({ request }) => {
    const [r1, r2] = await Promise.all([
      request.get('/api/shop/products?page=1'),
      request.get('/api/shop/products?page=2'),
    ]);
    const { products: p1, pagination: pg } = await r1.json();
    const { products: p2 } = await r2.json();

    if (pg.total_pages < 2) {
      test.skip();
      return;
    }

    const ids1 = new Set(p1.map((p: { id: number }) => p.id));
    const ids2 = p2.map((p: { id: number }) => p.id);
    expect(ids2.some((id: number) => !ids1.has(id))).toBe(true);
  });

  test('in_stock=true filter returns only products with stock > 0', async ({ request }) => {
    const res = await request.get('/api/shop/products?in_stock=true&page=1');
    expect(res.status()).toBe(200);

    const { products } = await res.json();
    for (const p of products) {
      expect(p.stock).toBeGreaterThan(0);
    }
  });

  test('category filter scopes results', async ({ request }) => {
    // First get all products to find a category_id that exists
    const allRes = await request.get('/api/shop/products');
    const { products: all } = await allRes.json();
    const withCat = all.find((p: { category_id: number | null }) => p.category_id !== null);

    if (!withCat) {
      test.skip();
      return;
    }

    const catRes = await request.get(`/api/shop/products?category=${withCat.category_id}`);
    expect(catRes.status()).toBe(200);
    const { products: filtered } = await catRes.json();

    for (const p of filtered) {
      expect(p.category_id).toBe(withCat.category_id);
    }
  });

  test('invalid page falls back to page 1 results', async ({ request }) => {
    const [r0, r1] = await Promise.all([
      request.get('/api/shop/products?page=0'),
      request.get('/api/shop/products?page=1'),
    ]);
    const { pagination: pg0 } = await r0.json();
    const { pagination: pg1 } = await r1.json();
    expect(pg0.page).toBe(pg1.page);
  });
});
