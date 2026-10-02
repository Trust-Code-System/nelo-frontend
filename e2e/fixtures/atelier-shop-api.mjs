// Local UI contract test double. This is never imported by the storefront or deployed.
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { buildSchema, graphql } from 'graphql';

const schema = buildSchema(readFileSync('schema/shop-api.graphql', 'utf8'));
const stamp = '2026-10-02T09:00:00.000Z';
const asset = { id: 'asset', preview: 'http://localhost:4311/editorial/live/adele-02.webp' };
const customer = { id: 'ui-customer', firstName: 'UI', lastName: 'Test', emailAddress: 'ui@example.test', title: '', phoneNumber: '' };
const profile = { __typename: 'MeasurementProfile', id: 'p1', name: 'My fit', source: 'customer', isDefault: true, preferredDisplayUnit: 'inch', measuredAt: null, updatedAt: stamp, measurements: [{ code: 'bust', millimetres: '863.61' }] };
const appointment = { __typename: 'AtelierAppointment', id: 'a1', purpose: 'fitting', context: 'bridal', locationMode: 'inStore', status: 'confirmed', startsAt: '2026-11-05T13:30:00Z', endsAt: '2026-11-05T14:30:00Z', timezone: 'Africa/Lagos', locationDetails: null, notes: null, isCancellable: true, createdAt: stamp };
const project = { id: 'project', reference: 'UI-BRIDAL-001', context: 'bridal', stage: 'active', targetCompletionDate: '2026-12-12', createdAt: stamp, items: [{ id: 'g1', name: 'Ceremony gown', stage: 'fitting', targetCompletionDate: '2026-12-12' }, { id: 'g2', name: 'Reception dress', stage: 'awaitingMaterials', targetCompletionDate: null }], appointments: [appointment], relatedOrderCodes: ['UI-ORDER'], measurements: { confirmedAt: stamp, measurements: profile.measurements } };
const collections = [{ id: 'collection', name: 'Ready to Wear', slug: 'ready-to-wear', description: 'Pieces cut in Lagos.', parent: { id: 'root', slug: '__root_collection__' }, featuredAsset: asset }];
const product = { id: 'garment', name: 'UI Adele', slug: 'ui-adele', description: 'A Lagos cut.', featuredAsset: asset, assets: [asset], optionGroups: [], facetValues: [], variants: [{ id: 'variant', name: 'UI Adele', sku: 'UI-ADELE', priceWithTax: 25000000, currencyCode: 'NGN', stockLevel: 'IN_STOCK', options: [], assets: [asset] }] };
const commissionFacet = { id: 'commission', name: 'Commission', code: 'commission', facet: { id: 'mode', name: 'Purchase mode', code: 'purchase-mode' } };
const commissioned = { ...product, id: 'bridal', name: 'UI Ceremony', slug: 'ui-ceremony', facetValues: [commissionFacet, { id: 'category-bridal', name: 'Bridal', code: 'bridal', facet: { id: 'category', name: 'Category', code: 'category' } }] };
const order = { __typename: 'Order', id: 'order', code: 'UI-ORDER', state: 'Shipped', active: false, createdAt: stamp, orderPlacedAt: stamp, currencyCode: 'NGN', totalQuantity: 1, subTotalWithTax: 25000000, shippingWithTax: 0, totalWithTax: 25000000, couponCodes: [], discounts: [], shippingAddress: null, billingAddress: null, shippingLines: [], payments: [], customer, fulfillments: [{ id: 'shipment', state: 'Shipped', trackingCode: 'UI-COURIER-123', lines: [{ orderLineId: 'line', quantity: 1 }] }], lines: [{ id: 'line', quantity: 1, unitPriceWithTax: 25000000, linePriceWithTax: 25000000, discountedLinePriceWithTax: 25000000, featuredAsset: asset, productVariant: { ...product.variants[0], product } }] };
const states = new Map();
function stateFor(token) {
  if (!states.has(token)) states.set(token, { profiles: [structuredClone(profile)], appointments: [structuredClone(appointment)] });
  return states.get(token);
}

createServer(async (request, response) => {
  if (request.method === 'GET') { response.writeHead(200); response.end('Local UI test API'); return; }
  let body = '';
  for await (const chunk of request) body += chunk;
  const input = JSON.parse(body);
  const token = String(request.headers.authorization ?? 'guest');
  const signedIn = token !== 'guest';
  const state = stateFor(token);
  const rootValue = {
    activeCustomer: () => signedIn ? customer : null,
    activeOrder: () => null,
    activeMeasurementProfiles: () => state.profiles,
    atelierAppointments: () => ({ totalItems: state.appointments.length, items: state.appointments }),
    bespokeProjects: () => ({ totalItems: 1, items: [project] }),
    bespokeProject: ({ reference }) => reference === project.reference ? { ...project, appointments: state.appointments } : null,
    requestAppointment: ({ input: value }) => {
      const created = { ...appointment, id: `a${state.appointments.length + 1}`, ...value, startsAt: value.preferredAt, status: 'requested', endsAt: new Date(Date.parse(value.preferredAt) + 3600000).toISOString() };
      state.appointments.push(created); return created;
    },
    cancelAppointment: ({ id }) => { const item = state.appointments.find(a => a.id === id); item.status = 'cancelled'; item.isCancellable = false; return item; },
    upsertMeasurementProfile: ({ input: value }) => {
      const converted = value.values.map(m => ({ code: m.code, millimetres: (Number(m.value) * (value.preferredDisplayUnit === 'inch' ? 25.4 : 10)).toFixed(2) }));
      const saved = { ...profile, ...value, id: value.id || `p${state.profiles.length + 1}`, isDefault: Boolean(value.makeDefault), measurements: converted };
      state.profiles = [...state.profiles.filter(p => p.id !== saved.id), saved]; return saved;
    },
    deleteMeasurementProfile: ({ id }) => { state.profiles = state.profiles.filter(p => p.id !== id); return true; },
    collections: () => ({ totalItems: collections.length, items: collections }),
    collection: ({ slug }) => collections.find(c => c.slug === slug) ?? null,
    product: ({ slug }) => slug === product.slug ? product : slug === commissioned.slug ? commissioned : null,
    products: () => ({ totalItems: 0, items: [] }),
    search: ({ input: value }) => {
      const matches = [product, commissioned].filter(p => !value.term || p.name.toLowerCase().includes(value.term.toLowerCase()));
      return { totalItems: matches.length, items: value.take === 0 ? [] : matches.map(p => ({ productId: p.id, productName: p.name, slug: p.slug, description: p.description, productAsset: asset, currencyCode: 'NGN', inStock: true, facetValueIds: p.facetValues.map(f => f.id), priceWithTax: { __typename: 'SinglePrice', value: 25000000 } })), facetValues: [{ count: 1, facetValue: commissionFacet }] };
    },
    orderByCode: ({ code }) => code === order.code ? order : null,
  };
  const result = await graphql({ schema, source: input.query, variableValues: input.variables, operationName: input.operationName, rootValue });
  response.writeHead(200, { 'Content-Type': 'application/json' }); response.end(JSON.stringify(result));
}).listen(4321, '127.0.0.1', () => console.log('UI contract test double on 127.0.0.1:4321'));
