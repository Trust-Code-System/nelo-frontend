import catalogue from '@/data/nelo-catalogue.json';

export type NeloImage = {
  id: string;
  src: string;
  width: number;
  height: number;
  alt: string;
};

export type NeloOption = {
  name: string;
  position: number;
  values: string[];
};

export type NeloVariant = {
  id: string;
  title: string;
  option1: string;
  option2: string;
  option3: string;
  available: boolean;
  price: string;
  compareAtPrice: string | null;
  requiresShipping: boolean;
};

export type NeloProduct = {
  id: string;
  handle: string;
  title: string;
  description: string;
  productType: string;
  vendor: string;
  tags: string[];
  publishedAt: string;
  options: NeloOption[];
  variants: NeloVariant[];
  images: NeloImage[];
};

export const NELO_PRODUCTS = catalogue.products as NeloProduct[];

export function findNeloProduct(handle: string) {
  return NELO_PRODUCTS.find((product) => product.handle === handle) ?? null;
}

export function formatNaira(value: string | number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export function productPrice(product: NeloProduct) {
  const prices = product.variants
    .map((variant) => Number(variant.price))
    .filter((price) => Number.isFinite(price) && price > 0);
  if (prices.length === 0) return 'Price on request';
  const lowest = Math.min(...prices);
  const highest = Math.max(...prices);
  return lowest === highest ? formatNaira(lowest) : `${formatNaira(lowest)} to ${formatNaira(highest)}`;
}

export function searchNeloProducts(term: string) {
  const words = term.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  return NELO_PRODUCTS.filter((product) => {
    const haystack = [
      product.title,
      product.description,
      product.productType,
      ...product.tags,
      ...product.options.flatMap((option) => option.values),
    ]
      .join(' ')
      .toLocaleLowerCase();
    return words.every((word) => haystack.includes(word));
  });
}

export function relatedNeloProducts(product: NeloProduct, count = 4) {
  const peers = NELO_PRODUCTS.filter(
    (candidate) => candidate.handle !== product.handle && candidate.productType === product.productType,
  );
  const fallback = NELO_PRODUCTS.filter((candidate) => candidate.handle !== product.handle);
  return [...peers, ...fallback.filter((candidate) => !peers.includes(candidate))].slice(0, count);
}
