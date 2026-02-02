import { MarketingContent } from '../../components/MarketingContent';
import { MarketingDebugClient } from '../../components/MarketingDebugClient';

// Build ID: prefer Vercel's commit SHA, fallback to timestamp
const BUILD_ID = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'debug-v3';

export const metadata = {
  title: 'Suns Reader - The easiest way to follow the Phoenix Suns',
  description: 'The latest Suns coverage in one feed. No searching, no ads — just open and start reading. Free to use.',
};

export default function MarketingPage() {
  return (
    <MarketingDebugClient buildId={BUILD_ID}>
      <MarketingContent appUrl="/app?tab=trusted" />
    </MarketingDebugClient>
  );
}
