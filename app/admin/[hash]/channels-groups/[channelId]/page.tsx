import ChannelDetail from '@/components/admin/ChannelDetail';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ hash: string; channelId: string }>;
}

export default async function ChannelDetailPage({ params }: Props) {
  const { hash, channelId } = await params;
  return (
    <div className="p-6">
      <ChannelDetail channelId={channelId} hash={hash} />
    </div>
  );
}
