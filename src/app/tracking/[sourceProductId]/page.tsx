import { redirect } from "next/navigation";

export default async function TrackingDetailPage({
  params,
}: {
  params: Promise<{ sourceProductId: string }>;
}) {
  const { sourceProductId } = await params;
  redirect(`/products/${sourceProductId}`);
}
