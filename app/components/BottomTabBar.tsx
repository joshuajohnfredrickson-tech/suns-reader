'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function BottomTabBar() {
  const pathname = usePathname();
  const isVideos = pathname?.startsWith('/app/videos');

  return (
    <nav className="shrink-0 flex border-t border-zinc-200/50 dark:border-zinc-800/50 bg-background pb-[env(safe-area-inset-bottom)]">
      <Link
        href="/app"
        className={`flex-1 flex items-center justify-center py-3 min-h-[48px] text-sm font-medium transition-colors no-underline ${
          !isVideos
            ? 'text-accent'
            : 'text-zinc-500 dark:text-zinc-400 active:text-foreground'
        }`}
        style={{ touchAction: 'manipulation' }}
      >
        Articles
      </Link>
      <Link
        href="/app/videos"
        className={`flex-1 flex items-center justify-center py-3 min-h-[48px] text-sm font-medium transition-colors no-underline ${
          isVideos
            ? 'text-accent'
            : 'text-zinc-500 dark:text-zinc-400 active:text-foreground'
        }`}
        style={{ touchAction: 'manipulation' }}
      >
        Videos
      </Link>
    </nav>
  );
}
