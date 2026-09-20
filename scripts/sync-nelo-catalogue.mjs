import { mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'public', 'catalogue');
const DATA_FILE = path.join(ROOT, 'src', 'data', 'nelo-catalogue.json');
const SOURCE = 'https://www.nelowoman.com/products.json?limit=250';

const response = await fetch(SOURCE);
if (!response.ok) throw new Error(`Could not read NELO catalogue (${response.status})`);

const payload = await response.json();
const sourceProducts = payload.products.filter(
  (product) => product.images.length > 0 && !/custom payment/i.test(product.title),
);

await mkdir(OUT_DIR, { recursive: true });
await mkdir(path.dirname(DATA_FILE), { recursive: true });

function clean(value = '') {
  return String(value ?? '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[—–]/g, ',')
    .replace(/\s+/g, ' ')
    .trim();
}

function extensionFor(url) {
  const match = new URL(url).pathname.match(/\.(jpe?g|png|webp)$/i);
  return match?.[1]?.toLowerCase().replace('jpeg', 'jpg') ?? 'jpg';
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

/**
 * Upstream serves some garments as PNG, which is the wrong container for photography -
 * the ten we had averaged 1.4MB each and came down 21x as WebP at quality 82. So a PNG is
 * transcoded on arrival and only the WebP is kept. Everything else is stored as sent.
 *
 * `sharp` is not a declared dependency; it arrives with Next and this is a maintenance
 * script, so a missing copy falls back to storing the PNG rather than failing the sync.
 */
async function transcoder() {
  try {
    const { default: sharp } = await import('sharp');
    return (buffer) => sharp(buffer).webp({ quality: 82, effort: 6 }).toBuffer();
  } catch {
    console.warn('sharp unavailable - PNG sources will be stored unconverted.');
    return null;
  }
}

const toWebp = await transcoder();

/**
 * Downloads one image and returns the filename actually written, which is not always the
 * one derived from the upstream URL: a transcoded PNG lands as `.webp`. The caller records
 * what came back, so `nelo-catalogue.json` can never point at a file that is not there.
 */
async function download(image, directory, base, extension) {
  const target = toWebp && extension === 'png' ? 'webp' : extension;
  const filename = `${base}.${target}`;
  const file = path.join(directory, filename);
  if (await exists(file)) return filename;

  const url = new URL(image.src);
  url.searchParams.set('width', '1600');
  const result = await fetch(url);
  if (!result.ok) throw new Error(`Could not download ${url} (${result.status})`);

  const body = Buffer.from(await result.arrayBuffer());
  await writeFile(file, target === extension ? body : await toWebp(body));
  return filename;
}

const products = [];
for (const product of sourceProducts) {
  const directory = path.join(OUT_DIR, product.handle);
  await mkdir(directory, { recursive: true });

  const images = [];
  for (const [index, image] of product.images.entries()) {
    const extension = extensionFor(image.src);
    const base = String(index + 1).padStart(2, '0');
    const filename = await download(image, directory, base, extension);
    images.push({
      id: String(image.id),
      src: `/catalogue/${product.handle}/${filename}`,
      width: image.width,
      height: image.height,
      alt: clean(image.alt || `${product.title}, view ${index + 1}`),
    });
  }

  products.push({
    id: String(product.id),
    handle: product.handle,
    title: clean(product.title),
    description: clean(product.body_html),
    productType: clean(product.product_type || 'Ready to wear'),
    vendor: clean(product.vendor),
    tags: product.tags.map(clean),
    publishedAt: product.published_at,
    options: product.options.map((option) => ({
      name: clean(option.name),
      position: option.position,
      values: option.values.map(clean),
    })),
    variants: product.variants.map((variant) => ({
      id: String(variant.id),
      title: clean(variant.title),
      option1: clean(variant.option1 || ''),
      option2: clean(variant.option2 || ''),
      option3: clean(variant.option3 || ''),
      available: Boolean(variant.available),
      price: variant.price,
      compareAtPrice: variant.compare_at_price,
      requiresShipping: Boolean(variant.requires_shipping),
    })),
    images,
  });
  process.stdout.write(`Synced ${product.handle} (${images.length} images)\n`);
}

await writeFile(
  DATA_FILE,
  `${JSON.stringify({ source: 'nelowoman.com', syncedAt: new Date().toISOString(), products }, null, 2)}\n`,
);

process.stdout.write(`Wrote ${products.length} products and ${products.reduce((n, p) => n + p.images.length, 0)} images.\n`);
