import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildSchema, printSchema } from 'graphql';

// Offline contract sync from the backend's published Shop SDL. A live export is still
// required before release; this never treats Admin API types as customer contracts.
const source = readFileSync(resolve(process.argv[2] ?? '../nelo-commerce/apps/commerce/src/plugins/atelier/api/atelier-shop.schema.ts'), 'utf8');
const blocks = Object.fromEntries([...source.matchAll(/export const (\w+) = (?:gql)?`([\s\S]*?)`;/g)].map((match) => [match[1], match[2]]));
const extension = blocks.atelierShopSchema?.replace(/\$\{(\w+)\}/g, (_, name) => {
  if (!blocks[name]) throw new Error(`Missing schema block: ${name}`);
  return blocks[name];
});
if (!extension) throw new Error('No published Atelier Shop schema found.');
const snapshot = readFileSync('schema/shop-api.graphql', 'utf8');
if (snapshot.includes('scalar DecimalMillimetres')) throw new Error('Atelier already present. Export the complete live Shop API to refresh it.');
writeFileSync('schema/shop-api.graphql', printSchema(buildSchema(`${snapshot}\n${extension}`)) + '\n');
console.log('Synced published Atelier Shop contract. Live schema verification remains required.');
