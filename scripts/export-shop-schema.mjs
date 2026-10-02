import nextEnv from '@next/env';
import { writeFileSync } from 'node:fs';
import { buildClientSchema, getIntrospectionQuery, printSchema } from 'graphql';

nextEnv.loadEnvConfig(process.cwd());
const endpoint = process.env.VENDURE_SHOP_API_URL;
if (!endpoint) throw new Error('Set VENDURE_SHOP_API_URL to the target nelo-commerce Shop API.');
const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'vendure-token': process.env.VENDURE_CHANNEL_TOKEN_NG ?? '' }, body: JSON.stringify({ query: getIntrospectionQuery() }), signal: AbortSignal.timeout(10000) });
if (!response.ok) throw new Error(`Shop schema export failed (HTTP ${response.status}).`);
const body = await response.json();
if (body.errors || !body.data) throw new Error('Shop API introspection unavailable. Ask the backend team for an exported Shop SDL.');
const schema = buildClientSchema(body.data);
if (!schema.getMutationType()?.getFields().requestAppointment || !schema.getQueryType()?.getFields().bespokeProject) throw new Error('Target does not publish the required Atelier Shop contract. Existing schema was preserved.');
writeFileSync('schema/shop-api.graphql', printSchema(schema) + '\n');
console.log('Exported the actual nelo-commerce Shop schema. Run npm run codegen and npm run verify.');
