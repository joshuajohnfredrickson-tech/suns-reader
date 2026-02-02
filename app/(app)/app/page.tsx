import { Suspense } from 'react';
import HomeClient from '../../components/HomeClient';
import { LoadingState } from '../../components/LoadingState';

export default function AppFeedPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <HomeClient />
    </Suspense>
  );
}
