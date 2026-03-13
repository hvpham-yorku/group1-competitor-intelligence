import { ProtectPage } from "@/components/ProtectPage";
import { TrackingDetailClient } from "./tracking-detail-client";

export default async function TrackingDetailPage({
  params,
}: {
  params: Promise<{ sourceProductId: string }>;
}) {
  const { sourceProductId } = await params;

  return (
    <ProtectPage>
      <TrackingDetailClient sourceProductId={sourceProductId} />
    </ProtectPage>
  );
}
