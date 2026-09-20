import { BagDrawerClient, type BagDrawerLine } from './BagDrawerClient';
import { assetPreview } from '@/lib/vendure/assets';
import { formatMoney, type Market } from '@/lib/vendure/channels';
import { ActiveOrderDocument } from '@/lib/vendure/generated/graphql';
import { vendureQuery } from '@/lib/vendure/transport';

export async function BagDrawer({ market }: { market: Market }) {
  const bag = await readBag(market);
  return <BagDrawerClient market={market} {...bag} />;
}

async function readBag(market: Market): Promise<{
  quantity?: number;
  subtotal?: string;
  lines?: BagDrawerLine[];
  unavailable?: boolean;
}> {
  try {
    const { data } = await vendureQuery(ActiveOrderDocument, {}, { market });
    const cart = data.activeOrder;
    if (!cart) return {};

    const lines: BagDrawerLine[] = cart.lines.map((line) => ({
      id: line.id,
      name: line.productVariant.name,
      slug: line.productVariant.product.slug,
      image: line.featuredAsset
        ? assetPreview(line.featuredAsset.preview, { width: 240, height: 320 })
        : null,
      options: line.productVariant.options.map((option) => option.name).join(' · '),
      quantity: line.quantity,
      price: formatMoney(line.linePriceWithTax, market),
    }));

    return {
      quantity: cart.totalQuantity,
      subtotal: formatMoney(cart.subTotalWithTax, market),
      lines,
    };
  } catch {
    return { unavailable: true };
  }
}
