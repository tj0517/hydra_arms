import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function q(v: string | number | null | undefined): string {
  return `"${String(v ?? '').replace(/"/g, '""')}"`;
}

async function main() {
  const { data: cats } = await sb.from('shop_categories').select('id,name');
  const catMap = new Map((cats ?? []).map(c => [c.id as number, c.name as string]));

  const { data, error } = await sb
    .from('shop_products')
    .select('sku,ean,name,price,stock,tax_rate,weight,description,category_id,images')
    .eq('is_active', true);

  if (error) { console.error(error); process.exit(1); }

  const header = [
    'produkt_id','produkt_nazwa','ilosc','produkt_ean','produkt_sku',
    'kategoria_nazwa','cena','stawka_vat','waga','opis',
    'opis_dodatkowy_1','opis_dodatkowy_2','opis_dodatkowy_3','opis_dodatkowy_4',
    'zdjecie','zdjecie_dodatkowe_1','zdjecie_dodatkowe_2','zdjecie_dodatkowe_3',
    'producent_nazwa',
  ].map(q).join(';');

  const lines = [header];

  for (const p of data!) {
    const imgs = p.images as Record<string, string> | null ?? {};
    const imgKeys = Object.keys(imgs).sort((a, b) => Number(a) - Number(b));

    lines.push([
      q(''),                                          // produkt_id (empty = new)
      q(p.name),                                      // produkt_nazwa
      q(p.stock ?? 0),                                // ilosc
      q(p.ean ?? ''),                                 // produkt_ean
      q(p.sku ?? ''),                                 // produkt_sku
      q(p.category_id ? (catMap.get(p.category_id) ?? '') : ''), // kategoria_nazwa
      q(p.price ?? 0),                                // cena
      q(`${p.tax_rate ?? 23}%`),                      // stawka_vat
      q(p.weight ?? 0),                               // waga
      q(p.description ?? ''),                         // opis
      q(''), q(''), q(''),                            // opis_dodatkowy 1-4
      q(''),
      q(imgKeys[0] ? imgs[imgKeys[0]] : ''),          // zdjecie
      q(imgKeys[1] ? imgs[imgKeys[1]] : ''),          // zdjecie_dodatkowe_1
      q(imgKeys[2] ? imgs[imgKeys[2]] : ''),          // zdjecie_dodatkowe_2
      q(imgKeys[3] ? imgs[imgKeys[3]] : ''),          // zdjecie_dodatkowe_3
      q(''),                                          // producent_nazwa
    ].join(';'));
  }

  fs.writeFileSync('products.csv', lines.join('\n'), 'utf8');
  console.log(`Exported ${data!.length} products to products.csv`);
}

main().catch(e => { console.error(e); process.exit(1); });
