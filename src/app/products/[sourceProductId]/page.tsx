import { ProductDetailClient } from "./product-detail-client";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ sourceProductId: string }>;
}) {
  const { sourceProductId } = await params;

  return <ProductDetailClient sourceProductId={sourceProductId} />;
}
