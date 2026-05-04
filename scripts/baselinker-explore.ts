import * as fs from "fs";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const TOKEN = process.env.base;
const API_URL = "https://api.baselinker.com/connector.php";

async function call(method: string, parameters: Record<string, unknown> = {}) {
  const body = new URLSearchParams({
    token: TOKEN!,
    method,
    parameters: JSON.stringify(parameters),
  });
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  return res.json();
}

async function main() {
  const inventories = await call("getInventories");
  const invList = inventories.inventories as Array<{ inventory_id: number; name: string }>;

  for (const inv of invList) {
    console.log(`\n========== ${inv.name} (${inv.inventory_id}) ==========`);

    // Categories
    const cats = await call("getInventoryCategories", { inventory_id: inv.inventory_id });
    console.log(`Categories (${cats.categories?.length ?? 0}):`);
    for (const c of cats.categories ?? []) {
      console.log(`  [${c.category_id}] ${c.name} (parent: ${c.parent_id})`);
    }

    // Product list - page 1
    const list = await call("getInventoryProductsList", { inventory_id: inv.inventory_id });
    const products = list.products as Record<string, { name: string; sku: string; stock: Record<string, number>; prices: Record<string, number> }>;
    const ids = products ? Object.keys(products) : [];
    console.log(`\nProducts: ${ids.length}`);
    for (const [id, p] of Object.entries(products ?? {})) {
      const stock = Object.values(p.stock ?? {}).reduce((a, b) => a + b, 0);
      const price = Object.values(p.prices ?? {})[0] ?? "?";
      console.log(`  ${id} | SKU:${p.sku} | ${p.name.slice(0, 60)} | stock:${stock} | price:${price}`);
    }

    // Sample full data for 2 products with stock > 0 if any, else first 2
    const withStock = ids.filter(id => Object.values(products[id].stock ?? {}).reduce((a, b) => a + b, 0) > 0);
    const sample = (withStock.length > 0 ? withStock : ids).slice(0, 2);
    if (sample.length > 0) {
      const data = await call("getInventoryProductsData", { inventory_id: inv.inventory_id, products: sample });
      for (const [id, p] of Object.entries(data.products as Record<string, Record<string, unknown>>)) {
        const tf = p.text_fields as Record<string, unknown>;
        console.log(`\n  --- Sample product ${id} ---`);
        console.log(`  name: ${tf?.name}`);
        console.log(`  features: ${JSON.stringify(tf?.features)}`);
        console.log(`  images: ${JSON.stringify(p.images)}`);
        console.log(`  tags: ${JSON.stringify(p.tags)}`);
      }
    }
  }
}

main().catch(console.error);
